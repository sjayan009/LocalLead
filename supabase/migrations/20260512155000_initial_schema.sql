create extension if not exists pgcrypto;

do $$
begin
  create type public.website_status as enum ('no_website', 'weak_website', 'good_website', 'unknown');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.demo_site_status as enum ('draft', 'reviewed', 'approved', 'published', 'archived');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.outreach_status as enum ('draft', 'approved', 'sent', 'rejected');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  address text,
  city text,
  state text,
  phone text,
  email text,
  existing_website_url text,
  source_url text,
  notes text,
  website_status public.website_status not null default 'unknown',
  lead_score integer not null default 0 check (lead_score >= 0 and lead_score <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.demo_sites (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  slug text not null unique,
  hero_headline text not null,
  subheadline text,
  services_json jsonb not null default '[]'::jsonb,
  about_text text,
  call_to_action text,
  contact_phone text,
  contact_email text,
  generated_html_or_json jsonb not null default '{}'::jsonb,
  status public.demo_site_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint demo_sites_business_unique unique (business_id)
);

create table if not exists public.outreach_messages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  subject text not null,
  body text not null,
  status public.outreach_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint outreach_messages_business_unique unique (business_id)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  stripe_payment_link text not null,
  amount integer not null check (amount >= 0),
  status text not null default 'created',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists businesses_duplicate_guard_idx
  on public.businesses (
    lower(regexp_replace(coalesce(name, ''), '\s+', ' ', 'g')),
    lower(regexp_replace(coalesce(city, ''), '\s+', ' ', 'g')),
    regexp_replace(coalesce(phone, ''), '\D', '', 'g')
  );

create index if not exists businesses_status_score_idx on public.businesses (website_status, lead_score desc);
create index if not exists demo_sites_slug_status_idx on public.demo_sites (slug, status);
create index if not exists outreach_messages_business_status_idx on public.outreach_messages (business_id, status);
create index if not exists payments_business_created_idx on public.payments (business_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists businesses_set_updated_at on public.businesses;
create trigger businesses_set_updated_at
before update on public.businesses
for each row execute function public.set_updated_at();

drop trigger if exists demo_sites_set_updated_at on public.demo_sites;
create trigger demo_sites_set_updated_at
before update on public.demo_sites
for each row execute function public.set_updated_at();

drop trigger if exists outreach_messages_set_updated_at on public.outreach_messages;
create trigger outreach_messages_set_updated_at
before update on public.outreach_messages
for each row execute function public.set_updated_at();

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

alter table public.businesses enable row level security;
alter table public.demo_sites enable row level security;
alter table public.outreach_messages enable row level security;
alter table public.payments enable row level security;

drop policy if exists "Authenticated users manage businesses" on public.businesses;
create policy "Authenticated users manage businesses"
on public.businesses
for all
to authenticated
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated users manage demo sites" on public.demo_sites;
create policy "Authenticated users manage demo sites"
on public.demo_sites
for all
to authenticated
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated users manage outreach" on public.outreach_messages;
create policy "Authenticated users manage outreach"
on public.outreach_messages
for all
to authenticated
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated users manage payments" on public.payments;
create policy "Authenticated users manage payments"
on public.payments
for all
to authenticated
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');
