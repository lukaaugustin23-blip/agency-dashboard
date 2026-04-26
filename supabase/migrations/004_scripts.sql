create table if not exists scripts (
  id            uuid primary key default uuid_generate_v4(),
  type          text not null check (type in ('opener', 'objection')),
  trigger_text  text not null,
  response_text text not null,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

alter publication supabase_realtime add table scripts;

alter table scripts enable row level security;
create policy "scripts_select" on scripts for select using (is_whitelisted());
create policy "scripts_insert" on scripts for insert with check (is_whitelisted());
create policy "scripts_update" on scripts for update using (is_whitelisted());
create policy "scripts_delete" on scripts for delete using (is_whitelisted());

create index if not exists idx_scripts_type    on scripts(type);
create index if not exists idx_scripts_trigger on scripts(trigger_text);
create index if not exists idx_scripts_order   on scripts(type, sort_order);
