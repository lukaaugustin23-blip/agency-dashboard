import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { signOut, getUserRole } from '../lib/auth'
import type { User } from '@supabase/supabase-js'
import { CALLERS, CALLER_COLOR_BY_ID } from '../data/mockData'
import type { RejectionReason } from '../data/mockData'
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

const REASON_COLORS: Record<RejectionReason, { bg: string; text: string }> = {
  'No Budget':             { bg: '#fef2f2', text: '#ef4444' },
  'Not Interested':        { bg: '#fffbeb', text: '#d97706' },
  'Went with Competitor':  { bg: '#fff7ed', text: '#ea580c' },
  'Bad Timing':            { bg: '#f8fafc', text: '#64748b' },
  'Other':                 { bg: '#f1f5f9', text: '#94a3b8' },
}

const REASON_COLORS_DARK: Record<RejectionReason, { bg: string; text: string }> = {
  'No Budget':             { bg: '#3f1212', text: '#f87171' },
  'Not Interested':        { bg: '#3f2e0a', text: '#fbbf24' },
  'Went with Competitor':  { bg: '#3f1f0a', text: '#fb923c' },
  'Bad Timing':            { bg: '#1e1e26', text: '#64748b' },
  'Other':                 { bg: '#16161a', text: '#64748b' },
}

const REJECTION_REASONS: RejectionReason[] = ['No Budget', 'Not Interested', 'Went with Competitor', 'Bad Timing', 'Other']

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

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

// ── Rejected Row ──────────────────────────────────────────────────────

