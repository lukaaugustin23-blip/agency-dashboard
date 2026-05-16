import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { signOut, getUserRole } from '../lib/auth'
import type { User } from '@supabase/supabase-js'
import { CALLER_COLORS, CALLER_EMAIL_MAP, CALLERS_LIST, ADMINS } from '../data/mockData'
import type { Meeting, MeetingType } from '../data/mockData'
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

const ROW_HEIGHT = 56
const START_HOUR = 8
const END_HOUR = 20
const TIME_COL_WIDTH = 52
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)
const GRID_HEIGHT = HOURS.length * ROW_HEIGHT
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MEETING_TYPES: MeetingType[] = ['Discovery Call', 'Demo/Presentation', 'Follow-up', 'Closing']

const TYPE_COLORS: Record<MeetingType, string> = {
  'Discovery Call':    '#0ea5e9',
  'Demo/Presentation': '#6366f1',
  'Follow-up':         '#f59e0b',
  'Closing':           '#10b981',
}

// ── Helpers ───────────────────────────────────────────────────────────

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  d.setHours(0, 0, 0, 0)
  return d
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatTime(h: number, m: number): string {
  const period = h >= 12 ? 'PM' : 'AM'
  const dh = h > 12 ? h - 12 : h === 0 ? 12 : h
  const dm = m === 0 ? '' : `:${String(m).padStart(2, '0')}`
  return `${dh}${dm} ${period}`
}

function formatEndTime(meeting: Meeting): string {
  const [h, m] = meeting.startTime.split(':').map(Number)
  const total = h * 60 + m + meeting.durationMinutes
  return formatTime(Math.floor(total / 60), total % 60)
}

