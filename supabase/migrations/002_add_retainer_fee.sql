alter table projects
  add column if not exists retainer_fee numeric(10,2) not null default 0;
