alter table public.businesses
add column if not exists external_place_id text;

create unique index if not exists businesses_external_place_id_idx
on public.businesses (external_place_id)
where external_place_id is not null;
