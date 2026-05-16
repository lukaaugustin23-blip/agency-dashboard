import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { signOut, getUserRole } from '../lib/auth'
import type { User } from '@supabase/supabase-js'
import { CALLER_EMAIL_MAP, CALLER_COLORS } from '../data/mockData'



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

interface Opener {
  id: number
  title: string
  script: string
}

interface Objection {
  id: number
  objection: string
  response: string
}

type SuggestionType = 'new-opener' | 'new-objection' | 'edit-opener' | 'edit-objection' | 'new-stat' | 'edit-stat'

interface Suggestion {
  id: number
  type: SuggestionType
  callerName: string
  targetId?: number
  title?: string
  content: string
  objectionText?: string
  reason?: string
  statUrl?: string
  status: 'pending' | 'approved' | 'rejected'
  timestamp: string
}

interface Stat {
  id: number
  number: string      // e.g. "97%"
  description: string
  sourceName: string
  sourceUrl?: string
}

const INITIAL_STATS: Stat[] = [
  { id: 1, number: '97%',  description: 'of consumers search online for local businesses', sourceName: 'BIA/Kelsey Research', sourceUrl: 'https://www.searchenginejournal.com/local-seo-statistics/' },
  { id: 2, number: '70%',  description: "of small businesses don't have a website", sourceName: 'Top Design Firms 2024', sourceUrl: 'https://topdesignfirms.com/web-design/blog/small-business-website-statistics' },
  { id: 3, number: '75%',  description: "of users judge a company's credibility by their website", sourceName: 'Stanford Web Credibility Research', sourceUrl: 'https://credibility.stanford.edu/' },
  { id: 4, number: '46%',  description: 'of all Google searches are looking for local info', sourceName: 'GoGulf', sourceUrl: 'https://www.searchenginejournal.com/local-seo-statistics/' },
  { id: 5, number: '88%',  description: 'of consumers who search locally visit or call within 24 hours', sourceName: 'Nectafy', sourceUrl: 'https://www.searchenginejournal.com/local-seo-statistics/' },
  { id: 6, number: '$0',   description: "is what it costs them in lost revenue to NOT have a website — that's the real price", sourceName: 'Common sense' },
]

const INITIAL_OPENERS: Opener[] = [
  { id: 1, title: 'The Direct Approach',   script: "Hi [Name], I'm [Your Name] calling from Agency. I was looking at [Business Name] online and noticed you don't have a website yet. These days that's leaving money on the table — do you have 30 seconds for me to explain what I mean?" },
  { id: 2, title: 'The Compliment Opener', script: "Hey [Name], I was actually checking out [Business Name] and I love what you guys are doing. I noticed you don't have a website though, and I think you're missing out on a ton of customers who are searching online. Can I ask you a quick question?" },
  { id: 3, title: 'The Referral Style',    script: "Hi [Name], I just helped a [similar business type] in your area get set up online and they've been getting new customers from it every week. I noticed [Business Name] doesn't have a web presence yet — would you be open to hearing what we did for them?" },
  { id: 4, title: 'The Problem Solver',    script: "Hey [Name], quick question — when people in [area] search Google for [their service], are they finding you right now? No? That's actually why I'm calling..." },
]

const INITIAL_OBJECTIONS: Objection[] = [
  { id: 1, objection: '"$1,000 is too much"',                       response: "I totally understand — and honestly, most of our clients felt the same way at first. But think about it this way: if your website brings in just 2-3 new customers a month, you've already made that back. One of our clients, a local bakery, made their investment back in the first 3 weeks. It's not an expense, it's the cheapest employee you'll ever hire — works 24/7 and never calls in sick." },
  { id: 2, objection: '"I don\'t need a website"',                   response: "I hear you, and a lot of business owners feel that way because they've been doing fine without one. But here's the thing — your competitors have websites, and when someone searches for [their service] in [their area], those competitors are getting the calls. You're invisible to anyone under 40 who searches online first. We're not trying to change how you do business, just making sure people can actually find you." },
  { id: 3, objection: '"I need to think about it"',                  response: "Absolutely, I wouldn't want you to rush into anything. What specifically would you want to think over — is it the price, the timing, or just the idea in general? [Wait for answer]. That makes sense. How about this — I can send you a quick mockup of what your site would look like, totally free, no commitment. That way you have something real to think about instead of just an idea." },
  { id: 4, objection: '"I already have someone for my website"',     response: "Oh nice, that's great you're already thinking about it. Just out of curiosity — are you happy with how it's going? Because we hear from a lot of businesses that hired someone and it's been months with no progress. If you're all set, I totally respect that. But if you're not 100% satisfied, it might be worth a quick 15-minute chat to see what we'd do differently." },
  { id: 5, objection: '"Can you call back later?"',                  response: "Of course — when's a good time for you? I'll put it in my calendar right now. [Book the callback]. Actually, just so you know what this is about when I call back — we build websites for local businesses like yours and we've helped [X similar businesses] in [area] start getting found online. I'll keep it super quick, just 5 minutes." },
  { id: 6, objection: '"I\'m too busy right now"',                   response: "I completely respect that — running a business is no joke. That's actually exactly why this works so well though. We handle everything — you don't have to do anything except one 30-minute call to tell us about your business. After that, we build it, you approve it, done. Can I grab just 2 minutes to explain how easy we make it?" },
]

const INITIAL_SUGGESTIONS: Suggestion[] = []

const COLS = 3

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
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
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

function BellIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6V11c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
    </svg>
  )
}

function LightbulbIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="9" y1="18" x2="15" y2="18" />
      <line x1="10" y1="22" x2="14" y2="22" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function ChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

// ── Add Item Modal ────────────────────────────────────────────────────

