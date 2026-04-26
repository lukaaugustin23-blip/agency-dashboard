create table if not exists work_sessions (
  id         uuid primary key default uuid_generate_v4(),
  person     text not null check (person in ('Luka', 'Samvit')),
  date       date not null default current_date,
  hours      numeric(5,2) not null check (hours > 0),
  notes      text,
  created_at timestamptz not null default now()
);

alter publication supabase_realtime add table work_sessions;

alter table work_sessions enable row level security;
create policy "work_sessions_select" on work_sessions for select using (is_whitelisted());
create policy "work_sessions_insert" on work_sessions for insert with check (is_whitelisted());
create policy "work_sessions_delete" on work_sessions for delete using (is_whitelisted());

create index if not exists idx_work_sessions_date on work_sessions(date desc);
create index if not exists idx_work_sessions_person on work_sessions(person);
