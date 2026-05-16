import type { Lead, Meeting, ClientRecord } from '../data/mockData'

// ── Row types (snake_case, matches Supabase columns) ────────────────────

export interface LeadRow {
  id: string
  business: string
  type: string
  contact: string
  phone: string | null
  notes: string | null
  caller_id: string
  added_date: string
  stage: string
  deal_value: number | null
  closed_date: string | null
  lost_date: string | null
  lost_reason: string | null
  created_at: string
  updated_at: string
}

export interface MeetingRow {
  id: string
  business: string
  contact_name: string | null
  date: string
  start_time: string
  duration_minutes: number
  assignee: string
  type: string
  notes: string | null
  personal_connection: string | null
  created_at: string
}

export interface ClientDataRow {
  id: string
  lead_id: string
  services: ClientRecord['services']
  notes: string
  status: string
  last_contact: string | null
  updated_at: string
}

export interface ActivityLogRow {
  id: string
  action: string
  entity_type: string
  entity_id: string | null
  caller_id: string | null
  meta: Record<string, unknown> | null
  created_at: string
}

// ── Mappers: row → app type ──────────────────────────────────────────────

export function mapLeadRow(row: LeadRow): Lead {
  return {
    id: row.id,
    business: row.business,
    type: row.type,
    contact: row.contact,
    phone: row.phone ?? undefined,
    notes: row.notes ?? undefined,
    callerId: row.caller_id,
    addedDate: row.added_date,
    stage: row.stage as Lead['stage'],
    dealValue: row.deal_value ?? undefined,
    closedDate: row.closed_date ?? undefined,
    lostDate: row.lost_date ?? undefined,
    lostReason: row.lost_reason ?? undefined,
  }
}

export function mapMeetingRow(row: MeetingRow): Meeting {
  return {
    id: row.id,
    business: row.business,
    contactName: row.contact_name ?? undefined,
    date: row.date,
    startTime: row.start_time,
    durationMinutes: row.duration_minutes,
    assignee: row.assignee,
    type: row.type as Meeting['type'],
    notes: row.notes ?? undefined,
    personalConnection: row.personal_connection ?? undefined,
  }
}

export function mapClientDataRow(row: ClientDataRow): ClientRecord {
  return {
    services: row.services,
    notes: row.notes,
    status: row.status as ClientRecord['status'],
    lastContact: row.last_contact ?? '',
  }
}

// ── Mappers: app type → row insert shape ─────────────────────────────────

export function leadToRow(lead: Lead): Omit<LeadRow, 'created_at' | 'updated_at'> {
  return {
    id: lead.id,
    business: lead.business,
    type: lead.type,
    contact: lead.contact,
    phone: lead.phone ?? null,
    notes: lead.notes ?? null,
    caller_id: lead.callerId,
    added_date: lead.addedDate,
    stage: lead.stage,
    deal_value: lead.dealValue ?? null,
    closed_date: lead.closedDate ?? null,
    lost_date: lead.lostDate ?? null,
    lost_reason: lead.lostReason ?? null,
  }
}

export function meetingToRow(m: Meeting): Omit<MeetingRow, 'created_at'> {
  return {
    id: m.id,
    business: m.business,
    contact_name: m.contactName ?? null,
    date: m.date,
    start_time: m.startTime,
    duration_minutes: m.durationMinutes,
    assignee: m.assignee,
    type: m.type,
    notes: m.notes ?? null,
    personal_connection: m.personalConnection ?? null,
  }
}

export function clientDataToRow(
  leadId: string,
  record: ClientRecord,
): Omit<ClientDataRow, 'id' | 'updated_at'> {
  return {
    lead_id: leadId,
    services: record.services,
    notes: record.notes,
    status: record.status,
    last_contact: record.lastContact || null,
  }
}