function RejectedRow({ lead, c, theme, isAdmin, onDelete }: {
  lead: { id: string; business: string; type: string; callerId: string; lostDate?: string; lostReason?: string; notes?: string }
  c: C
  theme: Theme
  isAdmin: boolean
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [hov, setHov] = useState(false)
  const reason = (lead.lostReason ?? 'Other') as RejectionReason
  const reasonStyle = theme === 'dark' ? REASON_COLORS_DARK[reason] : REASON_COLORS[reason]
  const callerColor = CALLER_COLOR_BY_ID[lead.callerId] ?? '#94a3b8'
  const callerName = CALLERS.find(c => c.id === lead.callerId)?.name ?? lead.callerId

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, overflow: 'hidden',
        boxShadow: hov ? '0 4px 16px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
        transition: 'box-shadow 0.15s',
      }}
    >
      <div
        onClick={() => setExpanded(v => !v)}
        style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
      >
        {/* Caller avatar */}
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: callerColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: '#fff',
        }}>
          {callerName[0]}
        </div>

        {/* Business info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: c.text, lineHeight: 1.3 }}>{lead.business}</p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: c.muted }}>{lead.type}</p>
        </div>

        {/* Reason pill */}
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
          background: reasonStyle.bg, color: reasonStyle.text, flexShrink: 0,
          letterSpacing: '0.03em',
        }}>
          {reason}
        </span>

        {/* Date */}
        <span style={{ fontSize: 11, color: c.muted, flexShrink: 0 }}>
          {lead.lostDate
            ? new Date(lead.lostDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : '—'}
        </span>

        {/* Expand chevron */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c.muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>

        {isAdmin && (
          <button
            onClick={e => { e.stopPropagation(); onDelete(lead.id) }}
            style={{
              width: 26, height: 26, borderRadius: 7, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: `1px solid ${c.danger}40`,
              color: c.danger, cursor: 'pointer',
            }}
          >
            <TrashIcon />
          </button>
        )}
      </div>

      {expanded && (
        <div style={{ padding: '0 16px 14px', borderTop: `1px solid ${c.border}` }}>
          <div style={{ paddingTop: 12, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Called by</p>
              <p style={{ margin: 0, fontSize: 13, color: c.textSecond }}>{callerName}</p>
            </div>
            {lead.notes && (
              <div style={{ flex: 2 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Notes</p>
                <p style={{ margin: 0, fontSize: 13, color: c.textSecond, lineHeight: 1.5 }}>{lead.notes}</p>
              </div>
            )}
            {isAdmin && (
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                {!confirmDelete ? (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: c.danger, background: 'transparent', border: `1px solid ${c.danger}40`, borderRadius: 8, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}
                  >
                    <TrashIcon /> Remove
                  </button>
                ) : (
                  <>
                    <span style={{ fontSize: 12, color: c.textSecond }}>Sure?</span>
                    <button onClick={() => onDelete(lead.id)} style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600, color: '#fff', background: c.danger, border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Yes</button>
                    <button onClick={() => setConfirmDelete(false)} style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600, color: c.textSecond, background: 'transparent', border: `1px solid ${c.border}`, borderRadius: 8, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>No</button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────

export default function Rejected() {
  const navigate = useNavigate()
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('agency-theme') as Theme) ?? 'light')
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<'admin' | 'caller' | null>(null)
  const [callerName, setCallerName] = useState<string | null>(null)
  const [signOutHov, setSignOutHov] = useState(false)
  const [search, setSearch] = useState('')
  const [filterReason, setFilterReason] = useState<RejectionReason | null>(null)
  const { leads, deleteLead } = useAppData()

  const c = THEMES[theme]
  const isAdminPath = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')
  const isAdmin = role !== null ? role === 'admin' : isAdminPath

  useEffect(() => { localStorage.setItem('agency-theme', theme) }, [theme])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null
      setUser(u)
      if (u?.email) {
        const r = getUserRole(u.email)
        setRole(r)
        if (r === 'caller') {
          const found = CALLERS.find(c => c.email === u.email)
          setCallerName(found?.name ?? null)
        }
      }
    })
  }, [])

  const callerIdFilter = callerName ? CALLERS.find(c => c.name === callerName)?.id ?? null : null

  const rejectedLeads = leads.filter(l => {
    if (l.stage !== 'lost') return false
    if (!isAdmin && callerIdFilter && l.callerId !== callerIdFilter) return false
    return true
  })

  const filtered = rejectedLeads.filter(l => {
    if (search && !l.business.toLowerCase().includes(search.toLowerCase())) return false
    if (filterReason && l.lostReason !== filterReason) return false
    return true
  })

  const today = new Date()
  const currentYM = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const thisMonthCount = rejectedLeads.filter(l => l.lostDate?.startsWith(currentYM)).length

  const reasonCounts = REJECTION_REASONS.map(r => ({
    reason: r,
    count: rejectedLeads.filter(l => l.lostReason === r).length,
  }))
  const topReason = reasonCounts.reduce((best, curr) => curr.count > best.count ? curr : best, { reason: 'N/A' as RejectionReason, count: 0 })

  const userName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'User'

  const navTabs = isAdmin
    ? [
        { label: 'Dashboard',     path: '/admin',           active: false },
        { label: 'Sales Finance', path: '/admin/finances',  active: false },
        { label: 'Leads',         path: '/admin/leads',     active: false },
        { label: 'Rejected',      path: '/admin/rejected',  active: true  },
        { label: 'Clients',       path: '/admin/clients',   active: false },
        { label: 'Calendar',      path: '/admin/calendar',  active: false },
        { label: 'Scripts',       path: '/admin/scripts',   active: false },
      ]
    : [
        { label: 'Dashboard',     path: '/dashboard',              active: window.location.pathname === '/dashboard' },
        { label: 'Sales Finance', path: '/dashboard/finances',     active: window.location.pathname === '/dashboard/finances' },
        { label: 'Leads',         path: '/dashboard/leads',        active: window.location.pathname === '/dashboard/leads' },
        { label: 'Rejected',      path: '/dashboard/rejected',     active: window.location.pathname === '/dashboard/rejected' },
        { label: 'Clients',       path: '/dashboard/clients',      active: window.location.pathname === '/dashboard/clients' },
        { label: 'Calendar',      path: '/dashboard/calendar',     active: window.location.pathname === '/dashboard/calendar' },
        { label: 'Scripts',       path: '/dashboard/scripts',      active: window.location.pathname === '/dashboard/scripts' },
      ]

  const activeTabColor = '#ef4444'

  return (
    <>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}</style>

      <div style={{
        width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        background: c.bg2, color: c.text,
        fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif',
        transition: 'background 0.3s ease, color 0.3s ease',
      }}>

        {/* Nav */}
        <header style={{ height: 64, flexShrink: 0, display: 'flex', alignItems: 'stretch', padding: '0 32px', background: c.bg2, borderBottom: `1px solid ${c.border}`, transition: 'background 0.3s ease, border-color 0.3s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginRight: 32 }}>
            <span style={{ color: c.accent, fontSize: 13, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Agency</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'stretch' }}>
            {navTabs.map(tab => (
              <button key={tab.path} onClick={() => navigate(tab.path)} style={{ display: 'flex', alignItems: 'center', padding: '0 16px', fontSize: 13, fontWeight: tab.active ? 600 : 500, color: tab.active ? activeTabColor : c.muted, background: 'none', border: 'none', cursor: 'pointer', borderBottom: tab.active ? `2px solid ${activeTabColor}` : '2px solid transparent', transition: 'color 0.15s ease, border-color 0.15s ease' }}>
                {tab.label}
              </button>
            ))}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            {isAdmin && (
              <button
                onClick={() => navigate('/admin/panel')}
                title="Admin Panel"
                style={{
                  width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 10, border: `1px solid ${c.border}`, background: c.bg3, color: c.textSecond,
                  cursor: 'pointer', transition: 'background 0.3s ease, border-color 0.3s ease',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
            )}
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

        {/* Main */}
        <main style={{ flex: 1, overflow: 'hidden', padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Header */}
          <div style={{ animation: 'fadeSlideUp 0.4s ease both', flexShrink: 0 }}>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: c.text, letterSpacing: '-0.02em' }}>Rejected Leads</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: c.muted }}>Businesses that said no — tracked for follow-ups</p>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, flexShrink: 0, animation: 'fadeSlideUp 0.4s ease both', animationDelay: '0.05s' }}>
            {[
              { label: 'Total Rejected', value: String(rejectedLeads.length), sub: 'all time' },
              { label: 'This Month',     value: String(thisMonthCount),        sub: 'rejections' },
              { label: 'Top Reason',     value: topReason.count > 0 ? topReason.reason : 'N/A', sub: topReason.count > 0 ? `${topReason.count} occurrences` : 'no data' },
            ].map((s, i) => (
              <div key={i} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 14, padding: '16px 20px' }}>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</p>
                <p style={{ margin: '6px 0 0', fontSize: 26, fontWeight: 800, color: '#ef4444', letterSpacing: '-0.02em', lineHeight: 1 }}>{s.value}</p>
                <p style={{ margin: '6px 0 0', fontSize: 11, color: c.muted }}>{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Search + filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, animation: 'fadeSlideUp 0.4s ease both', animationDelay: '0.10s' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: c.muted, pointerEvents: 'none' }}>
                <SearchIcon />
              </span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search businesses…"
                style={{ width: '100%', padding: '8px 12px 8px 32px', fontSize: 13, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 9, color: c.text, outline: 'none', fontFamily: '"Plus Jakarta Sans", sans-serif', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => setFilterReason(null)}
                style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, borderRadius: 8, border: filterReason === null ? 'none' : `1px solid ${c.border}`, background: filterReason === null ? '#ef4444' : c.bg3, color: filterReason === null ? '#fff' : c.textSecond, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}
              >All</button>
              {REJECTION_REASONS.map(r => {
                const active = filterReason === r
                return (
                  <button
                    key={r}
                    onClick={() => setFilterReason(active ? null : r)}
                    style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, borderRadius: 8, border: active ? 'none' : `1px solid ${c.border}`, background: active ? '#ef4444' : c.bg3, color: active ? '#fff' : c.textSecond, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}
                  >{r}</button>
                )
              })}
            </div>
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, animation: 'fadeSlideUp 0.4s ease both', animationDelay: '0.15s' }}>
            {filtered.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.muted, fontSize: 14 }}>
                {rejectedLeads.length === 0 ? 'No rejected leads yet' : 'No results for this filter'}
              </div>
            ) : (
              filtered.map(lead => (
                <RejectedRow
                  key={lead.id}
                  lead={lead}
                  c={c}
                  theme={theme}
                  isAdmin={isAdmin}
                  onDelete={deleteLead}
                />
              ))
            )}
          </div>
        </main>
      </div>
    </>
  )
}
