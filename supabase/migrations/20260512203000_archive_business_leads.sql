alter table public.businesses
add column if not exists archived_at timestamptz,
add column if not exists archive_reason text;

create index if not exists businesses_archived_created_idx
on public.businesses (archived_at, created_at desc);
