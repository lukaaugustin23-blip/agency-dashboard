import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { signOut, getUserRole } from '../lib/auth'
import type { User } from '@supabase/supabase-js'
import type { Stage, Lead } from '../data/mockData'
import { CALLERS, ADMINS, CALLER_COLORS, CALLER_EMAIL_MAP, CALLERS_LIST } from '../data/mockData'
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

const STAGES: Stage[] = ['new', 'contacted', 'maybe', 'meeting', 'proposal', 'won', 'lost']

const STAGE_LABELS: Record<Stage, string> = {
  new: 'New', contacted: 'Contacted', maybe: 'Maybe / Call Back',
  meeting: 'Meeting', proposal: 'Proposal', won: 'Won', lost: 'Lost',
}

function getCallerName(callerId: string): string {
  if (callerId === 'admin') return 'Luka & Samvit'
  return CALLERS.find(c => c.id === callerId)?.name
    ?? ADMINS.find(a => a.id === callerId)?.name
    ?? callerId
}

function getCallerColor(callerId: string): string {
  if (callerId === 'admin') return '#6366f1'
  return CALLERS.find(c => c.id === callerId)?.color
    ?? ADMINS.find(a => a.id === callerId)?.color
    ?? '#94a3b8'
}

function daysAgoLabel(addedDate: string): string {
  const diff = Math.floor((Date.now() - new Date(addedDate + 'T12:00:00').getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return '1 day ago'
  return `${diff} days ago`
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

function EyeIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function PhoneIcon({ color }: { color: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.1 19.79 19.79 0 0 1 1.62 4.5 2 2 0 0 1 3.6 2.32h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 17z" />
    </svg>
  )
}

function UserIcon({ color }: { color: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────

function StatCard({ label, value, sub, valueColor, c, delay }: {
  label: string; value: string; sub: string; valueColor?: string; c: C; delay: string
}) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: c.bg2, border: `1px solid ${c.border}`, borderRadius: 14, padding: 16,
        boxShadow: hov ? '0 6px 20px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.05)',
        transform: hov ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease, background 0.3s ease',
        animation: 'fadeSlideUp 0.4s ease both', animationDelay: delay,
      }}
    >
      <p style={{ margin: 0, color: c.muted, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</p>
      <p style={{ margin: '5px 0 0', color: valueColor ?? c.text, fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</p>
      <p style={{ margin: '6px 0 0', color: c.muted, fontSize: 11, fontWeight: 500 }}>{sub}</p>
    </div>
  )
}

// ── Lead Card (minimal) ───────────────────────────────────────────────

function LeadCard({ lead, c, delay, onClick }: {
  lead: Lead; c: C; delay: string; onClick: () => void
}) {
  const [hov, setHov] = useState(false)
  const callerColor = getCallerColor(lead.callerId)
  const callerDisplayName = getCallerName(lead.callerId)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10, padding: 12,
        opacity: lead.stage === 'lost' ? 0.7 : 1,
        boxShadow: hov ? '0 6px 18px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.04)',
        transform: hov ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'box-shadow 0.18s ease, transform 0.18s ease',
        animation: 'fadeSlideUp 0.3s ease both', animationDelay: delay,
        cursor: 'pointer',
      }}
    >
      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: c.text, lineHeight: 1.3 }}>
        {lead.business}
      </p>
      <p style={{
        margin: '3px 0 10px', fontSize: 12, color: c.muted,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {lead.type}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{
            width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 8, fontWeight: 700, color: '#fff', background: callerColor,
          }}>
            {callerDisplayName[0]}
          </div>
          <span style={{ fontSize: 11, color: c.textSecond, fontWeight: 500 }}>{callerDisplayName}</span>
        </div>
        <span style={{ fontSize: 10, color: c.muted }}>{daysAgoLabel(lead.addedDate)}</span>
      </div>
    </div>
  )
}

// ── Lead Detail Modal ─────────────────────────────────────────────────

function LeadDetailModal({ lead, c, canDelete, onClose, onMoveStage, onUpdateNotes, onDelete }: {
  lead: Lead; c: C; canDelete: boolean
  onClose: () => void
  onMoveStage: (id: string, stage: Stage) => void
  onUpdateNotes: (id: string, notes: string) => void
  onDelete: (id: string) => void
}) {
  const [localNotes, setLocalNotes] = useState(lead.notes ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const callerColor = getCallerColor(lead.callerId)
  const callerDisplayName = getCallerName(lead.callerId)

  const fieldStyle = {
    width: '100%', padding: '9px 11px', fontSize: 13,
    background: c.bg2, border: `1px solid ${c.border}`, borderRadius: 8,
    color: c.text, fontFamily: '"Plus Jakarta Sans", sans-serif',
    outline: 'none', boxSizing: 'border-box' as const,
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 200, backdropFilter: 'blur(2px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16,
          padding: 28, width: 420, maxWidth: 'calc(100vw - 48px)',
          maxHeight: 'calc(100vh - 80px)', overflowY: 'auto',
          boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
          animation: 'fadeSlideUp 0.2s ease both',
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, right: 16,
            width: 28, height: 28, borderRadius: 8,
            border: `1px solid ${c.border}`, background: c.bg3,
            color: c.muted, cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: 16, lineHeight: 1,
          }}
        >
          ×
        </button>

        {/* Title */}
        <h2 style={{ margin: '0 32px 4px 0', fontSize: 20, fontWeight: 800, color: c.text, letterSpacing: '-0.02em' }}>
          {lead.business}
        </h2>
        <p style={{ margin: '0 0 16px', fontSize: 14, color: c.muted }}>{lead.type}</p>

        {/* Info rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {lead.phone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <PhoneIcon color={c.muted} />
              <span style={{ fontSize: 13, color: c.textSecond }}>{lead.phone}</span>
            </div>
          )}
          {lead.contact && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserIcon color={c.muted} />
              <span style={{ fontSize: 13, color: c.textSecond }}>{lead.contact}</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 700, color: '#fff', background: callerColor,
            }}>
              {callerDisplayName[0]}
            </div>
            <span style={{ fontSize: 13, color: c.textSecond }}>
              Found by <strong style={{ color: c.text }}>{callerDisplayName}</strong>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={c.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span style={{ fontSize: 13, color: c.textSecond }}>Added {daysAgoLabel(lead.addedDate)}</span>
          </div>
        </div>

        <div style={{ height: 1, background: c.border, marginBottom: 20 }} />

        {/* Stage */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            Stage
          </label>
          <select
            value={lead.stage}
            onChange={e => onMoveStage(lead.id, e.target.value as Stage)}
            style={{ ...fieldStyle, cursor: 'pointer' }}
          >
            {STAGES.map(s => (
              <option key={s} value={s}>{STAGE_LABELS[s]}</option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            Notes
          </label>
          <textarea
            value={localNotes}
            onChange={e => setLocalNotes(e.target.value)}
            onBlur={() => onUpdateNotes(lead.id, localNotes)}
            rows={3}
            placeholder="Add notes…"
            style={{ ...fieldStyle, resize: 'none', lineHeight: 1.5 }}
          />
        </div>

        {/* Delete — admins only */}
        {canDelete && (
          !confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              style={{
                fontSize: 12, fontWeight: 600, color: c.danger,
                background: 'transparent', border: `1px solid ${c.danger}40`,
                padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
                fontFamily: '"Plus Jakarta Sans", sans-serif',
                transition: 'background 0.15s ease',
              }}
            >
              Delete Lead
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: c.textSecond }}>Are you sure?</span>
              <button
                onClick={() => { onDelete(lead.id); onClose() }}
                style={{
                  fontSize: 12, fontWeight: 600, color: '#fff',
                  background: c.danger, border: 'none',
                  padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                }}
              >Confirm</button>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{
                  fontSize: 12, fontWeight: 600, color: c.textSecond,
                  background: 'transparent', border: `1px solid ${c.border}`,
                  padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                }}
              >Cancel</button>
            </div>
          )
        )}
      </div>
    </div>
  )
}

