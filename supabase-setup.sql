-- Only authenticated users can read, add, change, and delete shared content.
create table if not exists public.shared_data (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.shared_data enable row level security;
grant usage on schema public to anon, authenticated;
revoke all on public.shared_data from anon;
grant select, insert, update, delete on public.shared_data to authenticated;

drop policy if exists "Authenticated users can read shared data" on public.shared_data;
drop policy if exists "Authenticated users can insert shared data" on public.shared_data;
drop policy if exists "Authenticated users can update shared data" on public.shared_data;
drop policy if exists "Authenticated users can delete shared data" on public.shared_data;
drop policy if exists "Anyone can read shared data" on public.shared_data;
drop policy if exists "Anyone can insert shared data" on public.shared_data;
drop policy if exists "Anyone can update shared data" on public.shared_data;
drop policy if exists "Anyone can delete shared data" on public.shared_data;

create policy "Authenticated users can read shared data"
  on public.shared_data for select
  to authenticated
  using (true);

create policy "Authenticated users can insert shared data"
  on public.shared_data for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update shared data"
  on public.shared_data for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete shared data"
  on public.shared_data for delete
  to authenticated
  using (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'shared-images',
  'shared-images',
  false,
  20971520,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/heic', 'image/heif']
)
on conflict (id) do update
set public = false,
    file_size_limit = 20971520,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Authenticated users can read shared images" on storage.objects;
drop policy if exists "Authenticated users can upload shared images" on storage.objects;
drop policy if exists "Authenticated users can update shared images" on storage.objects;
drop policy if exists "Authenticated users can delete shared images" on storage.objects;
drop policy if exists "Anyone can read shared images" on storage.objects;
drop policy if exists "Anyone can upload shared images" on storage.objects;
drop policy if exists "Anyone can update shared images" on storage.objects;
drop policy if exists "Anyone can delete shared images" on storage.objects;

create policy "Authenticated users can read shared images"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'shared-images');

create policy "Authenticated users can upload shared images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'shared-images');

create policy "Authenticated users can update shared images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'shared-images')
  with check (bucket_id = 'shared-images');

create policy "Authenticated users can delete shared images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'shared-images');

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'shared_data'
  ) then
    alter publication supabase_realtime add table public.shared_data;
  end if;
end;
$$;

-- Persistent activity history. The browser identifier also supports a shared login.
create table if not exists public.activity_events (
  id bigint generated always as identity primary key,
  actor_id uuid not null references auth.users(id) on delete cascade,
  actor_device text not null,
  key text not null,
  action text not null check (action in ('added', 'updated', 'deleted')),
  created_at timestamptz not null default now()
);
create table if not exists public.activity_reads (
  event_id bigint not null references public.activity_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  primary key (event_id, user_id, device_id)
);
alter table public.activity_events enable row level security;
alter table public.activity_reads enable row level security;
revoke all on public.activity_events, public.activity_reads from anon, authenticated;
grant select on public.activity_events to authenticated;
grant select, insert on public.activity_reads to authenticated;
drop policy if exists "Read shared activity" on public.activity_events;
create policy "Read shared activity" on public.activity_events for select to authenticated using (true);
drop policy if exists "Read own activity receipts" on public.activity_reads;
create policy "Read own activity receipts" on public.activity_reads for select to authenticated
  using (user_id = (select auth.uid()) and device_id = coalesce(nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-app-device', ''));
drop policy if exists "Insert own activity receipts" on public.activity_reads;
create policy "Insert own activity receipts" on public.activity_reads for insert to authenticated
  with check (user_id = (select auth.uid()) and device_id = coalesce(nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-app-device', ''));

create or replace function public.record_shared_activity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  device text := coalesce(nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-app-device', '');
  data_key text;
  before_value jsonb;
  after_value jsonb;
  change_action text := 'updated';
begin
  -- Administrative setup without an authenticated browser creates no activity.
  if auth.uid() is null or device = '' then return null; end if;
  if tg_op = 'DELETE' then
    data_key := old.key;
    before_value := old.value;
    change_action := 'deleted';
  else
    data_key := new.key;
    after_value := new.value;
    if tg_op = 'UPDATE' then
      before_value := old.value;
      if old.value = new.value then return null; end if;
    else
      change_action := 'added';
    end if;
    if after_value ->> 'deleted' = 'true' then change_action := 'deleted'; end if;
    if jsonb_typeof(before_value) = 'array' and jsonb_typeof(after_value) = 'array' then
      if jsonb_array_length(after_value) > jsonb_array_length(before_value) then change_action := 'added';
      elsif jsonb_array_length(after_value) < jsonb_array_length(before_value) then change_action := 'deleted';
      end if;
    end if;
  end if;
  if data_key = 'album:removed-samples' then change_action := 'deleted'; end if;
  insert into public.activity_events(actor_id, actor_device, key, action)
    values (auth.uid(), device, data_key, change_action);
  return null;
end;
$$;
revoke all on function public.record_shared_activity() from public, anon, authenticated;
drop trigger if exists shared_activity_log on public.shared_data;
create trigger shared_activity_log after insert or update or delete on public.shared_data
  for each row execute function public.record_shared_activity();

-- Invoker functions preserve RLS and obtain identity from the authenticated request.
create or replace function public.activity_unread_count()
returns bigint language sql stable security invoker set search_path = '' as $$
  select count(*) from public.activity_events e
  where (e.actor_id <> auth.uid() or e.actor_device <> coalesce(nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-app-device', ''))
    and not exists (select 1 from public.activity_reads r where r.event_id = e.id);
$$;
create or replace function public.mark_activity_read()
returns void language sql security invoker set search_path = '' as $$
  insert into public.activity_reads(event_id, user_id, device_id)
  select e.id, auth.uid(), coalesce(nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-app-device', '')
  from public.activity_events e
  where e.actor_id <> auth.uid() or e.actor_device <> coalesce(nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-app-device', '')
  on conflict do nothing;
$$;
revoke all on function public.activity_unread_count(), public.mark_activity_read() from public, anon;
grant execute on function public.activity_unread_count(), public.mark_activity_read() to authenticated;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime'
    and schemaname = 'public' and tablename = 'activity_events') then
    alter publication supabase_realtime add table public.activity_events;
  end if;
end;
$$;
