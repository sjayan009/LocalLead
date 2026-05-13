create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

drop policy if exists "Users can read own admin row" on public.admin_users;
create policy "Users can read own admin row"
on public.admin_users
for select
to authenticated
using (user_id = auth.uid());

alter table public.payments
add column if not exists stripe_payment_link_id text,
add column if not exists stripe_product_id text,
add column if not exists stripe_price_id text,
add column if not exists payment_type text not null default 'setup',
add column if not exists is_active boolean not null default true,
add column if not exists deactivated_at timestamptz,
add column if not exists deactivation_reason text;

do $$
begin
  alter table public.payments
  add constraint payments_payment_type_check
  check (payment_type in ('setup', 'maintenance'))
  not valid;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.payments validate constraint payments_payment_type_check;
exception
  when others then null;
end $$;

create index if not exists payments_active_type_idx
on public.payments (business_id, payment_type, is_active, created_at desc);

drop policy if exists "Authenticated users manage businesses" on public.businesses;
drop policy if exists "Admins manage businesses" on public.businesses;
create policy "Admins manage businesses"
on public.businesses
for all
to authenticated
using (exists (select 1 from public.admin_users admins where admins.user_id = auth.uid()))
with check (exists (select 1 from public.admin_users admins where admins.user_id = auth.uid()));

drop policy if exists "Authenticated users manage demo sites" on public.demo_sites;
drop policy if exists "Admins manage demo sites" on public.demo_sites;
create policy "Admins manage demo sites"
on public.demo_sites
for all
to authenticated
using (exists (select 1 from public.admin_users admins where admins.user_id = auth.uid()))
with check (exists (select 1 from public.admin_users admins where admins.user_id = auth.uid()));

drop policy if exists "Authenticated users manage outreach" on public.outreach_messages;
drop policy if exists "Admins manage outreach" on public.outreach_messages;
create policy "Admins manage outreach"
on public.outreach_messages
for all
to authenticated
using (exists (select 1 from public.admin_users admins where admins.user_id = auth.uid()))
with check (exists (select 1 from public.admin_users admins where admins.user_id = auth.uid()));

drop policy if exists "Authenticated users manage payments" on public.payments;
drop policy if exists "Admins manage payments" on public.payments;
create policy "Admins manage payments"
on public.payments
for all
to authenticated
using (exists (select 1 from public.admin_users admins where admins.user_id = auth.uid()))
with check (exists (select 1 from public.admin_users admins where admins.user_id = auth.uid()));
