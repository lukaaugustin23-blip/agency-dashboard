import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react'
import {
  INITIAL_LEADS,
  INITIAL_MEETINGS,
  INITIAL_CLIENT_DATA,
  CALLERS,
  ADMINS,
} from '../data/mockData'
import type { Lead, Meeting, ClientRecord, Stage } from '../data/mockData'
import { supabase } from '../lib/supabase'
import {
  mapLeadRow,
  mapMeetingRow,
  mapClientDataRow,
  leadToRow,
  meetingToRow,
  clientDataToRow,
  type LeadRow,
  type MeetingRow,
  type ClientDataRow,
} from '../lib/db'

type Dispatch<T> = React.Dispatch<React.SetStateAction<T>>

interface AppDataContextType {
  leads: Lead[]
  setLeads: Dispatch<Lead[]>
  meetings: Meeting[]
  setMeetings: Dispatch<Meeting[]>
  clientData: Record<string, ClientRecord>
  setClientData: Dispatch<Record<string, ClientRecord>>
  updateClientData: (id: string, patch: Partial<ClientRecord>) => void
  moveLeadStage: (id: string, stage: Stage, extra?: { lostReason?: string; lostDate?: string }) => void
  updateLead: (id: string, patch: Partial<Lead>) => void
  deleteLead: (id: string) => void
  callerFees: Record<string, number>
  setCallerFees: Dispatch<Record<string, number>>
  loading: boolean
}