function hourLabel(h: number): string {
  if (h === 12) return '12 PM'
  if (h > 12) return `${h - 12} PM`
  return `${h} AM`
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatMonthYear(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function getMonthDays(monthStart: Date): Date[] {
  const year = monthStart.getFullYear()
  const month = monthStart.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDow = firstDay.getDay()
  const gridStart = addDays(firstDay, startDow === 0 ? -6 : 1 - startDow)
  const endDow = lastDay.getDay()
  const gridEnd = addDays(lastDay, endDow === 0 ? 0 : 7 - endDow)
  const days: Date[] = []
  const d = new Date(gridStart)
  while (d <= gridEnd) { days.push(new Date(d)); d.setDate(d.getDate() + 1) }
  return days
}

const TIME_OPTIONS = Array.from({ length: (END_HOUR - START_HOUR) * 2 }, (_, i) => {
  const h = Math.floor(i / 2) + START_HOUR
  const m = i % 2 === 0 ? 0 : 30
  return { value: `${h}:${String(m).padStart(2, '0')}`, label: formatTime(h, m) }
})

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

function ChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

// ── Meeting Block ─────────────────────────────────────────────────────

function parseST(t: string): [number, number] {
  const [h, m] = t.split(':').map(Number)
  return [h, m]
}

function MeetingBlock({ meeting, c, onClick }: { meeting: Meeting; c: C; onClick: () => void }) {
  const [hov, setHov] = useState(false)
  const [sh, sm] = parseST(meeting.startTime)
  const top = ((sh - START_HOUR) + sm / 60) * ROW_HEIGHT
  const height = Math.max((meeting.durationMinutes / 60) * ROW_HEIGHT - 4, 24)
  const color = CALLER_COLORS[meeting.assignee] ?? c.accent
  const showTime = height >= 38

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: 'absolute', left: 3, right: 3, top: top + 2, height,
        background: `${color}1a`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 6, padding: '4px 6px 4px 8px',
        cursor: 'pointer', overflow: 'hidden',
        boxShadow: hov ? `0 4px 14px ${color}35` : 'none',
        transform: hov ? 'scale(1.015)' : 'scale(1)',
        transition: 'box-shadow 0.15s, transform 0.15s',
        zIndex: 2,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
          {meeting.business}
        </p>
        {showTime && (
          <p style={{ margin: '2px 0 0', fontSize: 10, color: c.muted, whiteSpace: 'nowrap', lineHeight: 1.2 }}>
            {formatTime(sh, sm)}–{formatEndTime(meeting)}
          </p>
        )}
      </div>
      <div style={{
        width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
        background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 7, fontWeight: 700, color: '#fff', marginTop: 1,
      }}>
        {meeting.assignee[0]}
      </div>
    </div>
  )
}

// ── Schedule Meeting Modal ────────────────────────────────────────────

function ScheduleMeetingModal({ c, effectiveCaller, leadNames, onClose, onAdd }: {
  c: C
  effectiveCaller: string | null
  leadNames: string[]
  onClose: () => void
  onAdd: (m: Omit<Meeting, 'id'>) => void
}) {
  const [form, setForm] = useState({
    business: '', contactName: '', date: formatDate(new Date()),
    startTime: '9:00', durationMinutes: 60,
    assignee: effectiveCaller ?? CALLERS_LIST[0],
    type: 'Discovery Call' as MeetingType,
    notes: '', personalConnection: '',
  })
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSug, setShowSug] = useState(false)
  const canSubmit = form.business.trim().length > 0 && form.date.length > 0

  function handleBusiness(val: string) {
    setForm(f => ({ ...f, business: val }))
    const matches = val ? leadNames.filter(n => n.toLowerCase().includes(val.toLowerCase())).slice(0, 5) : []
    setSuggestions(matches)
    setShowSug(matches.length > 0)
  }

  function handleSubmit() {
    if (!canSubmit) return
    onAdd({
      business: form.business.trim(),
      contactName: form.contactName.trim() || undefined,
      date: form.date,
      startTime: form.startTime,
      durationMinutes: form.durationMinutes,
      assignee: form.assignee,
      type: form.type,
      notes: form.notes.trim() || undefined,
      personalConnection: form.personalConnection.trim() || undefined,
    })
  }

  const fs = { width: '100%', padding: '9px 11px', fontSize: 13, background: c.bg2, border: `1px solid ${c.border}`, borderRadius: 8, color: c.text, fontFamily: '"Plus Jakarta Sans", sans-serif', outline: 'none', boxSizing: 'border-box' as const }
  const ls = { display: 'block', fontSize: 10, fontWeight: 700 as const, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 7 }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(2px)' }} onClick={onClose}>
      <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16, padding: 28, width: 520, maxWidth: 'calc(100vw - 48px)', maxHeight: 'calc(100vh - 80px)', overflowY: 'auto', boxShadow: '0 24px 48px rgba(0,0,0,0.2)', animation: 'fadeSlideUp 0.2s ease both' }} onClick={e => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 800, color: c.text, letterSpacing: '-0.02em' }}>Schedule Meeting</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ position: 'relative' }}>
              <label style={ls}>Business / Client *</label>
              <input value={form.business} onChange={e => handleBusiness(e.target.value)} onBlur={() => setTimeout(() => setShowSug(false), 150)} style={fs} placeholder="Acme Corp" autoComplete="off" />
              {showSug && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, zIndex: 10, boxShadow: '0 8px 20px rgba(0,0,0,0.1)', overflow: 'hidden', marginTop: 2 }}>
                  {suggestions.map(s => (
                    <button key={s} onMouseDown={() => { setForm(f => ({ ...f, business: s })); setShowSug(false) }} style={{ width: '100%', padding: '8px 12px', fontSize: 13, textAlign: 'left', background: 'transparent', border: 'none', color: c.text, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>{s}</button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label style={ls}>Contact Name</label>
              <input value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} style={fs} placeholder="John Smith" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={ls}>Date *</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={fs} />
            </div>
            <div>
              <label style={ls}>Start Time</label>
              <select value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} style={{ ...fs, cursor: 'pointer' }}>
                {TIME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label style={ls}>Duration</label>
              <select value={form.durationMinutes} onChange={e => setForm(f => ({ ...f, durationMinutes: Number(e.target.value) }))} style={{ ...fs, cursor: 'pointer' }}>
                <option value={30}>30 min</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={ls}>Booked By</label>
              <select value={form.assignee} onChange={e => setForm(f => ({ ...f, assignee: e.target.value }))} disabled={!!effectiveCaller} style={{ ...fs, cursor: effectiveCaller ? 'default' : 'pointer', opacity: effectiveCaller ? 0.6 : 1 }}>
                {effectiveCaller
                  ? <option value={effectiveCaller}>{effectiveCaller}</option>
                  : <>
                      <optgroup label="— TEAM —">
                        {CALLERS_LIST.map(n => <option key={n} value={n}>{n}</option>)}
                      </optgroup>
                      <optgroup label="— ADMIN —">
                        {ADMINS.map(a => <option key={a.name} value={a.name}>⚡ {a.name}</option>)}
                      </optgroup>
                    </>
                }
              </select>
            </div>
            <div>
              <label style={ls}>Meeting Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as MeetingType }))} style={{ ...fs, cursor: 'pointer' }}>
                {MEETING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={ls}>Background Info</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Notes about the client, what they need, any prep info…" style={{ ...fs, resize: 'none', lineHeight: 1.5 }} />
          </div>

          <div>
            <label style={ls}>Personal Connection (optional)</label>
            <input value={form.personalConnection} onChange={e => setForm(f => ({ ...f, personalConnection: e.target.value }))} style={fs} placeholder='e.g. "Alex knows the owner from college"' />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', fontSize: 13, fontWeight: 600, background: 'transparent', border: `1px solid ${c.border}`, color: c.textSecond, borderRadius: 10, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={!canSubmit} style={{ padding: '9px 18px', fontSize: 13, fontWeight: 600, background: canSubmit ? c.accent : c.bg3, color: canSubmit ? '#fff' : c.muted, border: 'none', borderRadius: 10, cursor: canSubmit ? 'pointer' : 'default', fontFamily: '"Plus Jakarta Sans", sans-serif', transition: 'background 0.15s' }}>Schedule</button>
        </div>
      </div>
    </div>
  )
}

