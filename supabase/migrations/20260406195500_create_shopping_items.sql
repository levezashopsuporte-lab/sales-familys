create extension if not exists pgcrypto;

create table if not exists public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  icon text not null default 'sparkles',
  category text,
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  quantity integer not null default 1 check (quantity >= 1),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists shopping_items_user_updated_idx
  on public.shopping_items (user_id, updated_at desc);

create unique index if not exists shopping_items_user_name_idx
  on public.shopping_items (user_id, lower(name));

create or replace function public.set_shopping_items_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists shopping_items_set_updated_at on public.shopping_items;

create trigger shopping_items_set_updated_at
before update on public.shopping_items
for each row
execute procedure public.set_shopping_items_updated_at();

alter table public.shopping_items enable row level security;

create policy "Users can read their own shopping items"
on public.shopping_items
for select
using (auth.uid() = user_id);

create policy "Users can insert their own shopping items"
on public.shopping_items
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own shopping items"
on public.shopping_items
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own shopping items"
on public.shopping_items
for delete
using (auth.uid() = user_id);