function AddModal({ c, mode, onClose, onAdd }: {
  c: C
  mode: 'opener' | 'objection'
  onClose: () => void
  onAdd: (data: { title?: string; script?: string; objection?: string; response?: string }) => void
}) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [extra, setExtra] = useState('')
  const canSubmit = mode === 'opener' ? title.trim() && body.trim() : body.trim() && extra.trim()

  const fs = { width: '100%', padding: '9px 11px', fontSize: 13, background: c.bg2, border: `1px solid ${c.border}`, borderRadius: 8, color: c.text, fontFamily: '"Plus Jakarta Sans", sans-serif', outline: 'none', boxSizing: 'border-box' as const }
  const ls = { display: 'block', fontSize: 10, fontWeight: 700 as const, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 7 }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(2px)' }} onClick={onClose}>
      <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16, padding: 28, width: 480, maxWidth: 'calc(100vw - 48px)', boxShadow: '0 24px 48px rgba(0,0,0,0.2)', animation: 'fadeSlideUp 0.2s ease both' }} onClick={e => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 800, color: c.text, letterSpacing: '-0.02em' }}>
          {mode === 'opener' ? 'Add Opener' : 'Add Objection'}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'opener' ? (
            <>
              <div>
                <label style={ls}>Opener Title</label>
                <input value={title} onChange={e => setTitle(e.target.value)} style={fs} placeholder='e.g. "The Value Play"' />
              </div>
              <div>
                <label style={ls}>Script</label>
                <textarea value={body} onChange={e => setBody(e.target.value)} rows={4} style={{ ...fs, resize: 'none', lineHeight: 1.6 }} placeholder="Hi [Name], I'm calling from Agency…" />
              </div>
            </>
          ) : (
            <>
              <div>
                <label style={ls}>Objection</label>
                <input value={body} onChange={e => setBody(e.target.value)} style={fs} placeholder='"I already have a website"' />
              </div>
              <div>
                <label style={ls}>Your Response</label>
                <textarea value={extra} onChange={e => setExtra(e.target.value)} rows={4} style={{ ...fs, resize: 'none', lineHeight: 1.6 }} placeholder="That's great to hear! How's it working for you?…" />
              </div>
            </>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', fontSize: 13, fontWeight: 600, background: 'transparent', border: `1px solid ${c.border}`, color: c.textSecond, borderRadius: 10, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Cancel</button>
          <button
            onClick={() => {
              if (!canSubmit) return
              if (mode === 'opener') onAdd({ title, script: body })
              else onAdd({ objection: body, response: extra })
            }}
            disabled={!canSubmit}
            style={{ padding: '9px 18px', fontSize: 13, fontWeight: 600, background: canSubmit ? c.accent : c.bg3, color: canSubmit ? '#fff' : c.muted, border: 'none', borderRadius: 10, cursor: canSubmit ? 'pointer' : 'default', fontFamily: '"Plus Jakarta Sans", sans-serif', transition: 'background 0.15s' }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Suggest Modal ─────────────────────────────────────────────────────

function SuggestModal({ c, mode, currentOpener, currentObjection, currentStat, onClose, onSubmit }: {
  c: C
  mode: SuggestionType
  currentOpener?: Opener
  currentObjection?: Objection
  currentStat?: Stat
  onClose: () => void
  onSubmit: (data: { title?: string; content: string; objectionText?: string; reason?: string; statUrl?: string }) => void
}) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [objectionText, setObjectionText] = useState('')
  const [reason, setReason] = useState('')
  const [statUrl, setStatUrl] = useState('')

  const isNew = mode === 'new-opener' || mode === 'new-objection'
  const isStat = mode === 'new-stat' || mode === 'edit-stat'
  const canSubmit = mode === 'new-opener'
    ? title.trim() && content.trim()
    : mode === 'new-objection'
    ? objectionText.trim() && content.trim()
    : isStat
    ? title.trim() && content.trim()
    : content.trim()

  const fs = { width: '100%', padding: '9px 11px', fontSize: 13, background: c.bg2, border: `1px solid ${c.border}`, borderRadius: 8, color: c.text, fontFamily: '"Plus Jakarta Sans", sans-serif', outline: 'none', boxSizing: 'border-box' as const, transition: 'border-color 0.15s' }
  const ls = { display: 'block', fontSize: 10, fontWeight: 700 as const, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 7 }
  const readonlyBlock = { padding: '10px 14px', fontSize: 13, background: c.bg3, border: `1px solid ${c.border}`, borderRadius: 8, color: c.textSecond, lineHeight: 1.65, fontSize2: 13 }

  const modalTitle: Record<SuggestionType, string> = {
    'new-opener': 'Suggest New Opener',
    'edit-opener': 'Suggest Opener Edit',
    'new-objection': 'Suggest New Objection',
    'edit-objection': 'Suggest Objection Edit',
    'new-stat': 'Suggest New Stat',
    'edit-stat': 'Suggest Stat Edit',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(2px)' }} onClick={onClose}>
      <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16, padding: 28, width: 520, maxWidth: 'calc(100vw - 48px)', maxHeight: 'calc(100vh - 80px)', overflowY: 'auto', boxShadow: '0 24px 48px rgba(0,0,0,0.25)', animation: 'fadeSlideUp 0.2s ease both' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <span style={{ color: c.accent }}><LightbulbIcon /></span>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: c.text, letterSpacing: '-0.02em' }}>{modalTitle[mode]}</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Current text (read-only for edit modes) */}
          {mode === 'edit-opener' && currentOpener && (
            <div>
              <label style={ls}>Current Script — {currentOpener.title}</label>
              <div style={{ ...readonlyBlock, borderLeft: `3px solid ${c.accent}` }}>
                <p style={{ margin: 0, fontSize: 13, color: c.textSecond, lineHeight: 1.65 }}>{currentOpener.script}</p>
              </div>
            </div>
          )}
          {mode === 'edit-objection' && currentObjection && (
            <div>
              <label style={ls}>Current Response — {currentObjection.objection}</label>
              <div style={{ ...readonlyBlock, borderLeft: `3px solid ${c.accent}` }}>
                <p style={{ margin: 0, fontSize: 13, color: c.textSecond, lineHeight: 1.65 }}>{currentObjection.response}</p>
              </div>
            </div>
          )}

          {/* New opener title */}
          {mode === 'new-opener' && (
            <div>
              <label style={ls}>Opener Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} style={fs} placeholder='e.g. "The Curiosity Hook"' />
            </div>
          )}

          {/* New objection text */}
          {mode === 'new-objection' && (
            <div>
              <label style={ls}>The Objection</label>
              <input value={objectionText} onChange={e => setObjectionText(e.target.value)} style={fs} placeholder='"I need to think about it"' />
            </div>
          )}

          {/* Suggested content — openers/objections only */}
          {!isStat && (
            <div>
              <label style={ls}>
                {mode === 'edit-opener' ? 'Your Suggested Script' :
                 mode === 'new-opener' ? 'Script' :
                 mode === 'new-objection' ? 'Your Response' :
                 'Your Suggested Response'}
              </label>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={isNew ? 4 : 5}
                style={{ ...fs, resize: 'none', lineHeight: 1.65 }}
                placeholder={
                  mode === 'edit-opener' || mode === 'new-opener'
                    ? "Hi [Name], I'm calling from Agency…"
                    : "I totally understand — here's what I usually say…"
                }
              />
            </div>
          )}

          {/* Stat fields */}
          {isStat && currentStat && (
            <div>
              <label style={ls}>Current Stat</label>
              <div style={{ padding: '10px 14px', fontSize: 13, background: c.bg3, border: `1px solid ${c.border}`, borderLeft: `3px solid ${c.accent}`, borderRadius: 8, color: c.textSecond }}>
                <span style={{ fontWeight: 800, color: c.accent }}>{currentStat.number}</span> — {currentStat.description}
              </div>
            </div>
          )}
          {isStat && (
            <>
              <div>
                <label style={ls}>Stat Number / Percentage</label>
                <input value={title} onChange={e => setTitle(e.target.value)} style={fs} placeholder='e.g. "82%" or "$1.2B"' />
              </div>
              <div>
                <label style={ls}>Description</label>
                <textarea value={content} onChange={e => setContent(e.target.value)} rows={2} style={{ ...fs, resize: 'none', lineHeight: 1.65 }} placeholder="of businesses that do X…" />
              </div>
              <div>
                <label style={ls}>Source Name</label>
                <input value={reason} onChange={e => setReason(e.target.value)} style={fs} placeholder='e.g. "HubSpot 2024 Report"' />
              </div>
              <div>
                <label style={ls}>Source URL <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                <input value={statUrl} onChange={e => setStatUrl(e.target.value)} style={fs} placeholder="https://…" />
              </div>
            </>
          )}

          {/* Reason (optional) — non-stat only */}
          {!isStat && (
            <div>
              <label style={ls}>Reason <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
              <input
                value={reason}
                onChange={e => setReason(e.target.value)}
                style={fs}
                placeholder="Why do you think this works better?"
              />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', fontSize: 13, fontWeight: 600, background: 'transparent', border: `1px solid ${c.border}`, color: c.textSecond, borderRadius: 10, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Cancel</button>
          <button
            onClick={() => {
              if (!canSubmit) return
              onSubmit({ title: title || undefined, content, objectionText: objectionText || undefined, reason: reason || undefined, statUrl: statUrl || undefined })
            }}
            disabled={!canSubmit}
            style={{ padding: '9px 18px', fontSize: 13, fontWeight: 600, background: canSubmit ? c.accent : c.bg3, color: canSubmit ? '#fff' : c.muted, border: 'none', borderRadius: 10, cursor: canSubmit ? 'pointer' : 'default', fontFamily: '"Plus Jakarta Sans", sans-serif', transition: 'background 0.15s', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <LightbulbIcon /> Submit Suggestion
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Pending Suggestions Panel (Admin) ─────────────────────────────────

function PendingSuggestionsPanel({ c, suggestions, objections, onApprove, onReject }: {
  c: C
  suggestions: Suggestion[]
  objections: Objection[]
  onApprove: (id: number) => void
  onReject: (id: number) => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  const pending = suggestions.filter(s => s.status === 'pending')
  if (pending.length === 0) return null

  function callerInitials(name: string) {
    return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
  }
  function callerColor(name: string): string {
    return (CALLER_COLORS as Record<string, string>)[name] ?? '#6366f1'
  }

  const typeLabel: Record<SuggestionType, string> = {
    'new-opener': 'New Opener',
    'edit-opener': 'Edit Opener',
    'new-objection': 'New Objection',
    'edit-objection': 'Edit Objection',
    'new-stat': 'New Stat',
    'edit-stat': 'Edit Stat',
  }

  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16, overflow: 'hidden', animation: 'fadeSlideUp 0.25s ease both', transition: 'background 0.3s ease, border-color 0.3s ease' }}>
      {/* Banner header */}
      <button
        onClick={() => setCollapsed(v => !v)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '14px 20px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif', gap: 10, borderBottom: collapsed ? 'none' : `1px solid ${c.border}`, transition: 'border-color 0.2s' }}
      >
        <span style={{ color: c.warning }}><BellIcon /></span>
        <span style={{ fontSize: 13, fontWeight: 700, color: c.text }}>Pending Suggestions</span>
        <span style={{ fontSize: 11, fontWeight: 700, background: c.warning, color: '#fff', borderRadius: 20, padding: '2px 8px', minWidth: 20, textAlign: 'center' }}>
          {pending.length}
        </span>
        <span style={{ marginLeft: 'auto', color: c.muted, transition: 'transform 0.2s', display: 'inline-block', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
          <ChevronDown />
        </span>
      </button>

      {/* Cards */}
      {!collapsed && (
        <div style={{ padding: '14px 20px 18px', display: 'flex', flexDirection: 'column', gap: 12, animation: 'expandDown 0.2s ease both' }}>
          {pending.map(sug => {
            const targetObj = sug.type === 'edit-objection' ? objections.find(o => o.id === sug.targetId) : undefined
            const color = callerColor(sug.callerName)
            return (
              <div key={sug.id} style={{ background: c.bg2, border: `1px solid ${c.border}`, borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {/* Avatar */}
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {callerInitials(sug.callerName)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: c.text }}>{sug.callerName}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: c.accent, background: `${c.accent}14`, borderRadius: 20, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {typeLabel[sug.type]}
                      </span>
                      {sug.type === 'new-opener' && sug.title && (
                        <span style={{ fontSize: 11, color: c.muted }}>"{sug.title}"</span>
                      )}
                      {targetObj && (
                        <span style={{ fontSize: 11, color: c.muted }}>for {targetObj.objection}</span>
                      )}
                    </div>
                    <span style={{ fontSize: 11, color: c.muted }}>{sug.timestamp}</span>
                  </div>
                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => onReject(sug.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', fontSize: 11, fontWeight: 600, color: c.danger, background: `${c.danger}10`, border: `1px solid ${c.danger}30`, borderRadius: 7, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif', transition: 'background 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = `${c.danger}20` }}
                      onMouseLeave={e => { e.currentTarget.style.background = `${c.danger}10` }}
                    >
                      <XIcon /> Reject
                    </button>
                    <button
                      onClick={() => onApprove(sug.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', fontSize: 11, fontWeight: 600, color: c.success, background: `${c.success}10`, border: `1px solid ${c.success}30`, borderRadius: 7, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif', transition: 'background 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = `${c.success}20` }}
                      onMouseLeave={e => { e.currentTarget.style.background = `${c.success}10` }}
                    >
                      <CheckIcon /> Approve
                    </button>
                  </div>
                </div>

                {/* Suggested content block */}
                <div style={{ borderLeft: `3px solid ${c.accent}`, background: `${c.accent}08`, borderRadius: '0 8px 8px 0', padding: '10px 14px' }}>
                  {sug.type === 'new-opener' && sug.title && (
                    <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: c.accent, letterSpacing: '0.04em' }}>{sug.title}</p>
                  )}
                  {sug.type === 'new-objection' && sug.objectionText && (
                    <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: c.accent }}>{sug.objectionText}</p>
                  )}
                  <p style={{ margin: 0, fontSize: 12, color: c.textSecond, lineHeight: 1.65 }}>{sug.content}</p>
                </div>

                {/* Reason */}
                {sug.reason && (
                  <p style={{ margin: 0, fontSize: 11, color: c.muted, fontStyle: 'italic' }}>"{sug.reason}"</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Script Block ──────────────────────────────────────────────────────

function ScriptBlock({ text, c }: { text: string; c: C }) {
  return (
    <div style={{
      borderLeft: `3px solid ${c.accent}`,
      background: c.bg3,
      borderRadius: 8,
      padding: '16px 20px',
      transition: 'background 0.3s ease',
    }}>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 400, color: c.textSecond, lineHeight: 1.75 }}>{text}</p>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────

export default function Scripts() {
  const navigate = useNavigate()
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('agency-theme') as Theme) ?? 'light')
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<'admin' | 'caller' | null>(null)
  const [callerName, setCallerName] = useState<string | null>(null)
  const [signOutHov, setSignOutHov] = useState(false)

  // Openers state
  const [openers, setOpeners] = useState<Opener[]>(INITIAL_OPENERS)
  const [openerIdx, setOpenerIdx] = useState(0)
  const [openerAnimKey, setOpenerAnimKey] = useState(0)
  const [editingOpenerId, setEditingOpenerId] = useState<number | null>(null)
  const [openerDraft, setOpenerDraft] = useState({ title: '', script: '' })
  const [showAddOpener, setShowAddOpener] = useState(false)

  // Objections state
  const [objections, setObjections] = useState<Objection[]>(INITIAL_OBJECTIONS)
  const [openObjId, setOpenObjId] = useState<number | null>(null)
  const [editingObjId, setEditingObjId] = useState<number | null>(null)
  const [objDraft, setObjDraft] = useState({ objection: '', response: '' })
  const [showAddObj, setShowAddObj] = useState(false)

  // Stats state
  const [stats, setStats] = useState<Stat[]>(INITIAL_STATS)
  const [editingStatId, setEditingStatId] = useState<number | null>(null)
  const [statDraft, setStatDraft] = useState({ number: '', description: '', sourceName: '', sourceUrl: '' })
  const [showAddStat, setShowAddStat] = useState(false)
  const [statHover, setStatHover] = useState<number | null>(null)

  // Suggestions state
  const [suggestions, setSuggestions] = useState<Suggestion[]>(INITIAL_SUGGESTIONS)
  const [suggestModal, setSuggestModal] = useState<{
    mode: SuggestionType
    targetId?: number
    currentStat?: Stat
  } | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  const c = THEMES[theme]
  const isAdminPath = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')
  const isAdmin = role !== null ? role === 'admin' : isAdminPath

  const pendingCount = suggestions.filter(s => s.status === 'pending').length
  const myPendingOpeners = suggestions.filter(s => s.status === 'pending' && s.callerName === callerName && (s.type === 'new-opener' || s.type === 'edit-opener')).length
  const myPendingObjestions = suggestions.filter(s => s.status === 'pending' && s.callerName === callerName && (s.type === 'new-objection' || s.type === 'edit-objection')).length

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

  // Toast auto-dismiss
  useEffect(() => {
    if (!toastMsg) return
    const t = setTimeout(() => setToastMsg(null), 3000)
    return () => clearTimeout(t)
  }, [toastMsg])

  const currentOpener = openers[openerIdx] ?? openers[0]
  const userName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'User'

  function prevOpener() {
    setOpenerIdx(i => (i - 1 + openers.length) % openers.length)
    setOpenerAnimKey(k => k + 1)
    setEditingOpenerId(null)
  }
  function nextOpener() {
    setOpenerIdx(i => (i + 1) % openers.length)
    setOpenerAnimKey(k => k + 1)
    setEditingOpenerId(null)
  }

  function startEditOpener(opener: Opener) {
    setEditingOpenerId(opener.id)
    setOpenerDraft({ title: opener.title, script: opener.script })
  }
  function saveOpener() {
    setOpeners(prev => prev.map(o => o.id === editingOpenerId ? { ...o, ...openerDraft } : o))
    setEditingOpenerId(null)
  }

  function startEditObj(obj: Objection) {
    setEditingObjId(obj.id)
    setObjDraft({ objection: obj.objection, response: obj.response })
    setOpenObjId(null)
  }
  function saveObj() {
    setObjections(prev => prev.map(o => o.id === editingObjId ? { ...o, ...objDraft } : o))
    setEditingObjId(null)
  }
  function deleteObj(id: number) {
    setObjections(prev => prev.filter(o => o.id !== id))
    if (openObjId === id) setOpenObjId(null)
    if (editingObjId === id) setEditingObjId(null)
  }

  function toggleObj(id: number) {
    if (editingObjId !== null) return
    setOpenObjId(prev => prev === id ? null : id)
  }

  function handleSuggestSubmit(data: { title?: string; content: string; objectionText?: string; reason?: string; statUrl?: string }) {
    if (!suggestModal) return
    const newSug: Suggestion = {
      id: Date.now(),
      type: suggestModal.mode,
      callerName: callerName ?? 'Unknown',
      targetId: suggestModal.targetId,
      title: data.title,
      content: data.content,
      objectionText: data.objectionText,
      reason: data.reason,
      statUrl: data.statUrl,
      status: 'pending',
      timestamp: 'just now',
    }
    setSuggestions(prev => [...prev, newSug])
    setSuggestModal(null)
    setToastMsg('Suggestion submitted — admin will review it soon!')
  }

  function approveSuggestion(id: number) {
    const sug = suggestions.find(s => s.id === id)
    if (!sug) return
    if (sug.type === 'new-opener') {
      setOpeners(prev => [...prev, { id: Date.now(), title: sug.title ?? 'New Opener', script: sug.content }])
    } else if (sug.type === 'edit-opener') {
      setOpeners(prev => prev.map(o => o.id === sug.targetId ? { ...o, script: sug.content } : o))
    } else if (sug.type === 'new-objection') {
      setObjections(prev => [...prev, { id: Date.now(), objection: sug.objectionText ?? '', response: sug.content }])
    } else if (sug.type === 'edit-objection') {
      setObjections(prev => prev.map(o => o.id === sug.targetId ? { ...o, response: sug.content } : o))
    } else if (sug.type === 'new-stat') {
      setStats(prev => [...prev, { id: Date.now(), number: sug.title ?? '', description: sug.content, sourceName: sug.reason ?? '', sourceUrl: sug.statUrl }])
    } else if (sug.type === 'edit-stat') {
      setStats(prev => prev.map(s => s.id === sug.targetId ? { ...s, number: sug.title ?? s.number, description: sug.content, sourceName: sug.reason ?? s.sourceName, sourceUrl: sug.statUrl ?? s.sourceUrl } : s))
    }
    setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: 'approved' } : s))
    setToastMsg('Suggestion approved and applied!')
  }

  function rejectSuggestion(id: number) {
    setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: 'rejected' } : s))
    setToastMsg('Suggestion rejected.')
  }

  // Build grid items with inline expansion
  const activeObjIdx = objections.findIndex(o => o.id === openObjId)
  const activeRow = activeObjIdx >= 0 ? Math.floor(activeObjIdx / COLS) : -1

  type GridItem = { type: 'obj'; obj: Objection } | { type: 'expansion'; obj: Objection }
  const gridItems: GridItem[] = []
  objections.forEach((obj, i) => {
    gridItems.push({ type: 'obj', obj })
    const isLastInRow = (i % COLS === COLS - 1) || (i === objections.length - 1)
    if (isLastInRow && Math.floor(i / COLS) === activeRow && openObjId !== null) {
      const activeObj = objections.find(o => o.id === openObjId)!
      gridItems.push({ type: 'expansion', obj: activeObj })
    }
  })

  const fieldStyle = { width: '100%', padding: '8px 10px', fontSize: 13, background: c.bg2, border: `1px solid ${c.border}`, borderRadius: 8, color: c.text, fontFamily: '"Plus Jakarta Sans", sans-serif', outline: 'none', boxSizing: 'border-box' as const }

  const navTabs = isAdmin
    ? [
        { label: 'Dashboard',     path: '/admin',           active: false, badge: 0 },
        { label: 'Sales Finance', path: '/admin/finances',  active: false, badge: 0 },
        { label: 'Leads',         path: '/admin/leads',     active: false, badge: 0 },
        { label: 'Rejected',      path: '/admin/rejected',  active: false, badge: 0 },
        { label: 'Clients',       path: '/admin/clients',   active: false, badge: 0 },
        { label: 'Calendar',      path: '/admin/calendar',  active: false, badge: 0 },
        { label: 'Scripts',       path: '/admin/scripts',   active: true,  badge: pendingCount },
      ]
    : [
        { label: 'Overview',    path: '/dashboard',             active: false, badge: 0 },
        { label: 'My Leads',    path: '/dashboard/leads',       active: false, badge: 0 },
        { label: 'Rejected',    path: '/dashboard/rejected',    active: false, badge: 0 },
        { label: 'Clients',     path: '/dashboard/clients',     active: false, badge: 0 },
        { label: 'Calendar',    path: '/dashboard/calendar',    active: false, badge: 0 },
        { label: 'Scripts',     path: '/dashboard/scripts',     active: true,  badge: 0 },
      ]

  // Opener suggest button (for current opener, per caller)
  const openerPendingSugCount = suggestModal === null
    ? suggestions.filter(s => s.status === 'pending' && s.callerName === callerName && s.type === 'edit-opener' && s.targetId === currentOpener?.id).length
    : 0

  return (
    <>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes openerFade {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes expandDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
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
              <button key={tab.path} onClick={() => navigate(tab.path)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 16px', fontSize: 13, fontWeight: tab.active ? 600 : 500, color: tab.active ? c.accent : c.muted, background: 'none', border: 'none', cursor: 'pointer', borderBottom: tab.active ? `2px solid ${c.accent}` : '2px solid transparent', transition: 'color 0.15s ease, border-color 0.15s ease' }}>
                {tab.label}
                {tab.badge > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, background: c.warning, color: '#fff', borderRadius: 20, padding: '1px 6px', minWidth: 18, textAlign: 'center', lineHeight: '16px' }}>
                    {tab.badge}
                  </span>
                )}
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
        <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: '16px 24px', gap: 14 }}>

          {/* ── PENDING SUGGESTIONS PANEL (admin only) ── */}
          {isAdmin && pendingCount > 0 && (
            <div style={{ flexShrink: 0 }}>
              <PendingSuggestionsPanel
                c={c}
                suggestions={suggestions}
                objections={objections}
                onApprove={approveSuggestion}
                onReject={rejectSuggestion}
              />
            </div>
          )}

          {/* ── OPENERS SECTION ── */}
          <div style={{ height: 260, flexShrink: 0, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 20, padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 12, animation: 'fadeSlideUp 0.3s ease both', animationDelay: '0.05s', transition: 'background 0.3s ease, border-color 0.3s ease' }}>
            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Openers</p>
                <h2 style={{ margin: '3px 0 0', fontSize: 22, fontWeight: 800, color: c.text, letterSpacing: '-0.02em', lineHeight: 1 }}>Call Openers</h2>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {isAdmin ? (
                  <button
                    onClick={() => setShowAddOpener(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', fontSize: 12, fontWeight: 600, color: c.accent, background: `${c.accent}12`, border: `1px solid ${c.accent}30`, borderRadius: 9, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif', transition: 'background 0.15s' }}
                  >
                    + Add Opener
                  </button>
                ) : !isAdmin ? (
                  <button
                    onClick={() => setSuggestModal({ mode: 'new-opener' })}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', fontSize: 12, fontWeight: 600, color: c.accent2, background: `${c.accent2}12`, border: `1px solid ${c.accent2}30`, borderRadius: 9, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif', transition: 'background 0.15s', position: 'relative' }}
                  >
                    <LightbulbIcon /> Suggest Opener
                    {myPendingOpeners > 0 && (
                      <span style={{ fontSize: 9, fontWeight: 700, background: c.warning, color: '#fff', borderRadius: 20, padding: '1px 5px', marginLeft: 2 }}>{myPendingOpeners}</span>
                    )}
                  </button>
                ) : null}
              </div>
            </div>

            {/* Carousel */}
            <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Left arrow */}
              <button
                onClick={prevOpener}
                style={{ width: 36, height: 36, borderRadius: '50%', border: `1px solid ${c.border}`, background: c.bg3, color: c.textSecond, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'border-color 0.15s, color 0.15s, background 0.15s' }}
                onMouseEnter={e => { const b = e.currentTarget; b.style.borderColor = c.accent; b.style.color = c.accent; b.style.background = `${c.accent}12` }}
                onMouseLeave={e => { const b = e.currentTarget; b.style.borderColor = c.border; b.style.color = c.textSecond; b.style.background = c.bg3 }}
              >
                <ChevronLeft />
              </button>

              {/* Opener card */}
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div
                  key={openerAnimKey}
                  style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 10, animation: 'openerFade 0.25s ease both', overflow: 'hidden' }}
                >
                  {/* Title row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                    {editingOpenerId === currentOpener.id ? (
                      <input
                        value={openerDraft.title}
                        onChange={e => setOpenerDraft(d => ({ ...d, title: e.target.value }))}
                        style={{ ...fieldStyle, fontSize: 16, fontWeight: 700 }}
                      />
                    ) : (
                      <span style={{ fontSize: 16, fontWeight: 700, color: c.accent }}>{currentOpener.title}</span>
                    )}
                    {isAdmin && editingOpenerId !== currentOpener.id && (
                      <button
                        onClick={() => startEditOpener(currentOpener)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: 11, fontWeight: 600, color: c.muted, background: 'transparent', border: `1px solid ${c.border}`, borderRadius: 7, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif', transition: 'color 0.15s, border-color 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.color = c.accent; e.currentTarget.style.borderColor = c.accent }}
                        onMouseLeave={e => { e.currentTarget.style.color = c.muted; e.currentTarget.style.borderColor = c.border }}
                      >
                        <PencilIcon /> Edit
                      </button>
                    )}
                    {!isAdmin && editingOpenerId !== currentOpener.id && (
                      <button
                        onClick={() => setSuggestModal({ mode: 'edit-opener', targetId: currentOpener.id })}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: 11, fontWeight: 600, color: c.accent2, background: `${c.accent2}10`, border: `1px solid ${c.accent2}30`, borderRadius: 7, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif', transition: 'color 0.15s, border-color 0.15s, background 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = `${c.accent2}20` }}
                        onMouseLeave={e => { e.currentTarget.style.background = `${c.accent2}10` }}
                      >
                        <LightbulbIcon /> Suggest Edit
                        {openerPendingSugCount > 0 && (
                          <span style={{ fontSize: 9, fontWeight: 700, background: c.warning, color: '#fff', borderRadius: 20, padding: '1px 5px' }}>{openerPendingSugCount}</span>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Script block */}
                  <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                    {editingOpenerId === currentOpener.id ? (
                      <textarea
                        value={openerDraft.script}
                        onChange={e => setOpenerDraft(d => ({ ...d, script: e.target.value }))}
                        style={{ ...fieldStyle, height: '100%', resize: 'none', lineHeight: 1.7 }}
                      />
                    ) : (
                      <ScriptBlock text={currentOpener.script} c={c} />
                    )}
                  </div>

                  {/* Edit actions */}
                  {editingOpenerId === currentOpener.id && (
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button onClick={saveOpener} style={{ padding: '7px 16px', fontSize: 12, fontWeight: 600, background: c.accent, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Save</button>
                      <button onClick={() => setEditingOpenerId(null)} style={{ padding: '7px 16px', fontSize: 12, fontWeight: 600, background: 'transparent', color: c.textSecond, border: `1px solid ${c.border}`, borderRadius: 8, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Cancel</button>
                    </div>
                  )}
                </div>

                {/* Counter */}
                <p style={{ margin: '8px 0 0', fontSize: 11, color: c.muted, textAlign: 'center', flexShrink: 0 }}>
                  Opener {openerIdx + 1} of {openers.length}
                </p>
              </div>

              {/* Right arrow */}
              <button
                onClick={nextOpener}
                style={{ width: 36, height: 36, borderRadius: '50%', border: `1px solid ${c.border}`, background: c.bg3, color: c.textSecond, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'border-color 0.15s, color 0.15s, background 0.15s' }}
                onMouseEnter={e => { const b = e.currentTarget; b.style.borderColor = c.accent; b.style.color = c.accent; b.style.background = `${c.accent}12` }}
                onMouseLeave={e => { const b = e.currentTarget; b.style.borderColor = c.border; b.style.color = c.textSecond; b.style.background = c.bg3 }}
              >
                <ChevronRight />
              </button>
            </div>
          </div>

          {/* ── QUICK STATS SECTION ── */}
          <div style={{ flexShrink: 0, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 20, padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 12, animation: 'fadeSlideUp 0.3s ease both', animationDelay: '0.1s', transition: 'background 0.3s ease, border-color 0.3s ease' }}>
            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Quick Stats</p>
                <h2 style={{ margin: '3px 0 0', fontSize: 22, fontWeight: 800, color: c.text, letterSpacing: '-0.02em', lineHeight: 1 }}>Facts That Close Deals</h2>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: c.muted }}>Use these in your pitch — all sourced</p>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {isAdmin ? (
                  <button
                    onClick={() => setShowAddStat(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', fontSize: 12, fontWeight: 600, color: c.accent, background: `${c.accent}12`, border: `1px solid ${c.accent}30`, borderRadius: 9, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif', transition: 'background 0.15s' }}
                  >
                    + Add Stat
                  </button>
                ) : !isAdmin ? (
                  <button
                    onClick={() => setSuggestModal({ mode: 'new-stat' })}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', fontSize: 12, fontWeight: 600, color: c.accent2, background: `${c.accent2}12`, border: `1px solid ${c.accent2}30`, borderRadius: 9, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif', transition: 'background 0.15s' }}
                  >
                    <LightbulbIcon /> Suggest Stat
                  </button>
                ) : null}
              </div>
            </div>

            {/* Stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {stats.map(stat => {
                const isEditingStat = stat.id === editingStatId
                const isHovered = stat.id === statHover

                if (isEditingStat) {
                  return (
                    <div key={stat.id} style={{ background: c.bg2, border: `1px solid ${c.accent}`, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <input value={statDraft.number} onChange={e => setStatDraft(d => ({ ...d, number: e.target.value }))} style={{ padding: '6px 8px', fontSize: 13, fontWeight: 700, background: c.bg3, border: `1px solid ${c.border}`, borderRadius: 7, color: c.text, outline: 'none', fontFamily: '"Plus Jakarta Sans", sans-serif' }} placeholder="97%" />
                      <textarea value={statDraft.description} onChange={e => setStatDraft(d => ({ ...d, description: e.target.value }))} rows={2} style={{ padding: '6px 8px', fontSize: 12, background: c.bg3, border: `1px solid ${c.border}`, borderRadius: 7, color: c.text, outline: 'none', resize: 'none', fontFamily: '"Plus Jakarta Sans", sans-serif', lineHeight: 1.5 }} placeholder="description…" />
                      <input value={statDraft.sourceName} onChange={e => setStatDraft(d => ({ ...d, sourceName: e.target.value }))} style={{ padding: '6px 8px', fontSize: 11, background: c.bg3, border: `1px solid ${c.border}`, borderRadius: 7, color: c.textSecond, outline: 'none', fontFamily: '"Plus Jakarta Sans", sans-serif' }} placeholder="Source name" />
                      <input value={statDraft.sourceUrl} onChange={e => setStatDraft(d => ({ ...d, sourceUrl: e.target.value }))} style={{ padding: '6px 8px', fontSize: 11, background: c.bg3, border: `1px solid ${c.border}`, borderRadius: 7, color: c.textSecond, outline: 'none', fontFamily: '"Plus Jakarta Sans", sans-serif' }} placeholder="https://…" />
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => { setStats(prev => prev.map(s => s.id === stat.id ? { ...s, ...statDraft } : s)); setEditingStatId(null) }} style={{ padding: '5px 12px', fontSize: 11, fontWeight: 600, background: c.accent, color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Save</button>
                        <button onClick={() => setEditingStatId(null)} style={{ padding: '5px 12px', fontSize: 11, fontWeight: 600, background: 'transparent', color: c.textSecond, border: `1px solid ${c.border}`, borderRadius: 7, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Cancel</button>
                        <button onClick={() => { setStats(prev => prev.filter(s => s.id !== stat.id)); setEditingStatId(null) }} style={{ marginLeft: 'auto', padding: '5px 8px', fontSize: 11, fontWeight: 600, color: c.danger, background: 'transparent', border: `1px solid ${c.danger}40`, borderRadius: 7, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Delete</button>
                      </div>
                    </div>
                  )
                }

                return (
                  <div
                    key={stat.id}
                    onMouseEnter={() => setStatHover(stat.id)}
                    onMouseLeave={() => setStatHover(null)}
                    style={{
                      background: c.bg2, border: `1px solid ${c.border}`, borderRadius: 12, padding: 16,
                      display: 'flex', flexDirection: 'column', gap: 6, position: 'relative',
                      transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
                      boxShadow: isHovered ? '0 8px 20px rgba(0,0,0,0.1)' : 'none',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
                      borderColor: isHovered ? c.accent + '40' : c.border,
                    }}
                  >
                    <span style={{ fontSize: 32, fontWeight: 800, color: c.accent, lineHeight: 1, letterSpacing: '-0.02em' }}>{stat.number}</span>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: c.text, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{stat.description}</p>
                    {stat.sourceName && (
                      stat.sourceUrl ? (
                        <a href={stat.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: c.muted, textDecoration: 'underline', marginTop: 'auto', paddingTop: 4 }}>{stat.sourceName}</a>
                      ) : (
                        <span style={{ fontSize: 11, color: c.muted, marginTop: 'auto', paddingTop: 4 }}>{stat.sourceName}</span>
                      )
                    )}
                    {/* Admin controls */}
                    {isAdmin && isHovered && (
                      <button
                        onClick={() => { setEditingStatId(stat.id); setStatDraft({ number: stat.number, description: stat.description, sourceName: stat.sourceName, sourceUrl: stat.sourceUrl ?? '' }) }}
                        style={{ position: 'absolute', top: 10, right: 10, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', background: c.bg3, border: `1px solid ${c.border}`, borderRadius: 7, cursor: 'pointer', color: c.muted }}
                      >
                        <PencilIcon />
                      </button>
                    )}
                    {/* Caller suggest edit */}
                    {!isAdmin && isHovered && (
                      <button
                        onClick={() => setSuggestModal({ mode: 'edit-stat', targetId: stat.id, currentStat: stat })}
                        style={{ position: 'absolute', top: 10, right: 10, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${c.accent2}12`, border: `1px solid ${c.accent2}30`, borderRadius: 7, cursor: 'pointer', color: c.accent2 }}
                      >
                        <LightbulbIcon />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── OBJECTIONS SECTION ── */}
          <div style={{ minHeight: 340, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 20, padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 12, animation: 'fadeSlideUp 0.3s ease both', animationDelay: '0.15s', transition: 'background 0.3s ease, border-color 0.3s ease' }}>
            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Objections</p>
                <h2 style={{ margin: '3px 0 0', fontSize: 22, fontWeight: 800, color: c.text, letterSpacing: '-0.02em', lineHeight: 1 }}>Handle Objections</h2>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {isAdmin ? (
                  <button
                    onClick={() => setShowAddObj(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', fontSize: 12, fontWeight: 600, color: c.accent, background: `${c.accent}12`, border: `1px solid ${c.accent}30`, borderRadius: 9, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif', transition: 'background 0.15s' }}
                  >
                    + Add Objection
                  </button>
                ) : !isAdmin ? (
                  <button
                    onClick={() => setSuggestModal({ mode: 'new-objection' })}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', fontSize: 12, fontWeight: 600, color: c.accent2, background: `${c.accent2}12`, border: `1px solid ${c.accent2}30`, borderRadius: 9, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif', transition: 'background 0.15s' }}
                  >
                    <LightbulbIcon /> Suggest Objection
                    {myPendingObjestions > 0 && (
                      <span style={{ fontSize: 9, fontWeight: 700, background: c.warning, color: '#fff', borderRadius: 20, padding: '1px 5px', marginLeft: 2 }}>{myPendingObjestions}</span>
                    )}
                  </button>
                ) : null}
              </div>
            </div>

            {/* Grid (scrollable) */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {gridItems.map((item) => {
                  if (item.type === 'expansion') {
                    return (
                      <div
                        key={`expansion-${openObjId}`}
                        style={{ gridColumn: '1 / -1', animation: 'expandDown 0.2s ease both' }}
                      >
                        <div style={{ borderLeft: `3px solid ${c.accent}`, background: c.bg3, borderRadius: 8, padding: '16px 20px', position: 'relative' }}>
                          <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 400, color: c.textSecond, lineHeight: 1.7 }}>
                            {item.obj.response}
                          </p>
                          <button
                            onClick={() => setOpenObjId(null)}
                            style={{ fontSize: 12, fontWeight: 600, color: c.muted, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontFamily: '"Plus Jakarta Sans", sans-serif', transition: 'color 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.color = c.accent }}
                            onMouseLeave={e => { e.currentTarget.style.color = c.muted }}
                          >
                            ↑ Close
                          </button>
                        </div>
                      </div>
                    )
                  }

                  const { obj } = item
                  const isOpen = obj.id === openObjId
                  const isEditing = obj.id === editingObjId
                  const objPendingCount = suggestions.filter(s => s.status === 'pending' && s.callerName === callerName && s.type === 'edit-objection' && s.targetId === obj.id).length

                  if (isEditing) {
                    return (
                      <div key={obj.id} style={{ background: c.bg2, border: `1px solid ${c.accent}`, borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <input
                          value={objDraft.objection}
                          onChange={e => setObjDraft(d => ({ ...d, objection: e.target.value }))}
                          style={{ ...fieldStyle, fontSize: 13, fontWeight: 600 }}
                          placeholder="Objection text"
                        />
                        <textarea
                          value={objDraft.response}
                          onChange={e => setObjDraft(d => ({ ...d, response: e.target.value }))}
                          rows={3}
                          style={{ ...fieldStyle, resize: 'none', lineHeight: 1.5, fontSize: 12 }}
                          placeholder="Your response…"
                        />
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={saveObj} style={{ padding: '6px 14px', fontSize: 11, fontWeight: 600, background: c.accent, color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Save</button>
                          <button onClick={() => setEditingObjId(null)} style={{ padding: '6px 14px', fontSize: 11, fontWeight: 600, background: 'transparent', color: c.textSecond, border: `1px solid ${c.border}`, borderRadius: 7, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Cancel</button>
                          <button onClick={() => deleteObj(obj.id)} style={{ marginLeft: 'auto', padding: '6px 10px', fontSize: 11, fontWeight: 600, color: c.danger, background: 'transparent', border: `1px solid ${c.danger}40`, borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                            <TrashIcon /> Delete
                          </button>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <button
                      key={obj.id}
                      onClick={() => toggleObj(obj.id)}
                      style={{
                        background: isOpen ? `${c.accent}0c` : c.bg2,
                        border: `1px solid ${isOpen ? c.accent : c.border}`,
                        borderRadius: 10, padding: '14px 16px',
                        cursor: 'pointer', textAlign: 'left',
                        fontFamily: '"Plus Jakarta Sans", sans-serif',
                        transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s, transform 0.15s',
                        boxShadow: isOpen ? `0 4px 14px ${c.accent}20` : 'none',
                        transform: 'none',
                        position: 'relative',
                      }}
                      onMouseEnter={e => {
                        if (!isOpen) {
                          e.currentTarget.style.borderColor = c.accent
                          e.currentTarget.style.boxShadow = `0 4px 12px rgba(0,0,0,0.08)`
                          e.currentTarget.style.transform = 'translateY(-1px)'
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isOpen) {
                          e.currentTarget.style.borderColor = c.border
                          e.currentTarget.style.boxShadow = 'none'
                          e.currentTarget.style.transform = 'none'
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: c.text, lineHeight: 1.4 }}>{obj.objection}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                          {isAdmin && (
                            <span
                              onClick={e => { e.stopPropagation(); startEditObj(obj) }}
                              style={{ display: 'flex', alignItems: 'center', padding: 4, borderRadius: 5, color: c.muted, cursor: 'pointer', transition: 'color 0.15s, background 0.15s' }}
                              onMouseEnter={e => { e.currentTarget.style.color = c.accent; e.currentTarget.style.background = `${c.accent}14` }}
                              onMouseLeave={e => { e.currentTarget.style.color = c.muted; e.currentTarget.style.background = 'transparent' }}
                            >
                              <PencilIcon />
                            </span>
                          )}
                          {!isAdmin && (
                            <span
                              onClick={e => { e.stopPropagation(); setSuggestModal({ mode: 'edit-objection', targetId: obj.id }) }}
                              style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 6px', borderRadius: 5, color: c.accent2, cursor: 'pointer', transition: 'color 0.15s, background 0.15s', fontSize: 10, fontWeight: 600 }}
                              onMouseEnter={e => { e.currentTarget.style.background = `${c.accent2}14` }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                            >
                              <LightbulbIcon />
                              {objPendingCount > 0 && (
                                <span style={{ fontSize: 9, fontWeight: 700, background: c.warning, color: '#fff', borderRadius: 20, padding: '1px 4px' }}>{objPendingCount}</span>
                              )}
                            </span>
                          )}
                          <span style={{ fontSize: 14, color: isOpen ? c.accent : c.muted, transition: 'transform 0.2s, color 0.15s', display: 'inline-block', transform: isOpen ? 'rotate(180deg)' : 'none' }}>
                            ↓
                          </span>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Add Opener Modal */}
      {showAddOpener && (
        <AddModal
          c={c}
          mode="opener"
          onClose={() => setShowAddOpener(false)}
          onAdd={({ title, script }) => {
            setOpeners(prev => [...prev, { id: Date.now(), title: title!, script: script! }])
            setOpenerIdx(openers.length)
            setOpenerAnimKey(k => k + 1)
            setShowAddOpener(false)
          }}
        />
      )}

      {/* Add Objection Modal */}
      {showAddObj && (
        <AddModal
          c={c}
          mode="objection"
          onClose={() => setShowAddObj(false)}
          onAdd={({ objection, response }) => {
            setObjections(prev => [...prev, { id: Date.now(), objection: objection!, response: response! }])
            setShowAddObj(false)
          }}
        />
      )}

      {/* Add Stat Modal */}
      {showAddStat && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(2px)' }} onClick={() => setShowAddStat(false)}>
          <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16, padding: 28, width: 480, maxWidth: 'calc(100vw - 48px)', boxShadow: '0 24px 48px rgba(0,0,0,0.25)', animation: 'fadeSlideUp 0.2s ease both', display: 'flex', flexDirection: 'column', gap: 14 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: c.text, letterSpacing: '-0.02em' }}>Add Stat</h2>
            {(() => {
              const fs2 = { width: '100%', padding: '9px 11px', fontSize: 13, background: c.bg2, border: `1px solid ${c.border}`, borderRadius: 8, color: c.text, fontFamily: '"Plus Jakarta Sans", sans-serif', outline: 'none', boxSizing: 'border-box' as const }
              const ls2 = { display: 'block', fontSize: 10, fontWeight: 700 as const, color: c.muted, textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 7 }
              return (
                <>
                  <div><label style={ls2}>Stat Number / %</label><input value={statDraft.number} onChange={e => setStatDraft(d => ({ ...d, number: e.target.value }))} style={fs2} placeholder='e.g. "97%"' /></div>
                  <div><label style={ls2}>Description</label><textarea value={statDraft.description} onChange={e => setStatDraft(d => ({ ...d, description: e.target.value }))} rows={2} style={{ ...fs2, resize: 'none', lineHeight: 1.65 }} placeholder="of consumers who…" /></div>
                  <div><label style={ls2}>Source Name</label><input value={statDraft.sourceName} onChange={e => setStatDraft(d => ({ ...d, sourceName: e.target.value }))} style={fs2} placeholder='e.g. "HubSpot 2024"' /></div>
                  <div><label style={ls2}>Source URL <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label><input value={statDraft.sourceUrl} onChange={e => setStatDraft(d => ({ ...d, sourceUrl: e.target.value }))} style={fs2} placeholder="https://…" /></div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button onClick={() => { setShowAddStat(false); setStatDraft({ number: '', description: '', sourceName: '', sourceUrl: '' }) }} style={{ padding: '9px 18px', fontSize: 13, fontWeight: 600, background: 'transparent', border: `1px solid ${c.border}`, color: c.textSecond, borderRadius: 10, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Cancel</button>
                    <button
                      onClick={() => {
                        if (!statDraft.number.trim() || !statDraft.description.trim()) return
                        setStats(prev => [...prev, { id: Date.now(), number: statDraft.number, description: statDraft.description, sourceName: statDraft.sourceName, sourceUrl: statDraft.sourceUrl || undefined }])
                        setShowAddStat(false)
                        setStatDraft({ number: '', description: '', sourceName: '', sourceUrl: '' })
                      }}
                      disabled={!statDraft.number.trim() || !statDraft.description.trim()}
                      style={{ padding: '9px 18px', fontSize: 13, fontWeight: 600, background: statDraft.number.trim() && statDraft.description.trim() ? c.accent : c.bg3, color: statDraft.number.trim() && statDraft.description.trim() ? '#fff' : c.muted, border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif' }}
                    >Add Stat</button>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* Suggest Modal */}
      {suggestModal && (
        <SuggestModal
          c={c}
          mode={suggestModal.mode}
          currentOpener={suggestModal.mode === 'edit-opener' ? openers.find(o => o.id === suggestModal.targetId) : undefined}
          currentObjection={suggestModal.mode === 'edit-objection' ? objections.find(o => o.id === suggestModal.targetId) : undefined}
          currentStat={suggestModal.mode === 'edit-stat' ? suggestModal.currentStat : undefined}
          onClose={() => setSuggestModal(null)}
          onSubmit={handleSuggestSubmit}
        />
      )}

      {/* Toast */}
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: c.text, color: c.bg, borderRadius: 10, padding: '11px 20px',
          fontSize: 13, fontWeight: 600, fontFamily: '"Plus Jakarta Sans", sans-serif',
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)', zIndex: 999,
          animation: 'toastIn 0.2s ease both', whiteSpace: 'nowrap',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <CheckIcon /> {toastMsg}
        </div>
      )}
    </>
  )
}
