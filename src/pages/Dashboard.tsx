import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { signOut } from '../lib/auth'
import type { User } from '@supabase/supabase-js'
import { CALLERS, CALLER_COLOR_BY_ID, CALLER_EMAIL_MAP } from '../data/mockData'
import { useAppData } from '../contexts/AppDataContext'

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
type FollowUpStatus = 'overdue' | 'today' | 'upcoming'
type FollowUpItem = { id: string; task: string; due: string; assignee: string; status: FollowUpStatus; source: 'derived' | 'local' }
type ActivityItem = { id: string; text: string; time: string; dot: string }

const STATUS_COLORS: Record<FollowUpStatus, string> = { overdue: '#ef4444', today: '#f59e0b', upcoming: '#10b981' }

function relativeDate(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr + 'T12:00:00').getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return `${diff} days ago`
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

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

function StatCard({ label, value, sub, accent = false, c, delay }: {
  label: string; value: string; sub: string; accent?: boolean; c: C; delay: string
}) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: c.bg2, border: `1px solid ${c.border}`, borderRadius: 16, padding: 20,
        boxShadow: hov ? '0 8px 24px rgba(0,0,0,0.12)' : '0 1px 4px rgba(0,0,0,0.06)',
        transform: hov ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease, background 0.3s ease',
        animation: 'fadeSlideUp 0.4s ease both', animationDelay: delay,
      }}
    >
      <p style={{ margin: 0, color: c.muted, fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</p>
      <p style={{ margin: '6px 0 0', color: accent ? c.accent : c.text, fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</p>
      <p style={{ margin: '8px 0 0', color: c.success, fontSize: 12, fontWeight: 500 }}>{sub}</p>
    </div>
  )
}

function FollowUpRow({ item, c, last, onDelete }: {
  item: FollowUpItem; c: C; last: boolean; onDelete: (id: string) => void
}) {
  const [checked, setChecked] = useState(false)
  const [hovCheck, setHovCheck] = useState(false)
  const dotColor = STATUS_COLORS[item.status]

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0',
      borderBottom: last ? 'none' : `1px solid ${c.border}`,
      opacity: checked ? 0.45 : 1, transition: 'opacity 0.25s ease',
    }}>
      <button
        onClick={() => setChecked(v => !v)}
        onMouseEnter={() => setHovCheck(true)}
        onMouseLeave={() => setHovCheck(false)}
        style={{
          width: 20, height: 20, borderRadius: 4, flexShrink: 0,
          border: checked ? 'none' : `1.5px solid ${hovCheck ? c.accent : c.border}`,
          background: checked ? c.accent : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', padding: 0,
          transform: hovCheck && !checked ? 'scale(1.08)' : 'scale(1)',
          transition: 'background 0.15s, border-color 0.15s, transform 0.15s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        {checked && (
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, lineHeight: 1.4, color: checked ? c.muted : c.text, textDecoration: checked ? 'line-through' : 'none', transition: 'color 0.2s' }}>{item.task}</p>
        <p style={{ margin: '2px 0 0', fontSize: 11, color: c.muted }}>{item.due}</p>
      </div>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
      {item.source === 'local' && (
        <button onClick={() => onDelete(item.id)} style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: `1px solid #ef444440`, color: '#ef4444', cursor: 'pointer' }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  )
}

