import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { supabase } from '../lib/supabase'
import { signOut } from '../lib/auth'
import type { User } from '@supabase/supabase-js'
import { CALLERS, ADMINS } from '../data/mockData'
import type { Caller } from '../data/mockData'
import { useAppData } from '../contexts/AppDataContext'

const LAUNCH_DATE = '2026-05-16'
const LAUNCH_MS = new Date(LAUNCH_DATE + 'T00:00:00').getTime()

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

type CallerStats = Caller & { deals: number; total: number; earned: number; conversion: number }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MultiTooltip({ active, payload, label, c }: any) {
  if (!active || !payload?.length) return null
  const totalDays = (Date.now() - LAUNCH_MS) / 86400000
  let formattedLabel = String(label)
  if (typeof label === 'number') {
    const d = new Date(label)
    if (totalDays < 1) {
      formattedLabel = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    } else {
      formattedLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }
  }
  return (
    <div style={{
      background: c.bg2, border: `1px solid ${c.border}`, borderRadius: 12,
      padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
      fontFamily: '"Plus Jakarta Sans", sans-serif', minWidth: 160,
    }}>
      <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{formattedLabel}</p>
      {payload.map((entry: { dataKey: string; color: string; value: number }) => (
        <div key={entry.dataKey} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: c.textSecond }}>{entry.dataKey}</span>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: entry.color }}>${Number(entry.value).toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
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

function CallerCard({ caller, c, delay }: {
  caller: CallerStats; c: C; delay: string
}) {
  const [hov, setHov] = useState(false)

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        flex: 1, background: c.bg2, border: `1px solid ${c.border}`, borderRadius: 16, padding: 20,
        boxShadow: hov ? '0 8px 24px rgba(0,0,0,0.12)' : '0 1px 4px rgba(0,0,0,0.06)',
        transform: hov ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease, background 0.3s ease, border-color 0.3s ease',
        animation: 'fadeSlideUp 0.4s ease both', animationDelay: delay,
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: '50%', marginBottom: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 700, color: '#fff',
        background: `linear-gradient(135deg, ${caller.color}, ${caller.colorEnd})`,
      }}>
        {caller.name[0]}
      </div>

      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: c.text }}>{caller.name}</p>
      <p style={{ margin: '2px 0 12px', fontSize: 12, color: c.muted }}>{caller.feePercent}% per deal</p>

      <div style={{ height: 1, background: c.border, marginBottom: 12 }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Deals</p>
          <p style={{ margin: '3px 0 0', fontSize: 24, fontWeight: 800, color: c.text, lineHeight: 1 }}>{caller.deals}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Earned</p>
          <p style={{ margin: '3px 0 0', fontSize: 24, fontWeight: 800, color: caller.color, lineHeight: 1 }}>
            ${caller.earned.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Conversion rate */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Conversion</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: caller.color }}>{caller.conversion}%</span>
        </div>
        <div style={{ height: 4, background: c.bg3, borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 99,
            width: `${caller.conversion}%`,
            background: `linear-gradient(90deg, ${caller.color}, ${caller.colorEnd})`,
            transition: 'width 0.6s ease',
          }} />
        </div>
        <p style={{ margin: '4px 0 0', fontSize: 10, color: c.muted }}>{caller.deals} of {caller.total} leads</p>
      </div>
    </div>
  )
}

