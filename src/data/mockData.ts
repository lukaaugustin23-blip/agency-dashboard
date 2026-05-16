// ── Types ─────────────────────────────────────────────────────────────

export type Stage = 'new' | 'contacted' | 'maybe' | 'meeting' | 'proposal' | 'won' | 'lost'
export type MeetingType = 'Discovery Call' | 'Demo/Presentation' | 'Follow-up' | 'Closing'
export type RejectionReason = 'No Budget' | 'Not Interested' | 'Went with Competitor' | 'Bad Timing' | 'Other'
export type ClientStatus = 'active' | 'completed' | 'upsell_ready'

export interface Caller {
  id: string        // lowercase, e.g. 'alex'
  name: string      // display name
  email: string
  color: string
  colorEnd: string
  feePercent: number
}

export interface Lead {
  id: string
  business: string
  type: string
  contact: string
  phone?: string
  notes?: string
  callerId: string
  addedDate: string   // YYYY-MM-DD
  stage: Stage
  dealValue?: number
  closedDate?: string
  lostDate?: string
  lostReason?: string
}

export interface Meeting {
  id: string
  business: string
  contactName?: string
  date: string
  startTime: string   // "H:MM" or "HH:MM"
  durationMinutes: number
  assignee: string    // display name (e.g. 'Alex')
  type: MeetingType
  notes?: string
  personalConnection?: string
}

export interface ClientServices {
  website: boolean
  seo: boolean
  mcp: boolean
  socialMedia: boolean
  branding: boolean
}

export interface ClientRecord {
  services: ClientServices
  notes: string
  status: ClientStatus
  lastContact: string
}

// ── Callers ───────────────────────────────────────────────────────────

export const CALLERS: Caller[] = [
  { id: 'alex',   name: 'Alex',   email: 'alexcychu18@gmail.com',     color: '#0ea5e9', colorEnd: '#0284c7', feePercent: 20 },
  { id: 'hudson', name: 'Hudson', email: 'hudsonmachuca25@gmail.com', color: '#8b5cf6', colorEnd: '#6d28d9', feePercent: 20 },
  { id: 'julian', name: 'Julian', email: 'juliandreyer67@gmail.com',  color: '#f59e0b', colorEnd: '#d97706', feePercent: 20 },
  { id: 'aaron',  name: 'Aaron',  email: 'jordanbtee@gmail.com',      color: '#10b981', colorEnd: '#059669', feePercent: 20 },
  { id: 'meissa', name: 'Meissa', email: 'meissadude@gmail.com',      color: '#f43f5e', colorEnd: '#e11d48', feePercent: 20 },
]

// ── Admins ────────────────────────────────────────────────────────────

export interface Admin {
  id: string
  name: string
  email: string
  color: string
  colorEnd: string
  feePercent: number   // base split on every deal
  finderBonus: number  // extra % on deals they personally found
  role: 'admin'
}

export const ADMINS: Admin[] = [
  { id: 'luka',   name: 'Luka',   email: 'luka.augustin23@gmail.com', color: '#6366f1', colorEnd: '#4f46e5', feePercent: 50, finderBonus: 20, role: 'admin' },
  { id: 'samvit', name: 'Samvit', email: 'samvittapuriah@gmail.com',   color: '#64748b', colorEnd: '#475569', feePercent: 30, finderBonus: 20, role: 'admin' },
]

export const ADMIN_IDS: Set<string> = new Set(ADMINS.map(a => a.id))

// Backward-compat helpers — include admins so CALLER_COLORS['Luka'] works everywhere
export const CALLER_COLORS: Record<string, string> = Object.fromEntries([...CALLERS, ...ADMINS].map(c => [c.name, c.color]))
export const CALLER_COLOR_BY_ID: Record<string, string> = Object.fromEntries([...CALLERS, ...ADMINS].map(c => [c.id, c.color]))
export const CALLER_EMAIL_MAP: Record<string, string> = Object.fromEntries([...CALLERS, ...ADMINS].map(c => [c.email, c.name]))
export const CALLERS_LIST: string[] = CALLERS.map(c => c.name)

// ── 24 Leads ──────────────────────────────────────────────────────────
// Won (6):  Alex 2 deals/$6k, Hudson 1/$2.5k, Aaron 1/$2.5k, Julian 1/$3k, Meissa 1/$2.5k
// Revenue MTD (May 2026): Prism Labs + Coastal Realty = $5,000  |  Deals this week: 2
// Total revenue: $16,500  |  Avg deal: $2,750

export const INITIAL_LEADS: Lead[] = []

// ── 7 Meetings ────────────────────────────────────────────────────────

export const INITIAL_MEETINGS: Meeting[] = []

// ── Team members (callers + admins) for online presence ───────────────

export interface TeamMember {
  name: string
  color: string
}

export const ALL_TEAM_MEMBERS: TeamMember[] = [
  { name: 'Alex',   color: '#0ea5e9' },
  { name: 'Hudson', color: '#8b5cf6' },
  { name: 'Julian', color: '#f59e0b' },
  { name: 'Aaron',  color: '#10b981' },
  { name: 'Meissa', color: '#f43f5e' },
  { name: 'Luka',   color: '#6366f1' },
  { name: 'Samvit', color: '#64748b' },
]

// ── Client supplementary data (keyed by lead.id) ──────────────────────

export const INITIAL_CLIENT_DATA: Record<string, ClientRecord> = {}
