-- Run in Supabase SQL Editor after supabase-setup.sql. All test data rolls back.
begin;
insert into auth.users(id) values
  ('f002cfe0-616b-486b-8c3d-f737f6ab01a1'),
  ('f002cfe0-616b-486b-8c3d-f737f6ab01a2');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'f002cfe0-616b-486b-8c3d-f737f6ab01a1', true);
select set_config('request.headers', '{"x-app-device":"notification-test-a"}', true);
insert into public.shared_data(key, value) values ('__notification_test__', '["A"]');
update public.shared_data set value = '["A", "B"]' where key = '__notification_test__';
update public.shared_data set value = '["A", "B"]' where key = '__notification_test__';
update public.shared_data set value = '["B"]' where key = '__notification_test__';
update public.shared_data set value = '["C"]' where key = '__notification_test__';
delete from public.shared_data where key = '__notification_test__';
do $$
begin
  assert (select count(*) from public.activity_events where key = '__notification_test__') = 5, 'No-op updates must not create notifications';
  assert (select count(*) from public.activity_events where key = '__notification_test__' and action = 'deleted') = 2;
  assert not exists (select 1 from public.activity_events where actor_id = auth.uid() and actor_device = 'notification-test-a' and id in (
    select event_id from public.activity_reads
  ));
end;
$$;

-- Same login, another browser: notifications must be unread independently.
select set_config('request.headers', '{"x-app-device":"notification-test-b"}', true);
do $$
declare before_count bigint;
begin
  before_count := public.activity_unread_count();
  assert before_count >= 5;
  perform public.mark_activity_read();
  assert public.activity_unread_count() = 0;
  perform public.mark_activity_read(); -- Idempotent.
end;
$$;
select set_config('request.headers', '{"x-app-device":"notification-test-c"}', true);
do $$ begin
  assert public.activity_unread_count() >= 5;
  assert (select count(*) from public.activity_reads) = 0, 'Other devices cannot read these receipts';
  begin
    insert into public.activity_reads(event_id, user_id, device_id)
      select id, auth.uid(), 'notification-test-b' from public.activity_events limit 1;
    raise exception 'Forged receipt should be rejected';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.activity_events(actor_id, actor_device, key, action)
      values (auth.uid(), 'notification-test-c', '__forged__', 'added');
    raise exception 'Direct history insertion should be rejected';
  exception when insufficient_privilege then null;
  end;
end; $$;

-- Another account also sees the activity, even with the same device identifier.
select set_config('request.jwt.claim.sub', 'f002cfe0-616b-486b-8c3d-f737f6ab01a2', true);
select set_config('request.headers', '{"x-app-device":"notification-test-a"}', true);
do $$ begin
  assert public.activity_unread_count() >= 5;
  assert (select count(*) from public.activity_reads) = 0;
end; $$;
rollback;