export default function Finances() {
  const navigate = useNavigate()
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('agency-theme') as Theme) ?? 'light')
  const [user, setUser] = useState<User | null>(null)
  const [signOutHov, setSignOutHov] = useState(false)
  const { leads, callerFees } = useAppData()
  const isAdminPath = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')
  const isAdmin = isAdminPath

  const c = THEMES[theme]

  const callerStats: CallerStats[] = useMemo(() => CALLERS.map(caller => {
    const callerLeads = leads.filter(l => l.callerId === caller.id)
    const wonLeads = callerLeads.filter(l => l.stage === 'won')
    const deals = wonLeads.length
    const total = callerLeads.length
    const revenue = wonLeads.reduce((s, l) => s + (l.dealValue ?? 0), 0)
    const effectiveFee = callerFees[caller.id] ?? caller.feePercent
    return {
      ...caller,
      feePercent: effectiveFee,
      deals,
      total,
      earned: Math.round(revenue * effectiveFee / 100),
      conversion: total > 0 ? Math.round(deals / total * 100) : 0,
    }
  }), [leads, callerFees])

  const adminStats = useMemo(() => {
    const adminIds = new Set([...ADMINS.map(a => a.id), 'admin'])
    const adminWon = leads.filter(l => adminIds.has(l.callerId) && l.stage === 'won')
    const totalAdminRevenue = adminWon.reduce((s, l) => s + (l.dealValue ?? 0), 0)
    const eachFinderEarns = Math.round(totalAdminRevenue * 0.10) // 20% pool split equally = 10% each
    const totalDeals = adminWon.length
    return ADMINS.map(admin => ({
      ...admin,
      deals: totalDeals,
      finderEarnings: eachFinderEarns,
    }))
  }, [leads])

  const { chartData, dotTimestamps, dateRangeLabel, xTicks, nowMs } = useMemo(() => { // eslint-disable-line
    const now = new Date()
    const nowMs = now.getTime()
    const daysSinceLaunch = (nowMs - LAUNCH_MS) / 86400000

    const wonLeads = leads.filter(l => l.stage === 'won' && l.closedDate)

    // Base values = earnings from deals closed BEFORE launch day
    const preLaunch: Record<string, number> = {}
    CALLERS.forEach(caller => {
      const fee = callerFees[caller.id] ?? caller.feePercent
      preLaunch[caller.name] = wonLeads
        .filter(l => l.callerId === caller.id && l.closedDate! < LAUNCH_DATE)
        .reduce((s, l) => s + Math.round((l.dealValue ?? 0) * fee / 100), 0)
    })

    const postDeals = wonLeads.filter(l => l.closedDate! >= LAUNCH_DATE)
    const dotTimestamps = new Set(
      postDeals.map(l => new Date(l.closedDate! + 'T12:00:00').getTime())
    )

    // Smart tick generation
    const xTicks: number[] = []
    if (daysSinceLaunch < 1) {
      for (let h = 0; h <= 21; h += 3) {
        const t = LAUNCH_MS + h * 3600000
        if (t <= nowMs) xTicks.push(t)
      }
    } else if (daysSinceLaunch <= 14) {
      for (let d = 0; LAUNCH_MS + d * 86400000 <= nowMs + 86400000; d++) {
        xTicks.push(LAUNCH_MS + d * 86400000)
      }
    } else if (daysSinceLaunch <= 60) {
      for (let d = 0; LAUNCH_MS + d * 86400000 <= nowMs + 7 * 86400000; d += 7) {
        xTicks.push(LAUNCH_MS + d * 86400000)
      }
    } else {
      const cur = new Date(LAUNCH_MS)
      while (cur.getTime() <= nowMs + 30 * 86400000) {
        xTicks.push(cur.getTime())
        cur.setMonth(cur.getMonth() + 1)
      }
    }

    // Data points: tick positions + deal events + now
    const allMs = [...new Set([LAUNCH_MS, ...xTicks, ...dotTimestamps, nowMs])].sort((a, b) => a - b)

    const chartData = allMs.map(ts => {
      const row: Record<string, string | number> = { ts }
      CALLERS.forEach(caller => {
        const fee = callerFees[caller.id] ?? caller.feePercent
        row[caller.name] = preLaunch[caller.name] + postDeals
          .filter(l => l.callerId === caller.id && new Date(l.closedDate! + 'T12:00:00').getTime() <= ts)
          .reduce((s, l) => s + Math.round((l.dealValue ?? 0) * fee / 100), 0)
      })
      return row
    })

    const fmtTime = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    const dateRangeLabel = `May 16 – ${fmtTime}`

    return { chartData, dotTimestamps, dateRangeLabel, xTicks, nowMs }
  }, [leads, callerFees])

  const tickFormatter = (ts: number) => {
    if (typeof ts !== 'number') return ''
    const d = new Date(ts)
    const totalDays = (Date.now() - LAUNCH_MS) / 86400000
    if (totalDays < 1) {
      const h = d.getHours()
      if (h === 0) return '12AM'
      if (h === 12) return '12PM'
      return h > 12 ? `${h - 12}PM` : `${h}AM`
    } else if (totalDays <= 60) {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
    return d.toLocaleDateString('en-US', { month: 'short' })
  }

  useEffect(() => { localStorage.setItem('agency-theme', theme) }, [theme])
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
  }, [])

  const userName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'Admin'
  const axisStyle = { fill: c.muted, fontSize: 11, fontFamily: '"Plus Jakarta Sans", sans-serif' }

  return (
    <>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}</style>

      <div style={{
        width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        background: c.bg2, color: c.text,
        fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif',
        transition: 'background 0.3s ease, color 0.3s ease',
      }}>

        {/* ── Nav ── */}
        <header style={{
          height: 64, flexShrink: 0, display: 'flex', alignItems: 'stretch',
          padding: '0 32px', background: c.bg2, borderBottom: `1px solid ${c.border}`,
          transition: 'background 0.3s ease, border-color 0.3s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginRight: 32 }}>
            <span style={{ color: c.accent, fontSize: 13, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Agency</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
            {(isAdminPath ? [
              { label: 'Dashboard',     path: '/admin',           active: false },
              { label: 'Sales Finance', path: '/admin/finances',  active: true  },
              { label: 'Leads',         path: '/admin/leads',     active: false },
              { label: 'Rejected',      path: '/admin/rejected',  active: false },
              { label: 'Clients',       path: '/admin/clients',   active: false },
              { label: 'Calendar',      path: '/admin/calendar',  active: false },
              { label: 'Scripts',       path: '/admin/scripts',   active: false },
              { label: 'Panel',         path: '/admin/panel',     active: false },
            ] : [
              { label: 'Dashboard',     path: '/dashboard',              active: window.location.pathname === '/dashboard' },
              { label: 'Sales Finance', path: '/dashboard/finances',     active: window.location.pathname === '/dashboard/finances' },
              { label: 'Leads',         path: '/dashboard/leads',        active: window.location.pathname === '/dashboard/leads' },
              { label: 'Rejected',      path: '/dashboard/rejected',     active: window.location.pathname === '/dashboard/rejected' },
              { label: 'Clients',       path: '/dashboard/clients',      active: window.location.pathname === '/dashboard/clients' },
              { label: 'Calendar',      path: '/dashboard/calendar',     active: window.location.pathname === '/dashboard/calendar' },
              { label: 'Scripts',       path: '/dashboard/scripts',      active: window.location.pathname === '/dashboard/scripts' },
            ]).map(tab => (
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
                }}
              >
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
              onClick={async () => { await signOut(); navigate('/login') }}
              onMouseEnter={() => setSignOutHov(true)}
              onMouseLeave={() => setSignOutHov(false)}
              style={{
                fontSize: 13, fontWeight: 500,
                color: signOutHov ? c.danger : c.muted,
                background: signOutHov ? `${c.danger}14` : 'transparent',
                border: 'none', padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
                transition: 'color 0.15s ease, background 0.15s ease',
              }}
            >
              Sign out
            </button>
          </div>
        </header>

        {/* ── Main ── */}
        <main style={{
          flex: 1, overflow: 'hidden', padding: '16px 24px',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>

          {/* Caller performance cards */}
          <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
            {callerStats.map((caller, i) => (
              <CallerCard
                key={caller.name}
                caller={caller}
                c={c}
                delay={`${i * 0.05}s`}
              />
            ))}
          </div>

          {/* Admin-sourced deals */}
          {adminStats.some(a => a.deals > 0) && (
            <div style={{
              flexShrink: 0, background: c.bg, border: `1px solid ${c.border}`,
              borderRadius: 14, padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: 16,
              animation: 'fadeSlideUp 0.4s ease both', animationDelay: '0.22s',
            }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.1em', flexShrink: 0 }}>
                Admin-Sourced
              </p>
              <div style={{ width: 1, height: 20, background: c.border, flexShrink: 0 }} />
              {adminStats.map(admin => (
                <div key={admin.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: `linear-gradient(135deg, ${admin.color}, ${admin.colorEnd})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: '#fff',
                  }}>{admin.name[0]}</div>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{admin.name}</span>
                    <span style={{ fontSize: 12, color: c.muted, marginLeft: 6 }}>
                      {admin.deals} deal{admin.deals !== 1 ? 's' : ''} found
                    </span>
                    {admin.deals > 0 && (
                      <span style={{ fontSize: 12, fontWeight: 700, color: admin.color, marginLeft: 8 }}>
                        +${admin.finderEarnings.toLocaleString()} finder fee
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Earnings over time chart — flex-grow to fill remaining space */}
          <div style={{
            flex: 1, minHeight: 0, background: c.bg, border: `1px solid ${c.border}`,
            borderRadius: 20, padding: '18px 20px 14px', display: 'flex', flexDirection: 'column',
            transition: 'background 0.3s ease, border-color 0.3s ease',
            animation: 'fadeSlideUp 0.4s ease both', animationDelay: '0.25s',
          }}>
            <p style={{ margin: 0, color: c.muted, fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Performance</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: c.text, letterSpacing: '-0.02em' }}>Earnings Over Time</p>
              <p style={{ margin: 0, fontSize: 12, color: c.muted }}>{dateRangeLabel}</p>
            </div>

            {/* Chart */}
            <div style={{ flex: 1, minHeight: 0, marginTop: 12 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -4 }}>
                  <defs>
                    {callerStats.map(caller => (
                      <linearGradient key={caller.name} id={`grad${caller.name}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={caller.color} stopOpacity={0.12} />
                        <stop offset="95%" stopColor={caller.color} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid stroke={c.border} vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="ts"
                    type="number"
                    scale="time"
                    domain={[LAUNCH_MS, nowMs]}
                    ticks={xTicks}
                    tick={axisStyle}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={tickFormatter}
                    dy={6}
                  />
                  <YAxis
                    tick={axisStyle} axisLine={false} tickLine={false}
                    tickFormatter={(v: number) => v >= 1000 ? `$${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : `$${v}`}
                    width={46}
                    domain={[0, 'auto']}
                  />
                  <Tooltip content={<MultiTooltip c={c} />} />
                  {callerStats.map(caller => (
                    <Area
                      key={caller.name}
                      type="monotone"
                      dataKey={caller.name}
                      stroke={caller.color}
                      strokeWidth={3}
                      fill={`url(#grad${caller.name})`}
                      dot={(props: Record<string, unknown>) => {
                        const payload = props.payload as { ts: number }
                        if (!dotTimestamps.has(payload?.ts)) return <g key={String(props.key)} />
                        return (
                          <circle
                            key={String(props.key)}
                            cx={Number(props.cx)} cy={Number(props.cy)}
                            r={5} fill={caller.color}
                          />
                        )
                      }}
                      activeDot={{ fill: caller.color, r: 6, strokeWidth: 0 }}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 20, paddingTop: 10, flexShrink: 0, flexWrap: 'wrap' }}>
              {callerStats.map(caller => (
                <div key={caller.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: caller.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 500, color: c.textSecond }}>{caller.name}</span>
                </div>
              ))}
            </div>
          </div>

        </main>
      </div>
    </>
  )
}