const AppDataContext = createContext<AppDataContextType | null>(null)

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [_leads, _setLeads] = useState<Lead[]>(INITIAL_LEADS)
  const [_meetings, _setMeetings] = useState<Meeting[]>(INITIAL_MEETINGS)
  const [_clientData, _setClientData] = useState<Record<string, ClientRecord>>(INITIAL_CLIENT_DATA)
  const [loading, setLoading] = useState(true)
  const [callerFees, setCallerFees] = useState<Record<string, number>>(
    Object.fromEntries([...CALLERS, ...ADMINS].map(c => [c.id, c.feePercent]))
  )

  // ── Initial data fetch ───────────────────────────────────────────────

  useEffect(() => {
    async function fetchAll() {
      const [leadsRes, meetingsRes, clientDataRes] = await Promise.all([
        supabase.from('leads').select('*'),
        supabase.from('meetings').select('*'),
        supabase.from('client_data').select('*'),
      ])

      if (leadsRes.data) {
        _setLeads((leadsRes.data as LeadRow[]).map(mapLeadRow))
      }
      if (meetingsRes.data) {
        _setMeetings((meetingsRes.data as MeetingRow[]).map(mapMeetingRow))
      }
      if (clientDataRes.data) {
        const map: Record<string, ClientRecord> = {}
        for (const row of clientDataRes.data as ClientDataRow[]) {
          map[row.lead_id] = mapClientDataRow(row)
        }
        _setClientData(map)
      }
      setLoading(false)
    }

    void fetchAll()
  }, [])

  // ── Realtime subscriptions ───────────────────────────────────────────

  useEffect(() => {
    const channel = supabase
      .channel('crm-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        payload => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const incoming = mapLeadRow(payload.new as LeadRow)
            _setLeads(prev => {
              const exists = prev.some(l => l.id === incoming.id)
              if (exists) {
                return prev.map(l => l.id === incoming.id ? incoming : l)
              }
              return [...prev, incoming]
            })
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id: string }).id
            _setLeads(prev => prev.filter(l => l.id !== deletedId))
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meetings' },
        payload => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const incoming = mapMeetingRow(payload.new as MeetingRow)
            _setMeetings(prev => {
              const exists = prev.some(m => m.id === incoming.id)
              if (exists) {
                return prev.map(m => m.id === incoming.id ? incoming : m)
              }
              return [...prev, incoming]
            })
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id: string }).id
            _setMeetings(prev => prev.filter(m => m.id !== deletedId))
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'client_data' },
        payload => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new as ClientDataRow
            _setClientData(prev => ({
              ...prev,
              [row.lead_id]: mapClientDataRow(row),
            }))
          } else if (payload.eventType === 'DELETE') {
            const deletedLeadId = (payload.old as { lead_id: string }).lead_id
            _setClientData(prev => {
              const next = { ...prev }
              delete next[deletedLeadId]
              return next
            })
          }
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [])

  // ── Exposed setLeads (wraps _setLeads, diffs + writes to Supabase) ───

  const setLeads: Dispatch<Lead[]> = useCallback((action) => {
    _setLeads(prev => {
      const next = typeof action === 'function' ? action(prev) : action

      // Diff prev vs next
      const prevMap = new Map(prev.map(l => [l.id, l]))
      const nextMap = new Map(next.map(l => [l.id, l]))

      // Deleted
      for (const [id] of prevMap) {
        if (!nextMap.has(id)) {
          void supabase.from('leads').delete().eq('id', id).then(({ error }) => {
            if (error) console.error('setLeads delete error:', error)
          })
        }
      }

      // Inserted or updated
      for (const [id, lead] of nextMap) {
        if (!prevMap.has(id)) {
          void supabase.from('leads').insert(leadToRow(lead)).then(({ error }) => {
            if (error) console.error('setLeads insert error:', error)
          })
        } else {
          const prevLead = prevMap.get(id)!
          if (JSON.stringify(prevLead) !== JSON.stringify(lead)) {
            void supabase.from('leads').update(leadToRow(lead)).eq('id', id).then(({ error }) => {
              if (error) console.error('setLeads update error:', error)
            })
          }
        }
      }

      return next
    })
  }, [])

  // ── Exposed setMeetings (same pattern) ───────────────────────────────

  const setMeetings: Dispatch<Meeting[]> = useCallback((action) => {
    _setMeetings(prev => {
      const next = typeof action === 'function' ? action(prev) : action

      const prevMap = new Map(prev.map(m => [m.id, m]))
      const nextMap = new Map(next.map(m => [m.id, m]))

      for (const [id] of prevMap) {
        if (!nextMap.has(id)) {
          void supabase.from('meetings').delete().eq('id', id).then(({ error }) => {
            if (error) console.error('setMeetings delete error:', error)
          })
        }
      }

      for (const [id, meeting] of nextMap) {
        if (!prevMap.has(id)) {
          void supabase.from('meetings').insert(meetingToRow(meeting)).then(({ error }) => {
            if (error) console.error('setMeetings insert error:', error)
          })
        } else {
          const prevMeeting = prevMap.get(id)!
          if (JSON.stringify(prevMeeting) !== JSON.stringify(meeting)) {
            void supabase.from('meetings').update(meetingToRow(meeting)).eq('id', id).then(({ error }) => {
              if (error) console.error('setMeetings update error:', error)
            })
          }
        }
      }

      return next
    })
  }, [])

  // ── Exposed setClientData (diffs keys, upserts/deletes) ──────────────

  const setClientData: Dispatch<Record<string, ClientRecord>> = useCallback((action) => {
    _setClientData(prev => {
      const next = typeof action === 'function' ? action(prev) : action

      const prevKeys = new Set(Object.keys(prev))
      const nextKeys = new Set(Object.keys(next))

      // Deleted
      for (const leadId of prevKeys) {
        if (!nextKeys.has(leadId)) {
          void supabase.from('client_data').delete().eq('lead_id', leadId).then(({ error }) => {
            if (error) console.error('setClientData delete error:', error)
          })
        }
      }

      // Added or updated
      for (const leadId of nextKeys) {
        if (!prevKeys.has(leadId) || JSON.stringify(prev[leadId]) !== JSON.stringify(next[leadId])) {
          void supabase
            .from('client_data')
            .upsert({ ...clientDataToRow(leadId, next[leadId]), lead_id: leadId }, { onConflict: 'lead_id' })
            .then(({ error }) => {
              if (error) console.error('setClientData upsert error:', error)
            })
        }
      }

      return next
    })
  }, [])

  // ── moveLeadStage ─────────────────────────────────────────────────────

  const moveLeadStage = useCallback((
    id: string,
    stage: Stage,
    extra?: { lostReason?: string; lostDate?: string }
  ) => {
    _setLeads(prev => prev.map(l => {
      if (l.id !== id) return l
      const patch: Partial<Lead> = { stage }
      if (stage === 'lost') {
        if (extra?.lostReason) patch.lostReason = extra.lostReason
        patch.lostDate = extra?.lostDate ?? new Date().toISOString().split('T')[0]
      }
      if (stage === 'won' && !l.closedDate) {
        patch.closedDate = new Date().toISOString().split('T')[0]
      }
      return { ...l, ...patch }
    }))

    // Build the DB update patch
    const dbPatch: Record<string, unknown> = { stage }
    if (stage === 'lost') {
      if (extra?.lostReason) dbPatch.lost_reason = extra.lostReason
      dbPatch.lost_date = extra?.lostDate ?? new Date().toISOString().split('T')[0]
    }
    if (stage === 'won') {
      dbPatch.closed_date = new Date().toISOString().split('T')[0]
    }
    void supabase.from('leads').update(dbPatch).eq('id', id).then(({ error }) => {
      if (error) console.error('moveLeadStage error:', error)
    })

    if (stage === 'won') {
      _setClientData(prev => {
        if (prev[id]) return prev
        const newRecord: ClientRecord = {
          services: { website: true, seo: false, mcp: false, socialMedia: false, branding: false },
          notes: '',
          status: 'active',
          lastContact: new Date().toISOString().split('T')[0],
        }
        void supabase
          .from('client_data')
          .upsert({ ...clientDataToRow(id, newRecord), lead_id: id }, { onConflict: 'lead_id' })
          .then(({ error }) => {
            if (error) console.error('moveLeadStage client_data upsert error:', error)
          })
        return { ...prev, [id]: newRecord }
      })
    }
  }, [])

  // ── updateLead ────────────────────────────────────────────────────────

  const updateLead = useCallback((id: string, patch: Partial<Lead>) => {
    _setLeads(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l))

    // Convert camelCase patch to snake_case for DB
    const dbPatch: Record<string, unknown> = {}
    if (patch.business !== undefined) dbPatch.business = patch.business
    if (patch.type !== undefined) dbPatch.type = patch.type
    if (patch.contact !== undefined) dbPatch.contact = patch.contact
    if (patch.phone !== undefined) dbPatch.phone = patch.phone ?? null
    if (patch.notes !== undefined) dbPatch.notes = patch.notes ?? null
    if (patch.callerId !== undefined) dbPatch.caller_id = patch.callerId
    if (patch.addedDate !== undefined) dbPatch.added_date = patch.addedDate
    if (patch.stage !== undefined) dbPatch.stage = patch.stage
    if (patch.dealValue !== undefined) dbPatch.deal_value = patch.dealValue ?? null
    if (patch.closedDate !== undefined) dbPatch.closed_date = patch.closedDate ?? null
    if (patch.lostDate !== undefined) dbPatch.lost_date = patch.lostDate ?? null
    if (patch.lostReason !== undefined) dbPatch.lost_reason = patch.lostReason ?? null

    if (Object.keys(dbPatch).length > 0) {
      void supabase.from('leads').update(dbPatch).eq('id', id).then(({ error }) => {
        if (error) console.error('updateLead error:', error)
      })
    }
  }, [])

  // ── deleteLead ────────────────────────────────────────────────────────

  const deleteLead = useCallback((id: string) => {
    _setLeads(prev => prev.filter(l => l.id !== id))
    void supabase.from('leads').delete().eq('id', id).then(({ error }) => {
      if (error) console.error('deleteLead error:', error)
    })
  }, [])

  // ── updateClientData ──────────────────────────────────────────────────

  const updateClientData = useCallback((id: string, patch: Partial<ClientRecord>) => {
    _setClientData(prev => {
      const existing: ClientRecord = prev[id] ?? {
        services: { website: false, seo: false, mcp: false, socialMedia: false, branding: false },
        notes: '',
        status: 'active',
        lastContact: '',
      }
      const updated = { ...existing, ...patch }
      void supabase
        .from('client_data')
        .upsert({ ...clientDataToRow(id, updated), lead_id: id }, { onConflict: 'lead_id' })
        .then(({ error }) => {
          if (error) console.error('updateClientData error:', error)
        })
      return { ...prev, [id]: updated }
    })
  }, [])

  return (
    <AppDataContext.Provider value={{
      leads: _leads,
      setLeads,
      meetings: _meetings,
      setMeetings,
      clientData: _clientData,
      setClientData,
      updateClientData,
      moveLeadStage,
      updateLead,
      deleteLead,
      callerFees,
      setCallerFees,
      loading,
    }}>
      {children}
    </AppDataContext.Provider>
  )
}

export function useAppData() {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData must be inside AppDataProvider')
  return ctx
}
