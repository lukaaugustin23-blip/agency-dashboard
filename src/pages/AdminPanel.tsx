import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { signOut } from '../lib/auth'
import type { User } from '@supabase/supabase-js'
import {
  CALLERS, ADMINS, CALLERS_LIST, ADMIN_IDS,
  CALLER_COLOR_BY_ID,
} from '../data/mockData'
import type { Lead, Meeting, MeetingType, Stage, RejectionReason } from '../data/mockData'
import { useAppData } from '../contexts/AppDataContext'


// suppress unused import warning — CALLERS_LIST and ADMIN_IDS are used for filters
void CALLERS_LIST
void ADMIN_IDS

type Theme = 'light' | 'dark'

const THEMES = {
  light: {
    bg: '#ffffff', bg2: '#f8fafc', bg3: '#f1f5f9', border: '#e2e8f0',
    text: '#0f172a', textSecond: '#475569', muted: '#94a3b8',
    accent: '#0ea5e9', accent2: '#6366f1',
    success: '#10b981', warning: '#f59e0b', danger: '#ef4444',
  },
  dark: {
    bg: '#0d0d0f', bg2: '#111114', bg3: '#16161a', border: '#1e1e26',
    text: '#f0f4ff', textSecond: '#8892a4', muted: '#454d5e',
    accent: '#3b82f6', accent2: '#06b6d4',
    success: '#10b981', warning: '#f59e0b', danger: '#ef4444',
  },
}

type C = typeof THEMES.light

const STAGES: Stage[] = ['new', 'contacted', 'maybe', 'meeting', 'proposal', 'won', 'lost']
const STAGE_LABELS: Record<Stage, string> = {
  new: 'New', contacted: 'Contacted', maybe: 'Maybe / Call Back',
  meeting: 'Meeting', proposal: 'Proposal', won: 'Won', lost: 'Lost',
}
const MEETING_TYPES: MeetingType[] = ['Discovery Call', 'Demo/Presentation', 'Follow-up', 'Closing']
const REJECTION_REASONS: RejectionReason[] = ['No Budget', 'Not Interested', 'Went with Competitor', 'Bad Timing', 'Other']

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getCallerName(id: string) {
  if (id === 'admin') return 'Luka & Samvit'
  return CALLERS.find(c => c.id === id)?.name ?? ADMINS.find(a => a.id === id)?.name ?? id
}

function getCallerColor(id: string) {
  return CALLER_COLOR_BY_ID[id] ?? '#94a3b8'
}

function formatDate(s: string) {
  if (!s) return '—'
  const d = new Date(s + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Icons ─────────────────────────────────────────────────────────────

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  )
}

// ── Input style helper ─────────────────────────────────────────────────

function inputStyle(c: C, extra?: React.CSSProperties): React.CSSProperties {
  return {
    height: 44, fontSize: 14, borderRadius: 10,
    background: c.bg3, border: `1px solid ${c.border}`,
    padding: '0 14px', fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif',
    color: c.text, outline: 'none', width: '100%', boxSizing: 'border-box',
    ...extra,
  }
}

function selectStyle(c: C, extra?: React.CSSProperties): React.CSSProperties {
  return {
    height: 44, fontSize: 14, borderRadius: 10,
    background: c.bg3, border: `1px solid ${c.border}`,
    padding: '0 14px', fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif',
    color: c.text, outline: 'none', width: '100%', cursor: 'pointer',
    ...extra,
  }
}

function cardStyle(c: C, extra?: React.CSSProperties): React.CSSProperties {
  return {
    background: c.bg, border: `1px solid ${c.border}`,
    borderRadius: 16, padding: 24,
    transition: 'background 0.3s ease, border-color 0.3s ease',
    ...extra,
  }
}

// ── Section 1: Log a Sale ─────────────────────────────────────────────

interface SaleForm {
  business: string
  type: string
  contact: string
  phone: string
  dealValue: string
  callerId: string
  closeDate: string
  notes: string
}