// ── Meeting Detail Modal ──────────────────────────────────────────────

function MeetingDetailModal({ meeting, c, canEdit, onClose, onUpdate, onDelete }: {
  meeting: Meeting; c: C; canEdit: boolean
  onClose: () => void
  onUpdate: (m: Meeting) => void
  onDelete: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [em, setEm] = useState<Meeting>(meeting)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const color = CALLER_COLORS[meeting.assignee] ?? c.accent
  const typeColor = TYPE_COLORS[meeting.type]

  const currentStartTime = em.startTime

  function handleTimeChange(val: string) {
    setEm(prev => ({ ...prev, startTime: val }))
  }

  function handleSave() {
    onUpdate({ ...em, contactName: em.contactName || undefined, notes: em.notes || undefined, personalConnection: em.personalConnection || undefined })
    setEditing(false)
  }

  function cancelEdit() {
    setEm(meeting)
    setEditing(false)
  }

  const fs = { width: '100%', padding: '8px 10px', fontSize: 13, background: c.bg2, border: `1px solid ${c.border}`, borderRadius: 8, color: c.text, fontFamily: '"Plus Jakarta Sans", sans-serif', outline: 'none', boxSizing: 'border-box' as const }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(2px)' }} onClick={onClose}>
      <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16, padding: 28, width: 460, maxWidth: 'calc(100vw - 48px)', maxHeight: 'calc(100vh - 80px)', overflowY: 'auto', boxShadow: '0 24px 48px rgba(0,0,0,0.2)', animation: 'fadeSlideUp 0.2s ease both', position: 'relative' }} onClick={e => e.stopPropagation()}>

        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, width: 28, height: 28, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bg3, color: c.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>×</button>

        {/* Type badge */}
        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: `${typeColor}18`, color: typeColor, letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>
          {meeting.type}
        </span>

        {/* Business name */}
        {editing
          ? <input value={em.business} onChange={e => setEm(p => ({ ...p, business: e.target.value }))} style={{ ...fs, fontSize: 19, fontWeight: 800, marginTop: 8, marginBottom: 12 }} />
          : <h2 style={{ margin: '8px 40px 4px 0', fontSize: 19, fontWeight: 800, color: c.text, letterSpacing: '-0.02em' }}>{meeting.business}</h2>
        }

        {/* Assignee */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff' }}>
            {meeting.assignee[0]}
          </div>
          <span style={{ fontSize: 13, color: c.textSecond }}>Booked by <strong style={{ color: c.text }}>{meeting.assignee}</strong></span>
        </div>

        <div style={{ height: 1, background: c.border, marginBottom: 16 }} />

        {/* Date / Time / Duration */}
        {editing ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 6 }}>Date</div>
              <input type="date" value={em.date} onChange={e => setEm(p => ({ ...p, date: e.target.value }))} style={fs} />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 6 }}>Start Time</div>
              <select value={currentStartTime} onChange={e => handleTimeChange(e.target.value)} style={{ ...fs, cursor: 'pointer' }}>
                {TIME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 6 }}>Duration</div>
              <select value={em.durationMinutes} onChange={e => setEm(p => ({ ...p, durationMinutes: Number(e.target.value) }))} style={{ ...fs, cursor: 'pointer' }}>
                <option value={30}>30 min</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
              </select>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 2 }}>Date</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: c.text }}>
                {new Date(meeting.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 2 }}>Time</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: c.text }}>
                {(() => { const [h, m] = parseST(meeting.startTime); return formatTime(h, m) })()} – {formatEndTime(meeting)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 2 }}>Duration</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: c.text }}>
                {meeting.durationMinutes >= 60 ? `${meeting.durationMinutes / 60}h` : `${meeting.durationMinutes}m`}
              </div>
            </div>
          </div>
        )}

        {/* Contact */}
        {(editing || meeting.contactName) && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: editing ? 6 : 2 }}>Contact</div>
            {editing
              ? <input value={em.contactName ?? ''} onChange={e => setEm(p => ({ ...p, contactName: e.target.value }))} style={fs} placeholder="Contact person name" />
              : <div style={{ fontSize: 13, color: c.textSecond }}>{meeting.contactName}</div>
            }
          </div>
        )}

        {/* Personal connection */}
        {meeting.personalConnection && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, padding: '8px 12px', background: `${c.success}10`, borderRadius: 8, border: `1px solid ${c.success}28` }}>
            <span style={{ fontSize: 15 }}>🤝</span>
            <span style={{ fontSize: 12, color: c.success, fontWeight: 500 }}>
              <strong>{meeting.personalConnection}</strong> knows someone here
            </span>
          </div>
        )}

        {/* Notes */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: editing ? 6 : 4 }}>Background Info</div>
          {editing
            ? <textarea value={em.notes ?? ''} onChange={e => setEm(p => ({ ...p, notes: e.target.value }))} rows={3} style={{ ...fs, resize: 'none', lineHeight: 1.5 }} />
            : (meeting.notes
                ? <p style={{ margin: 0, fontSize: 13, color: c.textSecond, lineHeight: 1.6 }}>{meeting.notes}</p>
                : <p style={{ margin: 0, fontSize: 12, color: c.muted, fontStyle: 'italic' }}>No notes</p>)
          }
        </div>

        {/* Footer actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {canEdit && !editing && (
            <button onClick={() => setEditing(true)} style={{ fontSize: 12, fontWeight: 600, color: c.accent, background: `${c.accent}14`, border: `1px solid ${c.accent}30`, padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
              Edit
            </button>
          )}
          {editing && (
            <>
              <button onClick={handleSave} style={{ fontSize: 12, fontWeight: 600, color: '#fff', background: c.accent, border: 'none', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Save</button>
              <button onClick={cancelEdit} style={{ fontSize: 12, fontWeight: 600, color: c.textSecond, background: 'transparent', border: `1px solid ${c.border}`, padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Cancel</button>
            </>
          )}
          {!editing && canEdit && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
              {!confirmCancel ? (
                <button onClick={() => setConfirmCancel(true)} style={{ fontSize: 12, fontWeight: 600, color: c.danger, background: 'transparent', border: `1px solid ${c.danger}40`, padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                  Cancel Meeting
                </button>
              ) : (
                <>
                  <span style={{ fontSize: 12, color: c.textSecond }}>Sure?</span>
                  <button onClick={() => { onDelete(meeting.id); onClose() }} style={{ fontSize: 12, fontWeight: 600, color: '#fff', background: c.danger, border: 'none', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Yes, cancel</button>
                  <button onClick={() => setConfirmCancel(false)} style={{ fontSize: 12, fontWeight: 600, color: c.textSecond, background: 'transparent', border: `1px solid ${c.border}`, padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>No</button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Week View ─────────────────────────────────────────────────────────

function WeekView({ weekDays, meetings, c, onMeetingClick }: {
  weekDays: Date[]; meetings: Meeting[]; c: C; onMeetingClick: (m: Meeting) => void
}) {
  const today = new Date()
  const now = new Date()
  const nowTop = ((now.getHours() - START_HOUR) + now.getMinutes() / 60) * ROW_HEIGHT

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Day header row */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${c.border}`, flexShrink: 0, background: c.bg }}>
        <div style={{ width: TIME_COL_WIDTH, flexShrink: 0 }} />
        {weekDays.map((day, i) => {
          const isToday = isSameDay(day, today)
          return (
            <div key={i} style={{ flex: 1, padding: '10px 0 8px', textAlign: 'center', background: isToday ? `${c.accent}08` : 'transparent', borderLeft: `1px solid ${c.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{DAY_LABELS[i]}</div>
              <div style={{ width: 30, height: 30, borderRadius: '50%', margin: '3px auto 0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, background: isToday ? c.accent : 'transparent', color: isToday ? '#fff' : c.text, transition: 'background 0.2s' }}>
                {day.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      {/* Scrollable time grid */}
      <div style={{ flex: 1, overflowY: 'auto', background: c.bg }}>
        <div style={{ display: 'flex', height: GRID_HEIGHT }}>

          {/* Time labels */}
          <div style={{ width: TIME_COL_WIDTH, flexShrink: 0, background: c.bg }}>
            {HOURS.map(h => (
              <div key={h} style={{ height: ROW_HEIGHT, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 10, paddingTop: 5, boxSizing: 'border-box' }}>
                <span style={{ fontSize: 11, color: c.muted, fontWeight: 500, userSelect: 'none' }}>{hourLabel(h)}</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((day, dayIdx) => {
            const dayMeetings = meetings.filter(m => m.date === formatDate(day))
            const isToday = isSameDay(day, today)
            return (
              <div key={dayIdx} style={{ flex: 1, position: 'relative', borderLeft: `1px solid ${c.border}`, background: isToday ? `${c.accent}04` : 'transparent' }}>
                {/* Hour lines */}
                {HOURS.map((_, hi) => (
                  <div key={hi} style={{ position: 'absolute', left: 0, right: 0, top: hi * ROW_HEIGHT, borderTop: `1px solid ${c.border}`, opacity: 0.6, pointerEvents: 'none' }} />
                ))}
                {/* Half-hour dashes */}
                {HOURS.map((_, hi) => (
                  <div key={`h${hi}`} style={{ position: 'absolute', left: 8, right: 0, top: hi * ROW_HEIGHT + ROW_HEIGHT / 2, borderTop: `1px dashed ${c.border}`, opacity: 0.35, pointerEvents: 'none' }} />
                ))}
                {/* Current time line */}
                {isToday && nowTop >= 0 && nowTop <= GRID_HEIGHT && (
                  <div style={{ position: 'absolute', left: -1, right: 0, top: nowTop, height: 2, background: '#ef4444', zIndex: 5, pointerEvents: 'none' }}>
                    <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#ef4444', position: 'absolute', left: -4, top: -4 }} />
                  </div>
                )}
                {/* Meetings */}
                {dayMeetings.map(m => (
                  <MeetingBlock key={m.id} meeting={m} c={c} onClick={() => onMeetingClick(m)} />
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Month View ────────────────────────────────────────────────────────

function MonthView({ monthStart, meetings, c, onDayClick }: {
  monthStart: Date; meetings: Meeting[]; c: C; onDayClick: (d: Date) => void
}) {
  const today = new Date()
  const currentMonth = monthStart.getMonth()
  const days = getMonthDays(monthStart)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: c.bg }}>
      {/* Day name header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: `1px solid ${c.border}`, flexShrink: 0 }}>
        {DAY_LABELS.map(d => (
          <div key={d} style={{ padding: '8px 0', textAlign: 'center', fontSize: 11, fontWeight: 700, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: '1fr', overflow: 'hidden' }}>
        {days.map((day, i) => {
          const isToday = isSameDay(day, today)
          const inMonth = day.getMonth() === currentMonth
          const dayMeetings = meetings.filter(m => m.date === formatDate(day))
          return (
            <div
              key={i}
              onClick={() => onDayClick(day)}
              style={{
                padding: '7px 8px', cursor: 'pointer',
                borderRight: i % 7 !== 6 ? `1px solid ${c.border}` : 'none',
                borderBottom: `1px solid ${c.border}`,
                background: isToday ? `${c.accent}06` : 'transparent',
                transition: 'background 0.1s',
                overflow: 'hidden', display: 'flex', flexDirection: 'column',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = isToday ? `${c.accent}12` : c.bg3 }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isToday ? `${c.accent}06` : 'transparent' }}
            >
              <div style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: isToday ? 700 : 500, background: isToday ? c.accent : 'transparent', color: isToday ? '#fff' : inMonth ? c.text : c.muted, marginBottom: 4 }}>
                {day.getDate()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {dayMeetings.slice(0, 3).map(m => {
                  const col = CALLER_COLORS[m.assignee] ?? c.accent
                  return (
                    <div key={m.id} style={{ height: 5, borderRadius: 3, background: col, opacity: 0.85 }} title={m.business} />
                  )
                })}
                {dayMeetings.length > 3 && <span style={{ fontSize: 9, color: c.muted, fontWeight: 600 }}>+{dayMeetings.length - 3} more</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────

export default function Calendar() {
  const navigate = useNavigate()
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('agency-theme') as Theme) ?? 'light')
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<'admin' | 'caller' | null>(null)
  const [callerName, setCallerName] = useState<string | null>(null)
  const [signOutHov, setSignOutHov] = useState(false)
  const [view, setView] = useState<'week' | 'month'>('week')
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()))
  const [monthStart, setMonthStart] = useState<Date>(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const { leads, meetings, setMeetings } = useAppData()

  const c = THEMES[theme]
  const isAdminPath = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')
  const isAdmin = role !== null ? role === 'admin' : isAdminPath
  const effectiveCaller = isAdmin ? null : callerName

  useEffect(() => { localStorage.setItem('agency-theme', theme) }, [theme])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null
      setUser(u)
      if (u?.email) {
        const r = getUserRole(u.email)
        setRole(r)
        if (r === 'caller') setCallerName(CALLER_EMAIL_MAP[u.email] ?? null)
      }
    })
  }, [])

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const weekEnd = addDays(weekStart, 6)

  function prevPeriod() {
    if (view === 'week') setWeekStart(d => addDays(d, -7))
    else setMonthStart(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  }
  function nextPeriod() {
    if (view === 'week') setWeekStart(d => addDays(d, 7))
    else setMonthStart(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  }
  function goToday() {
    const t = new Date()
    setWeekStart(getWeekStart(t))
    setMonthStart(new Date(t.getFullYear(), t.getMonth(), 1))
  }

  const periodLabel = view === 'week'
    ? `${formatShortDate(weekStart)} – ${formatShortDate(weekEnd)}, ${weekStart.getFullYear()}`
    : formatMonthYear(monthStart)

  const userName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'User'

  const navTabs = isAdmin
    ? [
        { label: 'Dashboard',     path: '/admin',           active: false },
        { label: 'Sales Finance', path: '/admin/finances',  active: false },
        { label: 'Leads',         path: '/admin/leads',     active: false },
        { label: 'Rejected',      path: '/admin/rejected',  active: false },
        { label: 'Clients',       path: '/admin/clients',   active: false },
        { label: 'Calendar',      path: '/admin/calendar',  active: true  },
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

  return (
    <>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(10px); }
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

        {/* Calendar toolbar */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 24px', borderBottom: `1px solid ${c.border}`, background: c.bg2 }}>
          {/* Week / Month toggle */}
          <div style={{ display: 'flex', background: c.bg3, borderRadius: 9, padding: 3 }}>
            {(['week', 'month'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{ padding: '5px 16px', fontSize: 12, fontWeight: 600, borderRadius: 7, border: 'none', cursor: 'pointer', background: view === v ? c.bg : 'transparent', color: view === v ? c.text : c.muted, boxShadow: view === v ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s', fontFamily: '"Plus Jakarta Sans", sans-serif', textTransform: 'capitalize' }}>
                {v}
              </button>
            ))}
          </div>

          {/* Navigation arrows + Today */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button onClick={prevPeriod} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bg, color: c.textSecond, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}>
              <ChevronLeft />
            </button>
            <button onClick={goToday} style={{ padding: '5px 14px', fontSize: 12, fontWeight: 600, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bg, color: c.textSecond, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif', transition: 'background 0.15s' }}>
              Today
            </button>
            <button onClick={nextPeriod} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bg, color: c.textSecond, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}>
              <ChevronRight />
            </button>
          </div>

          {/* Period label */}
          <span style={{ fontSize: 15, fontWeight: 700, color: c.text, letterSpacing: '-0.01em' }}>{periodLabel}</span>

          <div style={{ flex: 1 }} />

          <button
            onClick={() => setShowScheduleModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', fontSize: 13, fontWeight: 600, color: '#fff', background: c.accent, border: 'none', borderRadius: 9, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif', transition: 'opacity 0.15s' }}
          >
            + Schedule Meeting
          </button>
        </div>

        {/* Calendar body */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', animation: 'fadeSlideUp 0.3s ease both' }}>
          {view === 'week' ? (
            <WeekView
              weekDays={weekDays}
              meetings={meetings}
              c={c}
              onMeetingClick={setSelectedMeeting}
            />
          ) : (
            <MonthView
              monthStart={monthStart}
              meetings={meetings}
              c={c}
              onDayClick={day => { setWeekStart(getWeekStart(day)); setView('week') }}
            />
          )}
        </div>
      </div>

      {selectedMeeting && (
        <MeetingDetailModal
          meeting={selectedMeeting}
          c={c}
          canEdit={isAdmin || selectedMeeting.assignee === callerName}
          onClose={() => setSelectedMeeting(null)}
          onUpdate={updated => {
            setMeetings(prev => prev.map(m => m.id === updated.id ? updated : m))
            setSelectedMeeting(updated)
          }}
          onDelete={(id: string) => {
            setMeetings(prev => prev.filter(m => m.id !== id))
            setSelectedMeeting(null)
          }}
        />
      )}

      {showScheduleModal && (
        <ScheduleMeetingModal
          c={c}
          effectiveCaller={effectiveCaller}
          leadNames={leads.map(l => l.business)}
          onClose={() => setShowScheduleModal(false)}
          onAdd={meeting => {
            setMeetings(prev => [...prev, { ...meeting, id: Date.now().toString() }])
            setShowScheduleModal(false)
            const [y, mo, d] = meeting.date.split('-').map(Number)
            setWeekStart(getWeekStart(new Date(y, mo - 1, d)))
            setView('week')
          }}
        />
      )}


    </>
  )
}
