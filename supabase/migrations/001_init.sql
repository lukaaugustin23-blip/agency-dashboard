-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =====================================================
-- TABLES
-- =====================================================

create table if not exists leads (
  id          uuid primary key default uuid_generate_v4(),
  business_name  text not null,
  contact_person text,
  phone          text,
  notes          text,
  status         text not null default 'to_call'
                   check (status in ('to_call','called_no_answer','yes','no','recall')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists projects (
  id               uuid primary key default uuid_generate_v4(),
  client_name      text not null,
  site_url         text,
  description      text,
  monthly_payment  numeric(10,2) not null default 0,
  hosting_cost     numeric(10,2) not null default 0,
  manager          text not null default 'Both'
                     check (manager in ('Luka','Samvit','Both')),
  status           text not null default 'active'
                     check (status in ('active','paused','completed')),
  start_date       date,
  created_at       timestamptz not null default now()
);

create table if not exists tasks (
  id          uuid primary key default uuid_generate_v4(),
  title       text not null,
  assigned_to text not null default 'Both'
                check (assigned_to in ('Luka','Samvit','Both')),
  due_date    date,
  priority    text not null default 'medium'
                check (priority in ('high','medium','low')),
  status      text not null default 'todo'
                check (status in ('todo','in_progress','done')),
  created_at  timestamptz not null default now()
);

create table if not exists transactions (
  id          uuid primary key default uuid_generate_v4(),
  type        text not null check (type in ('income','expense')),
  category    text not null,
  amount      numeric(10,2) not null,
  description text,
  date        date not null default current_date,
  project_id  uuid references projects(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- =====================================================
-- REALTIME
-- =====================================================
alter publication supabase_realtime add table leads;
alter publication supabase_realtime add table projects;
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table transactions;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
alter table leads        enable row level security;
alter table projects     enable row level security;
alter table tasks        enable row level security;
alter table transactions enable row level security;

-- Whitelist emails
create or replace function is_whitelisted()
returns boolean language sql security definer as $$
  select auth.email() in ('samvittapuriah@gmail.com', 'luka.augustin23@gmail.com');
$$;

-- Leads policies
create policy "leads_select" on leads for select using (is_whitelisted());
create policy "leads_insert" on leads for insert with check (is_whitelisted());
create policy "leads_update" on leads for update using (is_whitelisted());
create policy "leads_delete" on leads for delete using (is_whitelisted());

-- Projects policies
create policy "projects_select" on projects for select using (is_whitelisted());
create policy "projects_insert" on projects for insert with check (is_whitelisted());
create policy "projects_update" on projects for update using (is_whitelisted());
create policy "projects_delete" on projects for delete using (is_whitelisted());

-- Tasks policies
create policy "tasks_select" on tasks for select using (is_whitelisted());
create policy "tasks_insert" on tasks for insert with check (is_whitelisted());
create policy "tasks_update" on tasks for update using (is_whitelisted());
create policy "tasks_delete" on tasks for delete using (is_whitelisted());

-- Transactions policies
create policy "transactions_select" on transactions for select using (is_whitelisted());
create policy "transactions_insert" on transactions for insert with check (is_whitelisted());
create policy "transactions_update" on transactions for update using (is_whitelisted());
create policy "transactions_delete" on transactions for delete using (is_whitelisted());

-- =====================================================
-- INDEXES
-- =====================================================
create index if not exists idx_leads_status     on leads(status);
create index if not exists idx_leads_created    on leads(created_at desc);
create index if not exists idx_projects_status  on projects(status);
create index if not exists idx_tasks_status     on tasks(status);
create index if not exists idx_tasks_assigned   on tasks(assigned_to);
create index if not exists idx_transactions_type on transactions(type);
create index if not exists idx_transactions_date on transactions(date desc);