function ActivityRow({ item, c, last }: { item: ActivityItem; c: C; last: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: last ? 'none' : `1px solid ${c.border}` }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.dot, flexShrink: 0, marginTop: 6 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: c.text, lineHeight: 1.4 }}>{item.text}</p>
        <p style={{ margin: '2px 0 0', fontSize: 11, color: c.muted }}>{item.time}</p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('agency-theme') as Theme) ?? 'light')
  const [user, setUser] = useState<User | null>(null)
  const [signOutHov, setSignOutHov] = useState(false)
  const [localFollowups, setLocalFollowups] = useState<FollowUpItem[]>([])
  const [newFollowupText, setNewFollowupText] = useState('')
  const { leads } = useAppData()

  const c = THEMES[theme]

  useEffect(() => { localStorage.setItem('agency-theme', theme) }, [theme])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
    })
  }, [])

  const callerId = useMemo(() => {
    if (!user?.email) return null
    return CALLERS.find(c => c.email === user.email)?.id ?? null
  }, [user])

  const caller = useMemo(() => {
    if (!callerId) return null
    return CALLERS.find(c => c.id === callerId) ?? null
  }, [callerId])

  const myLeads = useMemo(() => {
    if (!callerId) return []
    return leads.filter(l => l.callerId === callerId)
  }, [leads, callerId])

  const stats = useMemo(() => {
    const today = new Date()
    const currentYM = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1))
    weekStart.setHours(0, 0, 0, 0)

    const wonLeads = myLeads.filter(l => l.stage === 'won' && l.closedDate)
    const revenueMTD = wonLeads.filter(l => l.closedDate!.startsWith(currentYM)).reduce((s, l) => s + (l.dealValue ?? 0), 0)
    const dealsThisWeek = wonLeads.filter(l => new Date(l.closedDate! + 'T12:00:00') >= weekStart).length
    const totalRevenue = wonLeads.reduce((s, l) => s + (l.dealValue ?? 0), 0)
    const avgDeal = wonLeads.length > 0 ? Math.round(totalRevenue / wonLeads.length) : 0
    const inPipeline = myLeads.filter(l => !['won', 'lost'].includes(l.stage)).length

    return { revenueMTD, dealsThisWeek, totalWon: wonLeads.length, avgDeal, inPipeline }
  }, [myLeads])

  // Rank among all callers by revenue
  const myRank = useMemo(() => {
    const revenues = CALLERS.map(c => ({
      id: c.id,
      rev: leads.filter(l => l.callerId === c.id && l.stage === 'won').reduce((s, l) => s + (l.dealValue ?? 0), 0),
    })).sort((a, b) => b.rev - a.rev)
    const idx = revenues.findIndex(r => r.id === callerId)
    return idx === -1 ? null : idx + 1
  }, [leads, callerId])

  const followupsFromLeads = useMemo<FollowUpItem[]>(() => {
    return myLeads
      .filter(l => ['contacted', 'maybe', 'meeting', 'proposal'].includes(l.stage))
      .map(l => {
        const days = Math.floor((Date.now() - new Date(l.addedDate + 'T12:00:00').getTime()) / 86400000)
        let due: string; let status: FollowUpStatus
        if (days > 7)       { due = 'Overdue';   status = 'overdue'  }
        else if (days >= 3) { due = 'Due today';  status = 'today'    }
        else                { due = 'Due soon';   status = 'upcoming' }
        return { id: l.id, task: `Follow up with ${l.business}`, due, assignee: caller?.name ?? '', status, source: 'derived' as const }
      })
      .sort((a, b) => ({ overdue: 0, today: 1, upcoming: 2 }[a.status]) - ({ overdue: 0, today: 1, upcoming: 2 }[b.status]))
  }, [myLeads, caller])

  const allFollowups = [...followupsFromLeads, ...localFollowups]

  const activityItems = useMemo<ActivityItem[]>(() => {
    if (!callerId) return []
    const dot = CALLER_COLOR_BY_ID[callerId] ?? '#94a3b8'
    const events: ActivityItem[] = []
    for (const lead of myLeads) {
      if (lead.stage === 'won' && lead.closedDate) {
        events.push({ id: `won-${lead.id}`, text: `Closed a deal with ${lead.business}`, time: relativeDate(lead.closedDate), dot })
      } else if (lead.stage === 'lost' && lead.lostDate) {
        events.push({ id: `lost-${lead.id}`, text: `Lead ${lead.business} was lost`, time: relativeDate(lead.lostDate), dot })
      } else if (lead.stage === 'meeting') {
        events.push({ id: `meeting-${lead.id}`, text: `Scheduled a meeting with ${lead.business}`, time: relativeDate(lead.addedDate), dot })
      } else if (lead.stage === 'proposal') {
        events.push({ id: `proposal-${lead.id}`, text: `Sent a proposal to ${lead.business}`, time: relativeDate(lead.addedDate), dot })
      }
      events.push({ id: `added-${lead.id}`, text: `Added a new lead: ${lead.business}`, time: relativeDate(lead.addedDate), dot })
    }
    return events.slice(0, 10)
  }, [myLeads, callerId])

  const userName = user?.user_metadata?.full_name
    ?? (user?.email ? CALLER_EMAIL_MAP[user.email] : null)
    ?? user?.email?.split('@')[0]
    ?? 'Caller'

  const navTabs = [
    { label: 'Dashboard', path: '/dashboard',          active: true  },
    { label: 'Leads',     path: '/dashboard/leads',    active: false },
    { label: 'Rejected',  path: '/dashboard/rejected', active: false },
    { label: 'Clients',   path: '/dashboard/clients',  active: false },
    { label: 'Calendar',  path: '/dashboard/calendar', active: false },
    { label: 'Scripts',   path: '/dashboard/scripts',  active: false },
  ]

  return (
    <>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}</style>

      <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: c.bg2, color: c.text, fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif', transition: 'background 0.3s ease, color 0.3s ease' }}>

        {/* Nav */}
        <header style={{ height: 64, flexShrink: 0, display: 'flex', alignItems: 'stretch', padding: '0 32px', background: c.bg2, borderBottom: `1px solid ${c.border}`, transition: 'background 0.3s ease, border-color 0.3s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginRight: 32 }}>
            <span style={{ color: c.accent, fontSize: 13, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Agency</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'stretch' }}>
            {navTabs.map(tab => (
              <button key={tab.path} onClick={() => navigate(tab.path)} style={{ display: 'flex', alignItems: 'center', padding: '0 16px', fontSize: 13, fontWeight: tab.active ? 600 : 500, color: tab.active ? c.accent : c.muted, background: 'none', border: 'none', cursor: 'pointer', borderBottom: tab.active ? `2px solid ${c.accent}` : '2px solid transparent', transition: 'color 0.15s ease, border-color 0.15s ease' }}>
                {tab.label}
              </button>
            ))}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, border: `1px solid ${c.border}`, background: c.bg3, color: c.textSecond, cursor: 'pointer', transition: 'background 0.3s ease' }}>
              {theme === 'light' ? <MoonIcon /> : <SunIcon />}
            </button>
            <div style={{ width: 1, height: 20, background: c.border }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: c.textSecond }}>{userName}</span>
            <button
              onClick={async () => { await signOut(); navigate('/login') }}
              onMouseEnter={() => setSignOutHov(true)}
              onMouseLeave={() => setSignOutHov(false)}
              style={{ fontSize: 13, fontWeight: 500, color: signOutHov ? c.danger : c.muted, background: signOutHov ? `${c.danger}14` : 'transparent', border: 'none', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', transition: 'color 0.15s ease, background 0.15s ease' }}
            >Sign out</button>
          </div>
        </header>

        {/* Body */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* Main */}
          <main style={{ flex: 1, overflow: 'hidden', padding: '24px 28px' }}>

            <div style={{ marginBottom: 20, animation: 'fadeSlideUp 0.4s ease both', animationDelay: '0s' }}>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: c.text, letterSpacing: '-0.02em' }}>Dashboard</h1>
              <p style={{ margin: '4px 0 0', fontSize: 14, color: c.muted }}>Your personal performance</p>
            </div>

            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              <StatCard label="Revenue MTD"   value={`$${stats.revenueMTD.toLocaleString()}`} sub="month to date" accent c={c} delay="0.05s" />
              <StatCard label="Deals Won"     value={String(stats.totalWon)}                  sub="all time"          c={c} delay="0.10s" />
              <StatCard label="Closed"        value={String(stats.dealsThisWeek)}             sub="this week"         c={c} delay="0.15s" />
              <StatCard label="In Pipeline"   value={String(stats.inPipeline)}                sub="active leads"      c={c} delay="0.20s" />
            </div>

            {/* My stats card */}
            <div style={{ marginTop: 20, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 20, padding: 20, animation: 'fadeSlideUp 0.4s ease both', animationDelay: '0.25s', transition: 'background 0.3s ease, border-color 0.3s ease' }}>
              <p style={{ margin: 0, color: c.muted, fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>My Performance</p>
              <h2 style={{ margin: '4px 0 20px', fontSize: 22, fontWeight: 800, color: c.text, letterSpacing: '-0.02em' }}>Stats Overview</h2>

              {caller ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px', borderRadius: 14, background: `${caller.color}0e` }}>
                  {/* Rank badge */}
                  <div style={{ width: 36, textAlign: 'center', fontSize: 22, fontWeight: 800, color: myRank === 1 ? c.accent : c.textSecond, flexShrink: 0 }}>
                    {myRank ?? '—'}
                  </div>
                  {/* Avatar */}
                  <div style={{ width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, flexShrink: 0, background: `linear-gradient(135deg, ${caller.color}, ${caller.colorEnd})`, color: '#fff' }}>
                    {caller.name[0]}
                  </div>
                  {/* Name */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: c.text }}>{caller.name}</span>
                      {myRank === 1 && <span style={{ fontSize: 14 }}>👑</span>}
                    </div>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: c.muted }}>
                      Rank #{myRank ?? '—'} of {CALLERS.length} callers
                    </p>
                  </div>
                  {/* Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, auto)', gap: '0 32px', textAlign: 'right' }}>
                    {[
                      { label: 'Won',     value: String(stats.totalWon) },
                      { label: 'Revenue', value: `$${leads.filter(l => l.callerId === callerId && l.stage === 'won').reduce((s, l) => s + (l.dealValue ?? 0), 0).toLocaleString()}` },
                      { label: 'Avg Deal', value: `$${stats.avgDeal.toLocaleString()}` },
                    ].map(s => (
                      <div key={s.label}>
                        <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: c.accent, lineHeight: 1 }}>{s.value}</p>
                        <p style={{ margin: '3px 0 0', fontSize: 10, color: c.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p style={{ color: c.muted, fontSize: 13 }}>Loading…</p>
              )}
            </div>
          </main>

          {/* Sidebar */}
          <aside style={{ width: 320, flexShrink: 0, borderLeft: `1px solid ${c.border}`, background: c.bg2, overflow: 'hidden', padding: 24, transition: 'background 0.3s ease, border-color 0.3s ease' }}>

            {/* Follow-ups */}
            <div style={{ animation: 'fadeSlideUp 0.4s ease both', animationDelay: '0.15s' }}>
              <p style={{ margin: '0 0 16px', color: c.muted, fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Follow-ups Due</p>
              {allFollowups.length === 0 ? (
                <p style={{ fontSize: 13, color: c.muted, textAlign: 'center', padding: '16px 0' }}>No follow-ups yet</p>
              ) : (
                <div>
                  {allFollowups.map((item, i) => (
                    <FollowUpRow
                      key={item.id} item={item} c={c}
                      last={i === allFollowups.length - 1}
                      onDelete={id => setLocalFollowups(prev => prev.filter(f => f.id !== id))}
                    />
                  ))}
                </div>
              )}
              <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
                <input
                  value={newFollowupText}
                  onChange={e => setNewFollowupText(e.target.value)}
                  placeholder="Add follow-up…"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newFollowupText.trim()) {
                      setLocalFollowups(prev => [...prev, { id: Date.now().toString(), task: newFollowupText.trim(), due: 'Due today', assignee: '', status: 'today', source: 'local' }])
                      setNewFollowupText('')
                    }
                  }}
                  style={{ flex: 1, padding: '6px 10px', fontSize: 12, background: c.bg3, border: `1px solid ${c.border}`, borderRadius: 8, color: c.text, outline: 'none', fontFamily: '"Plus Jakarta Sans", sans-serif' }}
                />
                <button
                  onClick={() => {
                    if (!newFollowupText.trim()) return
                    setLocalFollowups(prev => [...prev, { id: Date.now().toString(), task: newFollowupText.trim(), due: 'Due today', assignee: '', status: 'today', source: 'local' }])
                    setNewFollowupText('')
                  }}
                  style={{ padding: '6px 12px', fontSize: 11, fontWeight: 600, background: c.accent, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}
                >Add</button>
              </div>
            </div>

            <div style={{ height: 1, background: c.border, margin: '14px 0' }} />

            {/* Recent Activity */}
            <div style={{ animation: 'fadeSlideUp 0.4s ease both', animationDelay: '0.20s' }}>
              <p style={{ margin: '0 0 16px', color: c.muted, fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Recent Activity</p>
              {activityItems.length === 0 ? (
                <p style={{ fontSize: 13, color: c.muted, textAlign: 'center', padding: '16px 0' }}>No activity yet</p>
              ) : (
                <div>
                  {activityItems.map((item, i) => (
                    <ActivityRow key={item.id} item={item} c={c} last={i === activityItems.length - 1} />
                  ))}
                </div>
              )}
            </div>

          </aside>
        </div>
      </div>
    </>
  )
}