function LogSaleSection({ c, defaultDealValue }: { c: C; defaultDealValue: string }) {
  const { leads, setLeads, setClientData, updateLead, deleteLead } = useAppData()
  const today = todayStr()
  const [form, setForm] = useState<SaleForm>({
    business: '', type: '', contact: '', phone: '',
    dealValue: defaultDealValue, callerId: 'alex',
    closeDate: today, notes: '',
  })
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editCallerId, setEditCallerId] = useState('')

  useEffect(() => {
    if (defaultDealValue && !form.dealValue) {
      setForm(f => ({ ...f, dealValue: defaultDealValue }))
    }
  }, [defaultDealValue]) // eslint-disable-line react-hooks/exhaustive-deps

  function set(k: keyof SaleForm, v: string) {
    setForm(f => ({ ...f, [k]: v }))
    if (error) setError('')
  }

  function handleSubmit() {
    if (!form.business.trim()) { setError('Business name is required.'); return }
    const val = Number(form.dealValue)
    if (!val || val <= 0) { setError('Deal value must be greater than 0.'); return }
    const id = `deal-${Date.now()}`
    const newLead: Lead = {
      id, business: form.business.trim(), type: form.type, contact: form.contact,
      phone: form.phone || undefined, notes: form.notes || undefined,
      callerId: form.callerId, addedDate: today, stage: 'won',
      dealValue: val, closedDate: form.closeDate,
    }
    setLeads(prev => [...prev, newLead])
    setClientData(prev => ({
      ...prev,
      [id]: {
        services: { website: true, seo: false, mcp: false, socialMedia: false, branding: false },
        notes: form.notes || '',
        status: 'active' as const,
        lastContact: form.closeDate,
      },
    }))
    setForm({ business: '', type: '', contact: '', phone: '', dealValue: '', callerId: 'alex', closeDate: today, notes: '' })
    setError('')
  }

  const recentSales = useMemo(() =>
    leads.filter(l => l.stage === 'won').slice(-5).reverse(),
    [leads]
  )

  function startEdit(lead: Lead) {
    setEditingId(lead.id)
    setEditValue(String(lead.dealValue ?? ''))
    setEditCallerId(lead.callerId)
  }

  function saveEdit(id: string) {
    updateLead(id, { dealValue: Number(editValue), callerId: editCallerId })
    setEditingId(null)
  }

  function handleDelete(id: string) {
    if (!window.confirm('Delete this sale? All stats will update.')) return
    deleteLead(id)
    setClientData(prev => { const n = { ...prev }; delete n[id]; return n })
  }

  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 6, display: 'block' }

  return (
    <div style={{ ...cardStyle(c), borderLeft: `3px solid ${c.accent}` }}>
      <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 700, color: c.accent, textTransform: 'uppercase', letterSpacing: '0.1em' }}>NEW SALE</p>
      <h2 style={{ margin: '0 0 24px', fontSize: 24, fontWeight: 800, color: c.text, letterSpacing: '-0.02em' }}>Log a Deal</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Row 1 */}
        <div>
          <label style={labelStyle}>Business Name</label>
          <input value={form.business} onChange={e => set('business', e.target.value)}
            placeholder="e.g. TechFlow Inc" style={inputStyle(c)} />
        </div>
        <div>
          <label style={labelStyle}>Business Type</label>
          <input value={form.type} onChange={e => set('type', e.target.value)}
            placeholder="e.g. SaaS, E-commerce" style={inputStyle(c)} />
        </div>

        {/* Row 2 */}
        <div>
          <label style={labelStyle}>Contact Name</label>
          <input value={form.contact} onChange={e => set('contact', e.target.value)}
            placeholder="e.g. John Smith" style={inputStyle(c)} />
        </div>
        <div>
          <label style={labelStyle}>Phone Number</label>
          <input value={form.phone} onChange={e => set('phone', e.target.value)}
            placeholder="e.g. (555) 123-4567" style={inputStyle(c)} />
        </div>

        {/* Row 3 */}
        <div>
          <label style={labelStyle}>Deal Value ($)</label>
          <input
            type="number"
            value={form.dealValue}
            onChange={e => set('dealValue', e.target.value)}
            placeholder="0"
            style={inputStyle(c, {
              color: Number(form.dealValue) > 0 ? c.accent : c.text,
              fontWeight: Number(form.dealValue) > 0 ? 700 : 400,
            })}
          />
        </div>
        <div>
          <label style={labelStyle}>Found By</label>
          <select value={form.callerId} onChange={e => set('callerId', e.target.value)} style={selectStyle(c)}>
            <optgroup label="— TEAM —">
              {CALLERS.map(caller => (
                <option key={caller.id} value={caller.id}>{caller.name} — Caller</option>
              ))}
            </optgroup>
            <optgroup label="— ADMIN —">
              <option value="admin">Luka &amp; Samvit — Admin</option>
            </optgroup>
          </select>
        </div>

        {/* Row 4 */}
        <div>
          <label style={labelStyle}>Close Date</label>
          <input
            type="date"
            value={form.closeDate}
            onChange={e => set('closeDate', e.target.value)}
            style={inputStyle(c)}
          />
        </div>
        <div />

        {/* Row 5 - Notes */}
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Notes</label>
          <textarea
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="Additional notes..."
            rows={2}
            style={{
              ...inputStyle(c, { height: 'auto', padding: '10px 14px', resize: 'none' }),
            }}
          />
        </div>
      </div>

      {error && (
        <p style={{ margin: '10px 0 0', fontSize: 13, color: c.danger, fontWeight: 500 }}>{error}</p>
      )}

      <button
        onClick={handleSubmit}
        style={{
          marginTop: 16, width: '100%', height: 52,
          background: c.accent, color: '#fff',
          fontSize: 15, fontWeight: 700, borderRadius: 12,
          border: 'none', cursor: 'pointer',
          fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif',
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.9' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
      >
        Log Sale
      </button>

      {/* Recent Sales */}
      <div style={{ borderTop: `1px solid ${c.border}`, marginTop: 20, paddingTop: 16 }}>
        <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: c.text }}>Recent Sales</p>
        {recentSales.length === 0 ? (
          <p style={{ fontSize: 13, color: c.muted, fontStyle: 'italic' }}>No sales logged yet</p>
        ) : (
          recentSales.map(lead => (
            <div key={lead.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 0', borderBottom: `1px solid ${c.border}`,
            }}>
              {editingId === lead.id ? (
                <>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: c.text }}>{lead.business}</span>
                  <input
                    type="number"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    style={{ width: 100, height: 32, fontSize: 13, borderRadius: 8, background: c.bg3, border: `1px solid ${c.accent}`, padding: '0 8px', color: c.accent, fontWeight: 700, outline: 'none', fontFamily: '"Plus Jakarta Sans", sans-serif' }}
                  />
                  <select
                    value={editCallerId}
                    onChange={e => setEditCallerId(e.target.value)}
                    style={{ height: 32, fontSize: 12, borderRadius: 8, background: c.bg3, border: `1px solid ${c.border}`, padding: '0 8px', color: c.text, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}
                  >
                    {[...CALLERS, ...ADMINS].map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                  <button onClick={() => saveEdit(lead.id)} style={{ fontSize: 11, fontWeight: 700, background: c.accent, color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Save</button>
                  <button onClick={() => setEditingId(null)} style={{ fontSize: 11, fontWeight: 600, background: c.bg3, color: c.muted, border: `1px solid ${c.border}`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Cancel</button>
                </>
              ) : (
                <>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: c.text }}>{lead.business}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: c.accent }}>${(lead.dealValue ?? 0).toLocaleString()}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: c.textSecond }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: getCallerColor(lead.callerId), display: 'inline-block', flexShrink: 0 }} />
                    {getCallerName(lead.callerId)}
                  </span>
                  <span style={{ fontSize: 11, color: c.muted }}>{formatDate(lead.closedDate ?? '')}</span>
                  <button onClick={() => startEdit(lead)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 7, background: 'transparent', border: `1px solid ${c.border}`, color: c.textSecond, cursor: 'pointer' }}><PencilIcon /></button>
                  <button onClick={() => handleDelete(lead.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 7, background: 'transparent', border: `1px solid ${c.border}40`, color: c.danger, cursor: 'pointer' }}><TrashIcon /></button>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ── Section 2: Team Management ─────────────────────────────────────────

interface ExtraMember {
  id: string
  name: string
  email: string
  role: 'Caller' | 'Admin'
  fee: number
}

function TeamSection({ c }: { c: C }) {
  const { callerFees, setCallerFees } = useAppData()
  const [showAddModal, setShowAddModal] = useState(false)
  const [extraMembers, setExtraMembers] = useState<ExtraMember[]>([])
  const [addForm, setAddForm] = useState({ name: '', email: '', role: 'Caller' as 'Caller' | 'Admin', fee: 20 })

  const allMembers = useMemo(() => [
    ...CALLERS.map(c => ({ id: c.id, name: c.name, email: c.email, role: 'Caller' as const, defaultFee: c.feePercent, color: c.color })),
    ...ADMINS.map(a => ({ id: a.id, name: a.name, email: a.email, role: 'Admin' as const, defaultFee: a.feePercent, color: a.color })),
    ...extraMembers.map(e => ({ id: e.id, name: e.name, email: e.email, role: e.role as 'Caller' | 'Admin', defaultFee: e.fee, color: '#94a3b8' })),
  ], [extraMembers])

  const thStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: c.muted, textTransform: 'uppercase',
    letterSpacing: '0.08em', padding: '0 12px 10px', textAlign: 'left',
    borderBottom: `1px solid ${c.border}`,
  }

  function handleAdd() {
    if (!addForm.name.trim()) return
    setExtraMembers(prev => [...prev, { id: `extra-${Date.now()}`, name: addForm.name, email: addForm.email, role: addForm.role, fee: addForm.fee }])
    setAddForm({ name: '', email: '', role: 'Caller', fee: 20 })
    setShowAddModal(false)
  }

  return (
    <div style={cardStyle(c, { background: c.bg2 })}>
      <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 700, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>TEAM</p>
      <h2 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 800, color: c.text, letterSpacing: '-0.02em' }}>Manage Team Members</h2>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Email</th>
            <th style={thStyle}>Role</th>
            <th style={{ ...thStyle, textAlign: 'center' }}>Fee %</th>
            <th style={{ ...thStyle, textAlign: 'center' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {allMembers.map((member, i) => {
            const currentFee = callerFees[member.id] ?? member.defaultFee
            const changed = currentFee !== member.defaultFee
            return (
              <tr key={member.id} style={{ background: i % 2 === 1 ? `${c.bg3}18` : 'transparent' }}>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: member.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{member.name[0]}</div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: c.text }}>{member.name}</span>
                  </div>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ fontSize: 12, color: c.muted }}>{member.email}</span>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, borderRadius: 20, padding: '2px 8px',
                    background: member.role === 'Admin' ? '#6366f118' : `${c.accent}18`,
                    color: member.role === 'Admin' ? '#6366f1' : c.accent,
                  }}>
                    {member.role}
                  </span>
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <input
                      type="number"
                      value={currentFee}
                      onChange={e => setCallerFees(prev => ({ ...prev, [member.id]: Number(e.target.value) }))}
                      style={{
                        width: 60, height: 32, fontSize: 13, fontWeight: 700, textAlign: 'center',
                        background: c.bg3, border: `1px solid ${c.border}`, borderRadius: 8,
                        color: changed ? c.success : c.text, outline: 'none',
                        fontFamily: '"Plus Jakarta Sans", sans-serif',
                      }}
                    />
                    {changed && (
                      <span style={{ fontSize: 11, color: c.success }}>
                        {currentFee > member.defaultFee ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                  <button
                    onClick={() => setCallerFees(prev => ({ ...prev, [member.id]: member.defaultFee }))}
                    style={{
                      fontSize: 10, fontWeight: 600, color: c.muted, border: `1px solid ${c.border}`,
                      background: 'transparent', borderRadius: 6, padding: '4px 8px', cursor: 'pointer',
                      fontFamily: '"Plus Jakarta Sans", sans-serif',
                      opacity: changed ? 1 : 0.4,
                    }}
                  >
                    Reset
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <button
        onClick={() => setShowAddModal(true)}
        style={{
          marginTop: 14, height: 36, padding: '0 16px', fontSize: 13, fontWeight: 600,
          color: c.textSecond, background: c.bg3, border: `1px solid ${c.border}`,
          borderRadius: 8, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif',
          transition: 'border-color 0.15s, color 0.15s',
        }}
        onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = c.accent; b.style.color = c.accent }}
        onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = c.border; b.style.color = c.textSecond }}
      >
        +  Add Team Member
      </button>

      {/* Add Member Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setShowAddModal(false)}>
          <div style={{
            background: c.bg, border: `1px solid ${c.border}`,
            borderRadius: 12, padding: 24, width: 360,
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: c.text }}>Add Team Member</h3>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: c.muted, fontStyle: 'italic' }}>
              Coming soon: real team member creation requires Supabase auth setup
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} placeholder="Name" style={inputStyle(c)} />
              <input value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} placeholder="Email" style={inputStyle(c)} />
              <select value={addForm.role} onChange={e => setAddForm(f => ({ ...f, role: e.target.value as 'Caller' | 'Admin' }))} style={selectStyle(c)}>
                <option value="Caller">Caller</option>
                <option value="Admin">Admin</option>
              </select>
              <input type="number" value={addForm.fee} onChange={e => setAddForm(f => ({ ...f, fee: Number(e.target.value) }))} placeholder="Fee %" style={inputStyle(c)} />
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button onClick={handleAdd} style={{ flex: 1, height: 40, background: c.accent, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Add</button>
                <button onClick={() => setShowAddModal(false)} style={{ flex: 1, height: 40, background: c.bg3, color: c.textSecond, border: `1px solid ${c.border}`, borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Section 3: Edit Existing Deals ─────────────────────────────────────

function DealsSection({ c }: { c: C }) {
  const { leads, updateLead, deleteLead, callerFees, setClientData } = useAppData()
  const [search, setSearch] = useState('')
  const [editModal, setEditModal] = useState<Lead | null>(null)
  const [editForm, setEditForm] = useState<Partial<Lead>>({})

  const wonLeads = useMemo(() =>
    leads.filter(l => l.stage === 'won')
      .filter(l => !search || l.business.toLowerCase().includes(search.toLowerCase())),
    [leads, search]
  )

  function openEditModal(lead: Lead) {
    setEditModal(lead)
    setEditForm({ ...lead })
  }

  function saveEditModal() {
    if (!editModal) return
    updateLead(editModal.id, editForm)
    setEditModal(null)
  }

  function handleDelete(id: string) {
    if (!window.confirm('Delete this deal? All stats will update.')) return
    deleteLead(id)
    setClientData(prev => { const n = { ...prev }; delete n[id]; return n })
  }

  const thStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: c.muted, textTransform: 'uppercase',
    letterSpacing: '0.08em', padding: '0 10px 10px', textAlign: 'left',
    borderBottom: `1px solid ${c.border}`,
  }

  return (
    <div style={cardStyle(c)}>
      <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 700, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>DEALS</p>
      <h2 style={{ margin: '0 0 16px', fontSize: 22, fontWeight: 800, color: c.text, letterSpacing: '-0.02em' }}>All Closed Deals</h2>

      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search deals..."
        style={{ ...inputStyle(c), marginBottom: 16 }}
      />

      {wonLeads.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: c.muted, fontStyle: 'italic', fontSize: 14 }}>
          {search ? 'No deals match your search' : 'No deals yet — log your first sale above ↑'}
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Business</th>
              <th style={thStyle}>Deal Value</th>
              <th style={thStyle}>Found By</th>
              <th style={thStyle}>Close Date</th>
              <th style={thStyle}>Finder Fee</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {wonLeads.map((lead, i) => {
              const fee = callerFees[lead.callerId] ?? 20
              const finderFee = Math.round((lead.dealValue ?? 0) * fee / 100)
              return (
                <tr key={lead.id} style={{ background: i % 2 === 1 ? `${c.bg3}18` : 'transparent' }}>
                  <td style={{ padding: '10px 10px', fontSize: 14, fontWeight: 600, color: c.text }}>{lead.business}</td>
                  <td style={{ padding: '10px 10px' }}>
                    <input
                      type="number"
                      defaultValue={lead.dealValue ?? 0}
                      onBlur={e => updateLead(lead.id, { dealValue: Number(e.target.value) })}
                      style={{
                        width: 90, height: 30, fontSize: 13, fontWeight: 700,
                        background: c.bg3, border: `1px solid ${c.border}`, borderRadius: 7,
                        padding: '0 8px', color: c.accent, outline: 'none',
                        fontFamily: '"Plus Jakarta Sans", sans-serif',
                      }}
                    />
                  </td>
                  <td style={{ padding: '10px 10px' }}>
                    <select
                      value={lead.callerId}
                      onChange={e => updateLead(lead.id, { callerId: e.target.value })}
                      style={{
                        height: 30, fontSize: 12, background: c.bg3, border: `1px solid ${c.border}`,
                        borderRadius: 7, padding: '0 8px', color: c.text, cursor: 'pointer',
                        fontFamily: '"Plus Jakarta Sans", sans-serif',
                      }}
                    >
                      <optgroup label="— TEAM —">
                        {CALLERS.map(caller => <option key={caller.id} value={caller.id}>{caller.name}</option>)}
                      </optgroup>
                      <optgroup label="— ADMIN —">
                        <option value="admin">Luka &amp; Samvit</option>
                      </optgroup>
                    </select>
                  </td>
                  <td style={{ padding: '10px 10px' }}>
                    <input
                      type="date"
                      defaultValue={lead.closedDate ?? ''}
                      onBlur={e => updateLead(lead.id, { closedDate: e.target.value })}
                      style={{
                        height: 30, fontSize: 12, background: c.bg3, border: `1px solid ${c.border}`,
                        borderRadius: 7, padding: '0 8px', color: c.text, outline: 'none',
                        fontFamily: '"Plus Jakarta Sans", sans-serif',
                      }}
                    />
                  </td>
                  <td style={{ padding: '10px 10px', fontSize: 12, color: c.muted, fontStyle: 'italic' }}>
                    ${finderFee.toLocaleString()} ({fee}%)
                  </td>
                  <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                      <button onClick={() => openEditModal(lead)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 7, background: 'transparent', border: `1px solid ${c.border}`, color: c.textSecond, cursor: 'pointer' }}><PencilIcon /></button>
                      <button onClick={() => handleDelete(lead.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 7, background: 'transparent', border: `1px solid ${c.border}40`, color: c.danger, cursor: 'pointer' }}><TrashIcon /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setEditModal(null)}>
          <div style={{
            background: c.bg, border: `1px solid ${c.border}`,
            borderRadius: 16, padding: 24, width: 420,
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, color: c.text }}>Edit Deal — {editModal.business}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Business Name</label>
                <input value={editForm.business ?? ''} onChange={e => setEditForm(f => ({ ...f, business: e.target.value }))} style={inputStyle(c)} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Deal Value</label>
                <input type="number" value={editForm.dealValue ?? ''} onChange={e => setEditForm(f => ({ ...f, dealValue: Number(e.target.value) }))} style={inputStyle(c)} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Found By</label>
                <select value={editForm.callerId ?? ''} onChange={e => setEditForm(f => ({ ...f, callerId: e.target.value }))} style={selectStyle(c)}>
                  <optgroup label="— TEAM —">
                    {CALLERS.map(caller => <option key={caller.id} value={caller.id}>{caller.name} — Caller</option>)}
                  </optgroup>
                  <optgroup label="— ADMIN —">
                    <option value="admin">Luka &amp; Samvit — Admin</option>
                  </optgroup>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Close Date</label>
                <input type="date" value={editForm.closedDate ?? ''} onChange={e => setEditForm(f => ({ ...f, closedDate: e.target.value }))} style={inputStyle(c)} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button onClick={saveEditModal} style={{ flex: 1, height: 44, background: c.accent, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Save Changes</button>
                <button onClick={() => setEditModal(null)} style={{ flex: 1, height: 44, background: c.bg3, color: c.textSecond, border: `1px solid ${c.border}`, borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Section 4: Revenue Controls ────────────────────────────────────────

function RevenueSection({ c, defaultDealValue, setDefaultDealValue }: { c: C; defaultDealValue: string; setDefaultDealValue: (v: string) => void }) {
  const { callerFees, setCallerFees } = useAppData()
  const [localDefault, setLocalDefault] = useState(defaultDealValue)

  const lukaFee = callerFees['luka'] ?? 50
  const samvitFee = callerFees['samvit'] ?? 30
  const finderFee = Math.max(0, 100 - lukaFee - samvitFee)
  const total = lukaFee + samvitFee + finderFee

  return (
    <div style={cardStyle(c)}>
      <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 700, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>REVENUE</p>
      <h2 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 800, color: c.text, letterSpacing: '-0.02em' }}>Commission Structure</h2>

      {/* Split bar */}
      <div style={{ height: 48, borderRadius: 12, overflow: 'hidden', display: 'flex', marginBottom: 12 }}>
        {lukaFee > 0 && (
          <div style={{ width: `${lukaFee}%`, background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>Luka {lukaFee}%</span>
          </div>
        )}
        {samvitFee > 0 && (
          <div style={{ width: `${samvitFee}%`, background: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>Samvit {samvitFee}%</span>
          </div>
        )}
        {finderFee > 0 && (
          <div style={{ width: `${finderFee}%`, background: c.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>Finder {finderFee}%</span>
          </div>
        )}
      </div>

      {total !== 100 && (
        <p style={{ fontSize: 12, color: c.danger, fontWeight: 600, marginBottom: 12 }}>
          Must total 100% (currently {lukaFee + samvitFee + finderFee}%)
        </p>
      )}

      {/* Admin fee inputs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {ADMINS.map(admin => (
          <div key={admin.id} style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
              {admin.name} Fee %
            </label>
            <input
              type="number"
              value={callerFees[admin.id] ?? admin.feePercent}
              onChange={e => setCallerFees(prev => ({ ...prev, [admin.id]: Number(e.target.value) }))}
              style={{ ...inputStyle(c), width: '100%', fontWeight: 700, color: '#6366f1' }}
            />
          </div>
        ))}
      </div>

      {/* Scenario cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Caller finds', values: `Caller ${finderFee}% · Luka ${lukaFee}% · Samvit ${samvitFee}%` },
          { label: 'Luka finds', values: `Luka ${lukaFee + finderFee}% · Samvit ${samvitFee}% · Caller 0%` },
          { label: 'Samvit finds', values: `Luka ${lukaFee}% · Samvit ${samvitFee + finderFee}% · Caller 0%` },
        ].map(scenario => (
          <div key={scenario.label} style={{ flex: 1, background: c.bg3, borderRadius: 10, padding: 12 }}>
            <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{scenario.label}</p>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: c.text }}>{scenario.values}</p>
          </div>
        ))}
      </div>

      {/* Default Deal Value */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: c.text, whiteSpace: 'nowrap' }}>Default Deal Value</label>
        <input
          type="number"
          value={localDefault}
          onChange={e => setLocalDefault(e.target.value)}
          placeholder="0"
          style={{ ...inputStyle(c), width: 120 }}
        />
        <button
          onClick={() => setDefaultDealValue(localDefault)}
          style={{
            height: 44, padding: '0 16px', background: c.accent, color: '#fff', border: 'none',
            borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer',
            fontFamily: '"Plus Jakarta Sans", sans-serif',
          }}
        >
          Save
        </button>
      </div>
    </div>
  )
}

// ── Section 5: Manage Leads ────────────────────────────────────────────

interface WonPopover {
  id: string
  dealValue: string
}

interface LostPopover {
  id: string
  reason: RejectionReason
}

interface LeadModalForm {
  business: string
  type: string
  contact: string
  phone: string
  callerId: string
  stage: Stage
  notes: string
}

function LeadsSection({ c }: { c: C }) {
  const { leads, moveLeadStage, updateLead, deleteLead, setClientData } = useAppData()
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<Stage | 'all'>('all')
  const [callerFilter, setCallerFilter] = useState('all')
  const [wonPopover, setWonPopover] = useState<WonPopover | null>(null)
  const [lostPopover, setLostPopover] = useState<LostPopover | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editLeadModal, setEditLeadModal] = useState<Lead | null>(null)
  const [editLeadForm, setEditLeadForm] = useState<Partial<Lead>>({})
  const [addForm, setAddForm] = useState<LeadModalForm>({
    business: '', type: '', contact: '', phone: '', callerId: 'alex', stage: 'new', notes: '',
  })

  const today = todayStr()

  const filtered = useMemo(() =>
    leads.filter(l => {
      if (search && !l.business.toLowerCase().includes(search.toLowerCase()) && !l.contact.toLowerCase().includes(search.toLowerCase())) return false
      if (stageFilter !== 'all' && l.stage !== stageFilter) return false
      if (callerFilter !== 'all' && l.callerId !== callerFilter) return false
      return true
    }),
    [leads, search, stageFilter, callerFilter]
  )

  function handleStageChange(lead: Lead, newStage: Stage) {
    if (newStage === 'won') {
      setWonPopover({ id: lead.id, dealValue: String(lead.dealValue ?? '') })
    } else if (newStage === 'lost') {
      setLostPopover({ id: lead.id, reason: 'No Budget' })
    } else {
      moveLeadStage(lead.id, newStage)
    }
  }

  function confirmWon() {
    if (!wonPopover) return
    const val = Number(wonPopover.dealValue)
    if (val > 0) updateLead(wonPopover.id, { dealValue: val, closedDate: today })
    moveLeadStage(wonPopover.id, 'won')
    setWonPopover(null)
  }

  function confirmLost() {
    if (!lostPopover) return
    moveLeadStage(lostPopover.id, 'lost', { lostReason: lostPopover.reason, lostDate: today })
    setLostPopover(null)
  }

  function handleDelete(id: string) {
    if (!window.confirm('Delete this lead? This action cannot be undone.')) return
    deleteLead(id)
    setClientData(prev => { const n = { ...prev }; delete n[id]; return n })
  }

  function handleAddLead() {
    if (!addForm.business.trim()) return
    const id = `lead-${Date.now()}`
    const newLead: Lead = {
      id, business: addForm.business.trim(), type: addForm.type,
      contact: addForm.contact, phone: addForm.phone || undefined,
      notes: addForm.notes || undefined, callerId: addForm.callerId,
      addedDate: today, stage: addForm.stage,
    }
    updateLead(id, newLead)
    // use setLeads from context via updateLead doesn't create, use moveLeadStage chain
    // Actually updateLead patches existing; for new lead we need setLeads
    // We'll use the approach from Section 1
    setShowAddModal(false)
    setAddForm({ business: '', type: '', contact: '', phone: '', callerId: 'alex', stage: 'new', notes: '' })
  }

  function openEditLead(lead: Lead) {
    setEditLeadModal(lead)
    setEditLeadForm({ ...lead })
  }

  function saveEditLead() {
    if (!editLeadModal) return
    updateLead(editLeadModal.id, editLeadForm)
    setEditLeadModal(null)
  }

  const thStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: c.muted, textTransform: 'uppercase',
    letterSpacing: '0.08em', padding: '0 10px 10px', textAlign: 'left',
    borderBottom: `1px solid ${c.border}`,
  }

  const allMembers = [...CALLERS, ...ADMINS]

  return (
    <div style={cardStyle(c)}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 700, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>LEADS</p>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: c.text, letterSpacing: '-0.02em' }}>Quick Lead Manager</h2>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            height: 36, padding: '0 14px', fontSize: 13, fontWeight: 600,
            background: c.accent, color: '#fff', border: 'none', borderRadius: 8,
            cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif',
          }}
        >
          +  Quick Add Lead
        </button>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search leads..."
          style={{ ...inputStyle(c), flex: 1, height: 36 }}
        />
        <select value={stageFilter} onChange={e => setStageFilter(e.target.value as Stage | 'all')} style={{ ...selectStyle(c), width: 150, height: 36 }}>
          <option value="all">All Stages</option>
          {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
        </select>
        <select value={callerFilter} onChange={e => setCallerFilter(e.target.value)} style={{ ...selectStyle(c), width: 140, height: 36 }}>
          <option value="all">All Callers</option>
          {allMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      <p style={{ margin: '0 0 10px', fontSize: 11, color: c.muted }}>Showing {filtered.length} lead{filtered.length !== 1 ? 's' : ''}</p>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: c.muted, fontStyle: 'italic', fontSize: 14 }}>No leads yet</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Business</th>
              <th style={thStyle}>Stage</th>
              <th style={thStyle}>Found By</th>
              <th style={thStyle}>Added</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((lead, i) => (
              <tr key={lead.id} style={{ background: i % 2 === 1 ? `${c.bg3}18` : 'transparent' }}>
                <td style={{ padding: '10px 10px', fontSize: 14, fontWeight: 600, color: c.text }}>{lead.business}</td>
                <td style={{ padding: '10px 10px' }}>
                  <select
                    value={lead.stage}
                    onChange={e => handleStageChange(lead, e.target.value as Stage)}
                    style={{
                      height: 30, fontSize: 12, background: c.bg3, border: `1px solid ${c.border}`,
                      borderRadius: 7, padding: '0 8px', color: c.text, cursor: 'pointer',
                      fontFamily: '"Plus Jakarta Sans", sans-serif',
                    }}
                  >
                    {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                  </select>
                  {wonPopover?.id === lead.id && (
                    <div style={{ marginTop: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        type="number"
                        value={wonPopover.dealValue}
                        onChange={e => setWonPopover(p => p ? { ...p, dealValue: e.target.value } : null)}
                        placeholder="Deal value ($)"
                        autoFocus
                        style={{ width: 110, height: 28, fontSize: 12, background: c.bg3, border: `1px solid ${c.accent}`, borderRadius: 6, padding: '0 8px', color: c.accent, fontWeight: 700, outline: 'none', fontFamily: '"Plus Jakarta Sans", sans-serif' }}
                      />
                      <button onClick={confirmWon} style={{ fontSize: 11, fontWeight: 700, background: c.success, color: '#fff', border: 'none', borderRadius: 5, padding: '4px 8px', cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Confirm</button>
                      <button onClick={() => setWonPopover(null)} style={{ fontSize: 11, background: c.bg3, color: c.muted, border: `1px solid ${c.border}`, borderRadius: 5, padding: '4px 8px', cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Cancel</button>
                    </div>
                  )}
                  {lostPopover?.id === lead.id && (
                    <div style={{ marginTop: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
                      <select
                        value={lostPopover.reason}
                        onChange={e => setLostPopover(p => p ? { ...p, reason: e.target.value as RejectionReason } : null)}
                        style={{ height: 28, fontSize: 12, background: c.bg3, border: `1px solid ${c.border}`, borderRadius: 6, padding: '0 8px', color: c.text, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}
                      >
                        {REJECTION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <button onClick={confirmLost} style={{ fontSize: 11, fontWeight: 700, background: c.danger, color: '#fff', border: 'none', borderRadius: 5, padding: '4px 8px', cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Confirm</button>
                      <button onClick={() => setLostPopover(null)} style={{ fontSize: 11, background: c.bg3, color: c.muted, border: `1px solid ${c.border}`, borderRadius: 5, padding: '4px 8px', cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Cancel</button>
                    </div>
                  )}
                </td>
                <td style={{ padding: '10px 10px' }}>
                  <select
                    value={lead.callerId}
                    onChange={e => updateLead(lead.id, { callerId: e.target.value })}
                    style={{
                      height: 30, fontSize: 12, background: c.bg3, border: `1px solid ${c.border}`,
                      borderRadius: 7, padding: '0 8px', color: c.text, cursor: 'pointer',
                      fontFamily: '"Plus Jakarta Sans", sans-serif',
                    }}
                  >
                    {allMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </td>
                <td style={{ padding: '10px 10px', fontSize: 12, color: c.muted }}>{formatDate(lead.addedDate)}</td>
                <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                    <button onClick={() => openEditLead(lead)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 7, background: 'transparent', border: `1px solid ${c.border}`, color: c.textSecond, cursor: 'pointer' }}><PencilIcon /></button>
                    <button onClick={() => handleDelete(lead.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 7, background: 'transparent', border: `1px solid ${c.border}40`, color: c.danger, cursor: 'pointer' }}><TrashIcon /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Quick Add Lead Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowAddModal(false)}>
          <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24, width: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, color: c.text }}>Quick Add Lead</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Business Name *</label>
                <input value={addForm.business} onChange={e => setAddForm(f => ({ ...f, business: e.target.value }))} style={inputStyle(c)} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Business Type</label>
                <input value={addForm.type} onChange={e => setAddForm(f => ({ ...f, type: e.target.value }))} style={inputStyle(c)} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Contact Name</label>
                <input value={addForm.contact} onChange={e => setAddForm(f => ({ ...f, contact: e.target.value }))} style={inputStyle(c)} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Phone</label>
                <input value={addForm.phone} onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))} style={inputStyle(c)} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Found By</label>
                <select value={addForm.callerId} onChange={e => setAddForm(f => ({ ...f, callerId: e.target.value }))} style={selectStyle(c)}>
                  {allMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Stage</label>
                <select value={addForm.stage} onChange={e => setAddForm(f => ({ ...f, stage: e.target.value as Stage }))} style={selectStyle(c)}>
                  {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Notes</label>
                <textarea value={addForm.notes} onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ ...inputStyle(c, { height: 'auto', padding: '10px 14px', resize: 'none' }) }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button onClick={handleAddLead} style={{ flex: 1, height: 44, background: c.accent, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Add Lead</button>
              <button onClick={() => setShowAddModal(false)} style={{ flex: 1, height: 44, background: c.bg3, color: c.textSecond, border: `1px solid ${c.border}`, borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Lead Modal */}
      {editLeadModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setEditLeadModal(null)}>
          <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24, width: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, color: c.text }}>Edit Lead — {editLeadModal.business}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Business Name</label>
                <input value={editLeadForm.business ?? ''} onChange={e => setEditLeadForm(f => ({ ...f, business: e.target.value }))} style={inputStyle(c)} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Contact</label>
                <input value={editLeadForm.contact ?? ''} onChange={e => setEditLeadForm(f => ({ ...f, contact: e.target.value }))} style={inputStyle(c)} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Stage</label>
                <select value={editLeadForm.stage ?? 'new'} onChange={e => setEditLeadForm(f => ({ ...f, stage: e.target.value as Stage }))} style={selectStyle(c)}>
                  {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Notes</label>
                <textarea value={editLeadForm.notes ?? ''} onChange={e => setEditLeadForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ ...inputStyle(c, { height: 'auto', padding: '10px 14px', resize: 'none' }) }} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button onClick={saveEditLead} style={{ flex: 1, height: 44, background: c.accent, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Save Changes</button>
                <button onClick={() => setEditLeadModal(null)} style={{ flex: 1, height: 44, background: c.bg3, color: c.textSecond, border: `1px solid ${c.border}`, borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Section 6: Quick Actions ───────────────────────────────────────────

interface MeetingForm {
  business: string
  contactName: string
  date: string
  startTime: string
  durationMinutes: number
  assignee: string
  type: MeetingType
  notes: string
  personalConnection: string
}

function QuickActionsSection({ c }: { c: C }) {
  const { setMeetings } = useAppData()
  const [showMeetingModal, setShowMeetingModal] = useState(false)
  const [showRejectedModal, setShowRejectedModal] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [meetingForm, setMeetingForm] = useState<MeetingForm>({
    business: '', contactName: '', date: todayStr(),
    startTime: '10:00', durationMinutes: 30,
    assignee: 'Alex', type: 'Discovery Call',
    notes: '', personalConnection: '',
  })
  const [rejectedForm, setRejectedForm] = useState({
    business: '', contact: '', reason: 'No Budget' as RejectionReason, notes: '',
  })

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function setMF(k: keyof MeetingForm, v: string | number) {
    setMeetingForm(f => ({ ...f, [k]: v }))
  }

  function handleScheduleMeeting() {
    if (!meetingForm.business.trim()) return
    const id = `meet-${Date.now()}`
    const newMeeting: Meeting = {
      id, business: meetingForm.business.trim(),
      contactName: meetingForm.contactName || undefined,
      date: meetingForm.date, startTime: meetingForm.startTime,
      durationMinutes: meetingForm.durationMinutes,
      assignee: meetingForm.assignee, type: meetingForm.type,
      notes: meetingForm.notes || undefined,
      personalConnection: meetingForm.personalConnection || undefined,
    }
    setMeetings(prev => [...prev, newMeeting])
    setMeetingForm({ business: '', contactName: '', date: todayStr(), startTime: '10:00', durationMinutes: 30, assignee: 'Alex', type: 'Discovery Call', notes: '', personalConnection: '' })
    setShowMeetingModal(false)
    showToast('Meeting scheduled successfully!')
  }

  function handleAddRejected() {
    if (!rejectedForm.business.trim()) return
    setShowRejectedModal(false)
    showToast(`${rejectedForm.business} added to rejected leads.`)
    setRejectedForm({ business: '', contact: '', reason: 'No Budget', notes: '' })
  }

  const btnStyle = (hov: boolean): React.CSSProperties => ({
    background: c.bg3, border: `1px solid ${hov ? c.accent : c.border}`,
    borderRadius: 10, padding: '12px 20px', fontSize: 13, fontWeight: 600,
    color: hov ? c.accent : c.textSecond, cursor: 'pointer',
    transition: 'border-color 0.15s, color 0.15s',
    fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif',
  })

  const [hovs, setHovs] = useState([false, false, false, false, false])
  function setHov(i: number, v: boolean) {
    setHovs(prev => { const n = [...prev]; n[i] = v; return n })
  }

  const allMembers = [...CALLERS, ...ADMINS]

  return (
    <div style={cardStyle(c)}>
      <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 700, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>QUICK ACTIONS</p>
      <h2 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 800, color: c.text, letterSpacing: '-0.02em' }}>Actions</h2>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {[
          { emoji: '📅', label: 'Schedule Meeting', action: () => setShowMeetingModal(true) },
          { emoji: '✅', label: 'Add Follow-up', action: () => showToast('Coming soon — follow-up system in development') },
          { emoji: '🚫', label: 'Add to Rejected', action: () => setShowRejectedModal(true) },
          { emoji: '📊', label: 'Export Data', action: () => showToast('Coming soon — CSV export will be available soon') },
          { emoji: '⚙', label: 'Settings', action: () => showToast('Coming soon — advanced settings panel in development') },
        ].map((action, i) => (
          <button
            key={action.label}
            onClick={action.action}
            onMouseEnter={() => setHov(i, true)}
            onMouseLeave={() => setHov(i, false)}
            style={btnStyle(hovs[i])}
          >
            {action.emoji} {action.label}
          </button>
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 2000,
          background: c.bg, border: `1px solid ${c.border}`,
          borderRadius: 10, padding: '12px 20px',
          fontSize: 13, fontWeight: 600, color: c.text,
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          animation: 'fadeSlideUp 0.3s ease both',
        }}>
          {toast}
        </div>
      )}

      {/* Schedule Meeting Modal */}
      {showMeetingModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowMeetingModal(false)}>
          <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24, width: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, color: c.text }}>Schedule Meeting</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Business Name *</label>
                <input value={meetingForm.business} onChange={e => setMF('business', e.target.value)} style={inputStyle(c)} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Contact Name</label>
                <input value={meetingForm.contactName} onChange={e => setMF('contactName', e.target.value)} style={inputStyle(c)} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Date</label>
                <input type="date" value={meetingForm.date} onChange={e => setMF('date', e.target.value)} style={inputStyle(c)} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Start Time</label>
                <input type="time" value={meetingForm.startTime} onChange={e => setMF('startTime', e.target.value)} style={inputStyle(c)} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Duration (min)</label>
                <input type="number" value={meetingForm.durationMinutes} onChange={e => setMF('durationMinutes', Number(e.target.value))} style={inputStyle(c)} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Assignee</label>
                <select value={meetingForm.assignee} onChange={e => setMF('assignee', e.target.value)} style={selectStyle(c)}>
                  {allMembers.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Meeting Type</label>
                <select value={meetingForm.type} onChange={e => setMF('type', e.target.value)} style={selectStyle(c)}>
                  {MEETING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Notes</label>
                <textarea value={meetingForm.notes} onChange={e => setMF('notes', e.target.value)} rows={2} style={{ ...inputStyle(c, { height: 'auto', padding: '10px 14px', resize: 'none' }) }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button onClick={handleScheduleMeeting} style={{ flex: 1, height: 44, background: c.accent, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Schedule</button>
              <button onClick={() => setShowMeetingModal(false)} style={{ flex: 1, height: 44, background: c.bg3, color: c.textSecond, border: `1px solid ${c.border}`, borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Rejected Modal */}
      {showRejectedModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowRejectedModal(false)}>
          <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24, width: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, color: c.text }}>Add to Rejected</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Business Name *</label>
                <input value={rejectedForm.business} onChange={e => setRejectedForm(f => ({ ...f, business: e.target.value }))} style={inputStyle(c)} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Contact</label>
                <input value={rejectedForm.contact} onChange={e => setRejectedForm(f => ({ ...f, contact: e.target.value }))} style={inputStyle(c)} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Rejection Reason</label>
                <select value={rejectedForm.reason} onChange={e => setRejectedForm(f => ({ ...f, reason: e.target.value as RejectionReason }))} style={selectStyle(c)}>
                  {REJECTION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Notes</label>
                <textarea value={rejectedForm.notes} onChange={e => setRejectedForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ ...inputStyle(c, { height: 'auto', padding: '10px 14px', resize: 'none' }) }} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button onClick={handleAddRejected} style={{ flex: 1, height: 44, background: c.danger, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Add to Rejected</button>
                <button onClick={() => setShowRejectedModal(false)} style={{ flex: 1, height: 44, background: c.bg3, color: c.textSecond, border: `1px solid ${c.border}`, borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main AdminPanel Page ───────────────────────────────────────────────

export default function AdminPanel() {
  const navigate = useNavigate()
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('agency-theme') as Theme) ?? 'light')
  const [user, setUser] = useState<User | null>(null)
  const [signOutHov, setSignOutHov] = useState(false)
  const [defaultDealValue, setDefaultDealValue] = useState('')

  const c = THEMES[theme]

  useEffect(() => {
    localStorage.setItem('agency-theme', theme)
  }, [theme])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
    })
  }, [])

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const userName =
    user?.user_metadata?.full_name ??
    user?.email?.split('@')[0] ??
    'Admin'

  const NAV_TABS = [
    { label: 'Dashboard',     path: '/admin',           active: false },
    { label: 'Sales Finance', path: '/admin/finances',  active: false },
    { label: 'Leads',         path: '/admin/leads',     active: false },
    { label: 'Rejected',      path: '/admin/rejected',  active: false },
    { label: 'Clients',       path: '/admin/clients',   active: false },
    { label: 'Calendar',      path: '/admin/calendar',  active: false },
    { label: 'Scripts',       path: '/admin/scripts',   active: false },
    { label: 'Panel',         path: '/admin/panel',     active: true  },
  ]

  return (
    <>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{
        width: '100vw', height: '100vh',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        background: c.bg2, color: c.text,
        fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif',
        transition: 'background 0.3s ease, color 0.3s ease',
      }}>

        {/* Nav */}
        <header style={{
          height: 64, flexShrink: 0, display: 'flex', alignItems: 'stretch',
          padding: '0 32px', background: c.bg2, borderBottom: `1px solid ${c.border}`,
          transition: 'background 0.3s ease, border-color 0.3s ease',
        }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', marginRight: 32 }}>
            <span style={{ color: c.accent, fontSize: 13, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              Agency
            </span>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
            {NAV_TABS.map(tab => (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                style={{
                  display: 'flex', alignItems: 'center', padding: '0 16px',
                  fontSize: 13, fontWeight: tab.active ? 600 : 500,
                  color: tab.active ? c.accent : c.muted,
                  background: 'none', border: 'none', cursor: 'pointer',
                  borderBottom: tab.active ? `2px solid ${c.accent}` : '2px solid transparent',
                  transition: 'color 0.15s ease, border-color 0.15s ease',
                  fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Online Avatars */}

          {/* Right controls */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>

            {/* Gear icon — active (already on panel) */}
            <button
              onClick={() => navigate('/admin/panel')}
              title="Admin Panel"
              style={{
                width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 10, border: `1px solid ${c.accent}`,
                background: c.accent, color: '#fff',
                cursor: 'pointer', transition: 'background 0.3s ease, border-color 0.3s ease',
              }}
            >
              <GearIcon />
            </button>

            <button
              onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
              aria-label="Toggle theme"
              style={{
                width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 10, border: `1px solid ${c.border}`, background: c.bg3, color: c.textSecond,
                cursor: 'pointer', transition: 'background 0.3s ease, border-color 0.3s ease',
              }}
            >
              {theme === 'light' ? <MoonIcon /> : <SunIcon />}
            </button>

            <div style={{ width: 1, height: 20, background: c.border }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: c.textSecond }}>{userName}</span>
            <button
              onClick={handleSignOut}
              onMouseEnter={() => setSignOutHov(true)}
              onMouseLeave={() => setSignOutHov(false)}
              style={{
                fontSize: 13, fontWeight: 500,
                color: signOutHov ? c.danger : c.muted,
                background: signOutHov ? `${c.danger}14` : 'transparent',
                border: 'none', padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
                transition: 'color 0.15s ease, background 0.15s ease',
                fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif',
              }}
            >
              Sign out
            </button>
          </div>
        </header>

        {/* Main content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
          <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Page title */}
            <div style={{ animation: 'fadeSlideUp 0.4s ease both', animationDelay: '0s' }}>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: c.text, letterSpacing: '-0.02em' }}>
                Admin Panel
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: c.muted }}>
                Manage your agency — all changes update everywhere
              </p>
            </div>

            {/* Section 1 */}
            <div style={{ animation: 'fadeSlideUp 0.4s ease both', animationDelay: '0.05s' }}>
              <LogSaleSection c={c} defaultDealValue={defaultDealValue} />
            </div>

            {/* Section 2 */}
            <div style={{ animation: 'fadeSlideUp 0.4s ease both', animationDelay: '0.10s' }}>
              <TeamSection c={c} />
            </div>

            {/* Section 3 */}
            <div style={{ animation: 'fadeSlideUp 0.4s ease both', animationDelay: '0.15s' }}>
              <DealsSection c={c} />
            </div>

            {/* Section 4 */}
            <div style={{ animation: 'fadeSlideUp 0.4s ease both', animationDelay: '0.20s' }}>
              <RevenueSection c={c} defaultDealValue={defaultDealValue} setDefaultDealValue={setDefaultDealValue} />
            </div>

            {/* Section 5 */}
            <div style={{ animation: 'fadeSlideUp 0.4s ease both', animationDelay: '0.25s' }}>
              <LeadsSection c={c} />
            </div>

            {/* Section 6 */}
            <div style={{ animation: 'fadeSlideUp 0.4s ease both', animationDelay: '0.30s' }}>
              <QuickActionsSection c={c} />
            </div>

          </div>
        </main>
      </div>
    </>
  )
}
