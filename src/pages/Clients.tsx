import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { signOut, getUserRole } from '../lib/auth'
import type { User } from '@supabase/supabase-js'
import { CALLERS, CALLER_COLOR_BY_ID } from '../data/mockData'
import type { ClientServices, ClientStatus, ClientRecord } from '../data/mockData'
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

const STATUS_CONFIG: Record<ClientStatus, { label: string; color: string }> = {
  active:       { label: 'Active',       color: '#10b981' },
  completed:    { label: 'Completed',    color: '#3b82f6' },
  upsell_ready: { label: 'Upsell Ready', color: '#f59e0b' },
}

const SERVICE_LABELS: Record<keyof ClientServices, string> = {
  website:     'Website',
  seo:         'SEO',
  mcp:         'Content Plan',
  socialMedia: 'Social Media',
  branding:    'Branding',
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

function PhoneIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

// ── Client Card ────────────────────────────────────────────────────────

function ClientCard({ business, type, contact, phone, callerId, closedDate, dealValue, record, c, isAdmin, onUpdateRecord }: {
  business: string
  type: string
  contact: string
  phone?: string
  callerId: string
  closedDate?: string
  dealValue?: number
  record: ClientRecord
  c: C
  isAdmin: boolean
  onUpdateRecord: (patch: Partial<ClientRecord>) => void
}) {
  const navigate = useNavigate()
  const [hov, setHov] = useState(false)
  const [localNotes, setLocalNotes] = useState(record.notes)
  const callerColor = CALLER_COLOR_BY_ID[callerId] ?? '#94a3b8'
  const callerDisplayName = CALLERS.find(c => c.id === callerId)?.name ?? callerId
  const statusCfg = STATUS_CONFIG[record.status]

  const canEdit = isAdmin

  function toggleService(key: keyof ClientServices) {
    if (!canEdit) return
    onUpdateRecord({ services: { ...record.services, [key]: !record.services[key] } })
  }

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16, padding: 20,
        boxShadow: hov ? '0 8px 24px rgba(0,0,0,0.1)' : '0 1px 4px rgba(0,0,0,0.05)',
        transition: 'box-shadow 0.2s, transform 0.2s',
        transform: hov ? 'translateY(-2px)' : 'translateY(0)',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: c.text, lineHeight: 1.3, letterSpacing: '-0.01em' }}>{business}</h3>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: c.muted }}>{type}</p>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
          background: `${statusCfg.color}18`, color: statusCfg.color,
          letterSpacing: '0.04em', flexShrink: 0,
        }}>{statusCfg.label}</span>
      </div>

      {/* Contact + deal info */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {contact && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: c.textSecond }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            <span style={{ fontSize: 12 }}>{contact}</span>
          </div>
        )}
        {phone && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: c.textSecond }}>
            <PhoneIcon />
            <span style={{ fontSize: 12 }}>{phone}</span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: callerColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {callerDisplayName[0]}
          </div>
          <span style={{ fontSize: 12, color: c.textSecond }}>{callerDisplayName}</span>
          {dealValue && (
            <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 800, color: c.success }}>
              ${dealValue.toLocaleString()}
            </span>
          )}
        </div>
        {closedDate && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: c.muted }}>
            <CalendarIcon />
            <span style={{ fontSize: 11 }}>Closed {new Date(closedDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
        )}
      </div>

      <div style={{ height: 1, background: c.border }} />

      {/* Services */}
      <div>
        <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Services</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {(Object.keys(SERVICE_LABELS) as Array<keyof ClientServices>).map(key => {
            const active = record.services[key]
            return (
              <button
                key={key}
                onClick={() => toggleService(key)}
                disabled={!canEdit}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
                  fontSize: 11, fontWeight: 600, borderRadius: 8,
                  border: active ? 'none' : `1px solid ${c.border}`,
                  background: active ? `${c.accent}18` : c.bg3,
                  color: active ? c.accent : c.muted,
                  cursor: canEdit ? 'pointer' : 'default',
                  transition: 'background 0.15s, color 0.15s',
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                }}
              >
                {active && <span style={{ fontSize: 10 }}>✓</span>}
                {SERVICE_LABELS[key]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Notes */}
      <div>
        <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Notes</p>
        <textarea
          value={localNotes}
          onChange={e => setLocalNotes(e.target.value)}
          onBlur={() => { if (canEdit) onUpdateRecord({ notes: localNotes }) }}
          readOnly={!canEdit}
          rows={2}
          placeholder={canEdit ? 'Add notes…' : 'No notes'}
          style={{
            width: '100%', padding: '8px 10px', fontSize: 12, lineHeight: 1.5,
            background: c.bg2, border: `1px solid ${c.border}`, borderRadius: 8,
            color: c.textSecond, resize: 'none', outline: 'none',
            fontFamily: '"Plus Jakarta Sans", sans-serif',
            cursor: canEdit ? 'text' : 'default', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Status (admin only in edit mode) + Follow-up button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {canEdit && (
          <select
            value={record.status}
            onChange={e => onUpdateRecord({ status: e.target.value as ClientStatus })}
            style={{
              flex: 1, padding: '7px 10px', fontSize: 12, fontWeight: 600,
              background: c.bg2, border: `1px solid ${c.border}`, borderRadius: 8,
              color: statusCfg.color, cursor: 'pointer', outline: 'none',
              fontFamily: '"Plus Jakarta Sans", sans-serif',
            }}
          >
            {(Object.entries(STATUS_CONFIG) as [ClientStatus, { label: string; color: string }][]).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        )}
        <button
          onClick={() => navigate(window.location.pathname.startsWith('/admin') ? '/admin/calendar' : '/dashboard/calendar')}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '7px 14px', fontSize: 12, fontWeight: 600,
            background: `${c.accent}14`, color: c.accent,
            border: `1px solid ${c.accent}30`, borderRadius: 8,
            cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif',
          }}
        >
          <CalendarIcon /> Follow-up
        </button>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────

export default function Clients() {
  const navigate = useNavigate()
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('agency-theme') as Theme) ?? 'light')
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<'admin' | 'caller' | null>(null)
  const [callerName, setCallerName] = useState<string | null>(null)
  const [signOutHov, setSignOutHov] = useState(false)
  const { leads, clientData, updateClientData } = useAppData()

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

  const clientLeads = leads.filter(l => {
    if (l.stage !== 'won') return false
    if (!isAdmin && callerIdFilter && l.callerId !== callerIdFilter) return false
    return true
  })

  const totalRevenue = clientLeads.reduce((s, l) => s + (l.dealValue ?? 0), 0)
  const activeCount = clientLeads.filter(l => clientData[l.id]?.status === 'active').length
  const upsellCount = clientLeads.filter(l => clientData[l.id]?.status === 'upsell_ready').length

  const userName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'User'

  const navTabs = isAdmin
    ? [
        { label: 'Dashboard',     path: '/admin',           active: false },
        { label: 'Sales Finance', path: '/admin/finances',  active: false },
        { label: 'Leads',         path: '/admin/leads',     active: false },
        { label: 'Rejected',      path: '/admin/rejected',  active: false },
        { label: 'Clients',       path: '/admin/clients',   active: true  },
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

  const defaultRecord: ClientRecord = {
    services: { website: false, seo: false, mcp: false, socialMedia: false, branding: false },
    notes: '', status: 'active', lastContact: '',
  }

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
              <button key={tab.path} onClick={() => navigate(tab.path)} style={{ display: 'flex', alignItems: 'center', padding: '0 16px', fontSize: 13, fontWeight: tab.active ? 600 : 500, color: tab.active ? c.success : c.muted, background: 'none', border: 'none', cursor: 'pointer', borderBottom: tab.active ? `2px solid ${c.success}` : '2px solid transparent', transition: 'color 0.15s ease, border-color 0.15s ease' }}>
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
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: c.text, letterSpacing: '-0.02em' }}>Clients</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: c.muted }}>Won deals — manage relationships and services</p>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, flexShrink: 0, animation: 'fadeSlideUp 0.4s ease both', animationDelay: '0.05s' }}>
            {[
              { label: 'Active Clients',  value: String(activeCount),                     sub: 'currently active' },
              { label: 'Total Revenue',   value: `$${totalRevenue.toLocaleString()}`,      sub: 'all won deals' },
              { label: 'Upsell Ready',    value: String(upsellCount),                     sub: 'potential upsells' },
            ].map((s, i) => (
              <div key={i} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 14, padding: '16px 20px' }}>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</p>
                <p style={{ margin: '6px 0 0', fontSize: 26, fontWeight: 800, color: c.success, letterSpacing: '-0.02em', lineHeight: 1 }}>{s.value}</p>
                <p style={{ margin: '6px 0 0', fontSize: 11, color: c.muted }}>{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Client cards grid */}
          <div style={{
            flex: 1, overflowY: 'auto',
            display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, alignContent: 'start',
            animation: 'fadeSlideUp 0.4s ease both', animationDelay: '0.10s',
          }}>
            {clientLeads.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.muted, fontSize: 14, minHeight: 120 }}>
                No clients yet — close a deal in Leads!
              </div>
            ) : (
              clientLeads.map(lead => (
                <ClientCard
                  key={lead.id}
                  business={lead.business}
                  type={lead.type}
                  contact={lead.contact}
                  phone={lead.phone}
                  callerId={lead.callerId}
                  closedDate={lead.closedDate}
                  dealValue={lead.dealValue}
                  record={clientData[lead.id] ?? defaultRecord}
                  c={c}
                  isAdmin={isAdmin}
                  onUpdateRecord={patch => updateClientData(lead.id, patch)}
                />
              ))
            )}
          </div>
        </main>
      </div>
    </>
  )
}
