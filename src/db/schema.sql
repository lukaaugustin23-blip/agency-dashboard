-- ============================================================
-- Cooked Agency CRM — Supabase Schema
-- Run once in: Supabase Dashboard → SQL Editor → Run
-- Project URL: https://wrjehgtrhtkyecqkhgbl.supabase.co
-- ============================================================

-- ── Helper functions ────────────────────────────────────────

create or replace function is_admin()
returns boolean
language sql
stable
security definer
as $$
  select auth.email() in ('luka.augustin23@gmail.com', 'samvittapuriah@gmail.com')
$$;

create or replace function my_caller_id()
returns text
language sql
stable
security definer
as $$
  select case auth.email()
    when 'alexcychu18@gmail.com'     then 'alex'
    when 'hudsonmachuca25@gmail.com' then 'hudson'
    when 'juliandreyer67@gmail.com'  then 'julian'
    when 'ahe123488@gmail.com'      then 'aaron'
    when 'meissadude@gmail.com'      then 'meissa'
    when 'luka.augustin23@gmail.com' then 'luka'
    when 'samvittapuriah@gmail.com'  then 'samvit'
    else null
  end
$$;

create or replace function my_display_name()
returns text
language sql
stable
security definer
as $$
  select case auth.email()
    when 'alexcychu18@gmail.com'     then 'Alex'
    when 'hudsonmachuca25@gmail.com' then 'Hudson'
    when 'juliandreyer67@gmail.com'  then 'Julian'
    when 'ahe123488@gmail.com'      then 'Aaron'
    when 'meissadude@gmail.com'      then 'Meissa'
    when 'luka.augustin23@gmail.com' then 'Luka'
    when 'samvittapuriah@gmail.com'  then 'Samvit'
    else null
  end
$$;

-- ── updated_at trigger ───────────────────────────────────────

create or replace function update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── leads ───────────────────────────────────────────────────

create table if not exists leads (
  id            text        primary key,
  business      text        not null,
  type          text        not null default '',
  contact       text        not null default '',
  phone         text,
  notes         text,
  caller_id     text        not null,
  added_date    date        not null default current_date,
  stage         text        not null default 'new',
  deal_value    numeric,
  closed_date   date,
  lost_date     date,
  lost_reason   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create or replace trigger leads_updated_at
  before update on leads
  for each row execute function update_updated_at();

alter table leads enable row level security;

create policy leads_admin_all on leads
  for all
  using (is_admin())
  with check (is_admin());

create policy leads_auth_read on leads
  for select
  using (auth.role() = 'authenticated');

create policy leads_caller_insert on leads
  for insert
  with check (not is_admin() and caller_id = my_caller_id() and auth.role() = 'authenticated');

create policy leads_caller_update on leads
  for update
  using (not is_admin() and caller_id = my_caller_id() and auth.role() = 'authenticated');

-- ── meetings ────────────────────────────────────────────────

create table if not exists meetings (
  id                 text        primary key,
  business           text        not null,
  contact_name       text,
  date               date        not null,
  start_time         text        not null,
  duration_minutes   int         not null default 60,
  assignee           text        not null,
  type               text        not null,
  notes              text,
  personal_connection text,
  created_at         timestamptz not null default now()
);

alter table meetings enable row level security;

create policy meetings_admin_all on meetings
  for all
  using (is_admin())
  with check (is_admin());

create policy meetings_auth_read on meetings
  for select
  using (auth.role() = 'authenticated');

create policy meetings_caller_insert on meetings
  for insert
  with check (not is_admin() and assignee = my_display_name() and auth.role() = 'authenticated');

create policy meetings_caller_update on meetings
  for update
  using (not is_admin() and assignee = my_display_name() and auth.role() = 'authenticated');

-- ── client_data ─────────────────────────────────────────────

create table if not exists client_data (
  id           uuid        primary key default gen_random_uuid(),
  lead_id      text        not null references leads(id) on delete cascade unique,
  services     jsonb       not null default '{"website":false,"seo":false,"mcp":false,"socialMedia":false,"branding":false}',
  notes        text        not null default '',
  status       text        not null default 'active',
  last_contact date,
  updated_at   timestamptz not null default now()
);

create or replace trigger client_data_updated_at
  before update on client_data
  for each row execute function update_updated_at();

alter table client_data enable row level security;

create policy client_data_admin_all on client_data
  for all
  using (is_admin())
  with check (is_admin());

create policy client_data_auth_read on client_data
  for select
  using (auth.role() = 'authenticated');

-- ── activity_log ────────────────────────────────────────────

create table if not exists activity_log (
  id          uuid        primary key default gen_random_uuid(),
  action      text        not null,
  entity_type text        not null,
  entity_id   text,
  caller_id   text,
  meta        jsonb,
  created_at  timestamptz not null default now()
);

alter table activity_log enable row level security;

create policy activity_log_admin_all on activity_log
  for all
  using (is_admin())
  with check (is_admin());

create policy activity_log_auth_read on activity_log
  for select
  using (auth.role() = 'authenticated');

create policy activity_log_auth_insert on activity_log
  for insert
  with check (auth.role() = 'authenticated');

-- ── Realtime ────────────────────────────────────────────────

alter publication supabase_realtime add table leads;
alter publication supabase_realtime add table meetings;
alter publication supabase_realtime add table activity_log;

-- ── scripts ─────────────────────────────────────────────────

create table if not exists scripts (
  id           bigint      primary key,
  category     text        not null,  -- 'opener' | 'objection' | 'stat'
  data         jsonb       not null default '{}',
  sort_order   int         not null default 0,
  updated_at   timestamptz not null default now()
);

create or replace trigger scripts_updated_at
  before update on scripts
  for each row execute function update_updated_at();

alter table scripts enable row level security;

create policy scripts_admin_all on scripts
  for all
  using (is_admin())
  with check (is_admin());

create policy scripts_auth_read on scripts
  for select
  using (auth.role() = 'authenticated');

-- ── suggestions ─────────────────────────────────────────────

create table if not exists suggestions (
  id             bigint      primary key,
  type           text        not null,
  caller_name    text        not null,
  target_id      bigint,
  title          text,
  content        text        not null default '',
  objection_text text,
  reason         text,
  stat_url       text,
  status         text        not null default 'pending',
  timestamp      text        not null default 'just now',
  created_at     timestamptz not null default now()
);

alter table suggestions enable row level security;

create policy suggestions_admin_all on suggestions
  for all
  using (is_admin())
  with check (is_admin());

create policy suggestions_auth_read on suggestions
  for select
  using (auth.role() = 'authenticated');

create policy suggestions_caller_insert on suggestions
  for insert
  with check (not is_admin() and auth.role() = 'authenticated');