// ── Add Lead Modal ────────────────────────────────────────────────────

function AddLeadModal({ c, effectiveCaller, onClose, onAdd }: {
  c: C
  effectiveCaller: string | null  // null = admin, string = caller display name (pre-fill + disable)
  onClose: () => void
  onAdd: (lead: Omit<Lead, 'id'>) => void
}) {
  const defaultCallerId = effectiveCaller
    ? (CALLERS.find(c => c.name === effectiveCaller)?.id ?? 'alex')
    : 'alex'
  const [form, setForm] = useState({
    business: '', type: '', phone: '', contact: '', notes: '',
    callerId: defaultCallerId,
    stage: 'new' as Stage,
  })

  const canSubmit = form.business.trim().length > 0 && form.type.trim().length > 0

  const fieldStyle = {
    width: '100%', padding: '9px 11px', fontSize: 13,
    background: c.bg2, border: `1px solid ${c.border}`, borderRadius: 8,
    color: c.text, fontFamily: '"Plus Jakarta Sans", sans-serif',
    outline: 'none', boxSizing: 'border-box' as const,
  }

  const labelStyle = {
    display: 'block', fontSize: 10, fontWeight: 700 as const,
    color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 7,
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100, backdropFilter: 'blur(2px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16,
          padding: 28, width: 460, maxWidth: 'calc(100vw - 48px)',
          maxHeight: 'calc(100vh - 80px)', overflowY: 'auto',
          boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
          animation: 'fadeSlideUp 0.2s ease both',
        }}
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 800, color: c.text, letterSpacing: '-0.02em' }}>Add Lead</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Business Name *</label>
              <input value={form.business} onChange={e => setForm(f => ({ ...f, business: e.target.value }))} style={fieldStyle} placeholder="Acme Corp" />
            </div>
            <div>
              <label style={labelStyle}>Business Type *</label>
              <input value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={fieldStyle} placeholder="Restaurant" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Contact Name</label>
              <input value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} style={fieldStyle} placeholder="John Smith" />
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={fieldStyle} placeholder="(555) 123-4567" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Assigned To</label>
              <select
                value={form.callerId}
                onChange={e => setForm(f => ({ ...f, callerId: e.target.value }))}
                disabled={!!effectiveCaller}
                style={{ ...fieldStyle, cursor: effectiveCaller ? 'default' : 'pointer', opacity: effectiveCaller ? 0.6 : 1 }}
              >
                <optgroup label="— TEAM —">
                  {CALLERS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </optgroup>
                <optgroup label="— ADMIN —">
                  <option value="admin">⚡ Luka &amp; Samvit</option>
                </optgroup>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Stage</label>
              <select
                value={form.stage}
                onChange={e => setForm(f => ({ ...f, stage: e.target.value as Stage }))}
                style={{ ...fieldStyle, cursor: 'pointer' }}
              >
                {STAGES.filter(s => s !== 'lost').map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              style={{ ...fieldStyle, resize: 'none', lineHeight: 1.5 }}
              placeholder="Any notes…"
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '9px 18px', fontSize: 13, fontWeight: 600, background: 'transparent',
            border: `1px solid ${c.border}`, color: c.textSecond, borderRadius: 10, cursor: 'pointer',
            fontFamily: '"Plus Jakarta Sans", sans-serif',
          }}>Cancel</button>
          <button
            onClick={() => {
              if (!canSubmit) return
              onAdd({ business: form.business.trim(), type: form.type.trim(), phone: form.phone.trim() || undefined, contact: form.contact.trim() || '', notes: form.notes.trim() || undefined, callerId: form.callerId, addedDate: new Date().toISOString().split('T')[0], stage: form.stage })
            }}
            disabled={!canSubmit}
            style={{
              padding: '9px 18px', fontSize: 13, fontWeight: 600,
              background: canSubmit ? c.accent : c.bg3,
              color: canSubmit ? '#fff' : c.muted,
              border: 'none', borderRadius: 10, cursor: canSubmit ? 'pointer' : 'default',
              fontFamily: '"Plus Jakarta Sans", sans-serif',
              transition: 'background 0.15s ease',
            }}
          >Add Lead</button>
        </div>
      </div>
    </div>
  )
}

