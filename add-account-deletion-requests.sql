-- Creates a log table for user-initiated account deletion requests
create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  status text not null default 'pending',
  reason text,
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by uuid references auth.users(id),
  processed_by_email text,
  admin_note text,
  subscription_status text
);

alter table public.account_deletion_requests enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'account_deletion_requests'
      and policyname = 'Users can insert their own deletion request'
  ) then
    create policy "Users can insert their own deletion request"
    on public.account_deletion_requests
    for insert
    with check (auth.uid() = user_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'account_deletion_requests'
      and policyname = 'Users can view their deletion requests'
  ) then
    create policy "Users can view their deletion requests"
    on public.account_deletion_requests
    for select
    using (auth.uid() = user_id);
  end if;
end
$$;

