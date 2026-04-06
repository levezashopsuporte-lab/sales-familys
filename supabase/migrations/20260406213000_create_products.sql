create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  unit text not null default 'un',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists products_name_idx
  on public.products (lower(name));

create index if not exists products_active_name_idx
  on public.products (is_active, name);

alter table public.products enable row level security;

create policy "Authenticated users can read active products"
on public.products
for select
using (auth.role() = 'authenticated');