// ── Kanban Column ─────────────────────────────────────────────────────

function KanbanColumn({ stage, leads, c, delay, onCardClick, showQuickAdd, quickAddAssignee, onQuickAdd }: {
  stage: Stage; leads: Lead[]; c: C; delay: string
  onCardClick: (lead: Lead) => void
  showQuickAdd: boolean
  quickAddAssignee: string
  onQuickAdd: (business: string, assignee: string, stage: Stage) => void
}) {
  const [quickInput, setQuickInput] = useState('')

  function handleQuickKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && quickInput.trim()) {
      onQuickAdd(quickInput.trim(), quickAddAssignee, stage)
      setQuickInput('')
    }
    if (e.key === 'Escape') setQuickInput('')
  }

  return (
    <div style={{
      flex: 1, minWidth: 0,
      display: 'flex', flexDirection: 'column',
      animation: 'fadeSlideUp 0.4s ease both', animationDelay: delay,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 4px 8px', flexShrink: 0,
      }}>
        <span style={{
          fontSize: 11, fontWeight: 700, color: c.muted,
          textTransform: 'uppercase', letterSpacing: '0.1em',
        }}>{STAGE_LABELS[stage]}</span>
        <div style={{
          width: 20, height: 20, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, color: c.muted, background: c.bg3,
          flexShrink: 0,
        }}>{leads.length}</div>
      </div>

      {/* Quick-add input (caller view only) */}
      {showQuickAdd && (
        <input
          value={quickInput}
          onChange={e => setQuickInput(e.target.value)}
          onKeyDown={handleQuickKey}
          placeholder="Quick add…"
          style={{
            width: '100%', padding: '7px 10px', fontSize: 12, marginBottom: 8,
            background: c.bg3, border: `1px solid ${c.border}`, borderRadius: 8,
            color: c.text, outline: 'none', boxSizing: 'border-box',
            fontFamily: '"Plus Jakarta Sans", sans-serif',
            flexShrink: 0,
          }}
        />
      )}

      {/* Cards */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, padding: '2px 2px 8px' }}>
        {leads.length === 0 ? (
          <div style={{
            flex: 1, minHeight: 80,
            border: `1.5px dashed ${c.border}`, borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 11, color: c.muted }}>No leads yet</span>
          </div>
        ) : (
          leads.map((lead, i) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              c={c}
              delay={`${parseFloat(delay) + i * 0.03}s`}
              onClick={() => onCardClick(lead)}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ── Lost Reason Modal ─────────────────────────────────────────────────

const REJECTION_REASONS = ['No Budget', 'Not Interested', 'Went with Competitor', 'Bad Timing', 'Other'] as const
type RejectionReason = typeof REJECTION_REASONS[number]

function LostReasonModal({ c, onClose, onConfirm }: {
  c: C
  onClose: () => void
  onConfirm: (reason: RejectionReason, notes?: string) => void
}) {
  const [reason, setReason] = useState<RejectionReason>('No Budget')
  const [notes, setNotes] = useState('')
  const fs = { width: '100%', padding: '9px 11px', fontSize: 13, background: c.bg2, border: `1px solid ${c.border}`, borderRadius: 8, color: c.text, fontFamily: '"Plus Jakarta Sans", sans-serif', outline: 'none', boxSizing: 'border-box' as const }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, backdropFilter: 'blur(2px)' }} onClick={onClose}>
      <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16, padding: 28, width: 420, maxWidth: 'calc(100vw - 48px)', boxShadow: '0 24px 48px rgba(0,0,0,0.25)', animation: 'fadeSlideUp 0.2s ease both' }} onClick={e => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: c.text, letterSpacing: '-0.02em' }}>Mark as Lost</h2>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: c.muted }}>This lead will be added to the Rejected list. Select a reason.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {REJECTION_REASONS.map(r => (
            <button
              key={r}
              onClick={() => setReason(r)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: reason === r ? `${c.danger}10` : c.bg2, border: `1px solid ${reason === r ? c.danger : c.border}`, borderRadius: 10, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif', textAlign: 'left', transition: 'border-color 0.15s, background 0.15s' }}
            >
              <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${reason === r ? c.danger : c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {reason === r && <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.danger }} />}
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: reason === r ? c.danger : c.text }}>{r}</span>
            </button>
          ))}
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 7 }}>Notes <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
          <input value={notes} onChange={e => setNotes(e.target.value)} style={fs} placeholder="Any additional context…" />
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', fontSize: 13, fontWeight: 600, background: 'transparent', border: `1px solid ${c.border}`, color: c.textSecond, borderRadius: 10, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Cancel</button>
          <button onClick={() => onConfirm(reason, notes || undefined)} style={{ padding: '9px 18px', fontSize: 13, fontWeight: 600, background: c.danger, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Mark Lost</button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────

export default function Leads() {
  const navigate = useNavigate()
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('agency-theme') as Theme) ?? 'light')
  const { leads, setLeads, moveLeadStage, updateLead, deleteLead } = useAppData()
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<'admin' | 'caller' | null>(null)
  const [callerName, setCallerName] = useState<string | null>(null)
  const [filterCaller, setFilterCaller] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState(false)
  const [previewCaller, setPreviewCaller] = useState(CALLERS_LIST[0])
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [signOutHov, setSignOutHov] = useState(false)
  const [pendingLostId, setPendingLostId] = useState<string | null>(null)
  const [showLostModal, setShowLostModal] = useState(false)

  const c = THEMES[theme]
  const isAdminPath = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')
  const isAdmin = role !== null ? role === 'admin' : isAdminPath
  const selectedLead = selectedLeadId !== null ? leads.find(l => l.id === selectedLeadId) ?? null : null

  // Caller view = actual caller login OR admin in preview mode
  const isCallerView = previewMode || (!isAdmin && !!callerName)
  // Who owns the caller view (null = pure admin)
  const effectiveCaller = previewMode ? previewCaller : (!isAdmin && callerName ? callerName : null)
  // Admin can delete; callers/preview cannot
  const canDelete = isAdmin && !previewMode

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

  const callerIdForName = callerName ? CALLERS.find(c => c.name === callerName)?.id ?? null : null
  const roleFiltered = isAdmin ? leads : leads.filter(l => !callerIdForName || l.callerId === callerIdForName)

  const previewCallerId = CALLERS.find(c => c.name === previewCaller)?.id ?? previewCaller
  const filterCallerId = filterCaller ? CALLERS.find(c => c.name === filterCaller)?.id ?? filterCaller : null

  const viewFiltered = previewMode
    ? leads.filter(l => l.callerId === previewCallerId)
    : (isAdmin && filterCallerId)
      ? roleFiltered.filter(l => l.callerId === filterCallerId)
      : roleFiltered

  const stats = {
    total: viewFiltered.length,
    inProgress: viewFiltered.filter(l => ['contacted', 'maybe', 'meeting', 'proposal'].includes(l.stage)).length,
    closed: viewFiltered.filter(l => l.stage === 'won').length,
    lost: viewFiltered.filter(l => l.stage === 'lost').length,
  }

  function handleMoveStage(id: string, stage: Stage) {
    if (stage === 'lost') {
      setPendingLostId(id)
      setShowLostModal(true)
    } else {
      moveLeadStage(id, stage)
    }
  }

  function handleLostConfirm(reason: RejectionReason, notes?: string) {
    if (pendingLostId === null) return
    const today = new Date().toISOString().split('T')[0]
    moveLeadStage(pendingLostId, 'lost', { lostReason: reason, lostDate: today })
    if (notes) updateLead(pendingLostId, { notes })
    setPendingLostId(null)
    setShowLostModal(false)
  }

  function handleUpdateNotes(id: string, notes: string) {
    updateLead(id, { notes: notes || undefined })
  }

  function handleDeleteLead(id: string) {
    deleteLead(id)
  }

  function handleQuickAdd(business: string, callerDisplayName: string, stage: Stage) {
    const cid = CALLERS.find(c => c.name === callerDisplayName)?.id ?? 'alex'
    setLeads(prev => [...prev, { id: Date.now().toString(), business, type: '', contact: '', callerId: cid, addedDate: new Date().toISOString().split('T')[0], stage }])
  }

  const userName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'User'

  const navTabs = isAdmin
    ? [
        { label: 'Dashboard',     path: '/admin',              active: false },
        { label: 'Sales Finance', path: '/admin/finances',     active: false },
        { label: 'Leads',         path: '/admin/leads',        active: true  },
        { label: 'Rejected',      path: '/admin/rejected',     active: false },
        { label: 'Clients',       path: '/admin/clients',      active: false },
        { label: 'Calendar',      path: '/admin/calendar',     active: false },
        { label: 'Scripts',       path: '/admin/scripts',      active: false },
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
          <div style={{ display: 'flex', alignItems: 'stretch' }}>
            {navTabs.map(tab => (
              <button key={tab.path} onClick={() => navigate(tab.path)} style={{
                display: 'flex', alignItems: 'center', padding: '0 16px',
                fontSize: 13, fontWeight: tab.active ? 600 : 500,
                color: tab.active ? c.accent : c.muted,
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: tab.active ? `2px solid ${c.accent}` : '2px solid transparent',
                transition: 'color 0.15s ease, border-color 0.15s ease',
              }}>{tab.label}</button>
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
            >Sign out</button>
          </div>
        </header>

        {/* ── Preview Banner ── */}
        {previewMode && (
          <div style={{
            flexShrink: 0, background: `${c.accent}14`, borderBottom: `1px solid ${c.accent}28`,
            padding: '10px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: c.accent }}><EyeIcon /></span>
              <span style={{ fontSize: 13, fontWeight: 600, color: c.accent }}>Previewing as</span>
              <select
                value={previewCaller}
                onChange={e => setPreviewCaller(e.target.value)}
                style={{
                  fontSize: 13, fontWeight: 700, color: c.accent,
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  outline: 'none', fontFamily: '"Plus Jakarta Sans", sans-serif',
                }}
              >
                {CALLERS_LIST.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <span style={{ fontSize: 13, fontWeight: 600, color: c.accent }}>'s view</span>
            </div>
            <button
              onClick={() => setPreviewMode(false)}
              style={{
                fontSize: 12, fontWeight: 600, color: c.accent,
                background: `${c.accent}18`, border: `1px solid ${c.accent}30`,
                padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
                fontFamily: '"Plus Jakarta Sans", sans-serif',
              }}
            >Exit Preview</button>
          </div>
        )}

        {/* ── Main ── */}
        <main style={{
          flex: 1, overflow: 'hidden', padding: '14px 24px',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>

          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, flexShrink: 0 }}>
            <StatCard label="Total Leads"   value={String(stats.total)}      sub="in pipeline"   valueColor={c.accent}  c={c} delay="0.05s" />
            <StatCard label="In Progress"   value={String(stats.inProgress)} sub="active stages"                         c={c} delay="0.10s" />
            <StatCard label="Closed Won"    value={String(stats.closed)}     sub="deals won"     valueColor={c.success} c={c} delay="0.15s" />
            <StatCard label="Lost"          value={String(stats.lost)}       sub="no deal"       valueColor={c.danger}  c={c} delay="0.20s" />
          </div>

          {/* Pipeline header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: c.text, letterSpacing: '-0.02em' }}>
                {isCallerView
                  ? `${effectiveCaller ?? ''}'s Leads`
                  : 'Lead Board'}
              </h2>

              {/* Admin caller filter — hidden in preview mode */}
              {isAdmin && !previewMode && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  {[{ label: 'All', key: null }, ...CALLERS_LIST.map(n => ({ label: n, key: n })), ...ADMINS.map(a => ({ label: a.name, key: a.name }))].map(({ label, key }) => {
                    const active = key === filterCaller
                    return (
                      <button
                        key={label}
                        onClick={() => setFilterCaller(key)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '5px 12px', fontSize: 12, fontWeight: active ? 600 : 500,
                          background: active ? c.accent : c.bg3,
                          color: active ? '#fff' : c.textSecond,
                          border: active ? 'none' : `1px solid ${c.border}`,
                          borderRadius: 8, cursor: 'pointer',
                          transition: 'background 0.15s ease, color 0.15s ease',
                          fontFamily: '"Plus Jakarta Sans", sans-serif',
                        }}
                      >
                        {key && (
                          <div style={{
                            width: 7, height: 7, borderRadius: '50%',
                            background: active ? 'rgba(255,255,255,0.8)' : CALLER_COLORS[key],
                            flexShrink: 0,
                          }} />
                        )}
                        {label === 'All' ? 'All Leads' : label}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Preview as Rep — admin only, hidden in preview mode */}
              {isAdmin && !previewMode && (
                <button
                  onClick={() => setPreviewMode(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', fontSize: 12, fontWeight: 500, color: c.textSecond,
                    background: c.bg3, border: `1px solid ${c.border}`,
                    borderRadius: 9, cursor: 'pointer',
                    fontFamily: '"Plus Jakarta Sans", sans-serif',
                    transition: 'background 0.15s ease',
                  }}
                >
                  <EyeIcon />
                  Preview as Rep
                </button>
              )}

              {/* Add Lead — always visible */}
              <button
                onClick={() => setShowAddModal(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '9px 16px', fontSize: 13, fontWeight: 600, color: '#fff',
                  background: c.accent, border: 'none', borderRadius: 9, cursor: 'pointer',
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                }}
              >
                + Add Lead
              </button>
            </div>
          </div>

          {/* Kanban board */}
          <div
            key={`${filterCaller}-${previewMode ? previewCaller : 'all'}`}
            style={{ flex: 1, minHeight: 0, display: 'flex', gap: 10 }}
          >
            {STAGES.map((stage, i) => (
              <KanbanColumn
                key={stage}
                stage={stage}
                leads={viewFiltered.filter(l => l.stage === stage)}
                c={c}
                delay={`${i * 0.03}s`}
                onCardClick={lead => setSelectedLeadId(lead.id)}
                showQuickAdd={isCallerView}
                quickAddAssignee={effectiveCaller ?? ''}
                onQuickAdd={handleQuickAdd}
              />
            ))}
          </div>

        </main>
      </div>

      {/* Lead detail modal */}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          c={c}
          canDelete={canDelete}
          onClose={() => setSelectedLeadId(null)}
          onMoveStage={handleMoveStage}
          onUpdateNotes={handleUpdateNotes}
          onDelete={handleDeleteLead}
        />
      )}

      {/* Add lead modal */}
      {showAddModal && (
        <AddLeadModal
          c={c}
          effectiveCaller={effectiveCaller}
          onClose={() => setShowAddModal(false)}
          onAdd={(lead) => {
            setLeads(prev => [...prev, { ...lead, id: Date.now().toString() }])
            setShowAddModal(false)
          }}
        />
      )}

      {/* Lost reason picker modal */}
      {showLostModal && (
        <LostReasonModal
          c={c}
          onClose={() => { setPendingLostId(null); setShowLostModal(false) }}
          onConfirm={handleLostConfirm}
        />
      )}

    </>
  )
}
