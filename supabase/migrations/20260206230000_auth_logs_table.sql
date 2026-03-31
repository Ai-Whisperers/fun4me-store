-- Create auth_logs table for failed login monitoring
-- Epic: S004 - Auth Hardening
-- Task: T002 - Implement failed login monitoring

create table public.auth_logs (
  id uuid primary key default gen_random_uuid(),
  email text,
  success boolean not null,
  ip text,
  timestamp timestamptz default now(),
  user_agent text,
  failure_reason text
);

-- Add indexes for performance
create index idx_auth_logs_timestamp on public.auth_logs (timestamp desc);
create index idx_auth_logs_email on public.auth_logs (email);
create index idx_auth_logs_ip on public.auth_logs (ip);
create index idx_auth_logs_success on public.auth_logs (success);

-- RLS policies
alter table public.auth_logs enable row level security;

-- Only admins can view auth logs (assuming you have role-based access)
create policy "Only admins can view auth logs" on public.auth_logs
  for select using (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
      and auth.users.raw_app_meta_data->>'role' = 'admin'
    )
  );

-- System can insert auth logs
create policy "System can insert auth logs" on public.auth_logs
  for insert with check (true);

-- Add comment
comment on table public.auth_logs is 'Logs authentication attempts for security monitoring';
comment on column public.auth_logs.email is 'Email address of login attempt (may be null for invalid emails)';
comment on column public.auth_logs.success is 'Whether the login attempt was successful';
comment on column public.auth_logs.ip is 'IP address of the attempt';
comment on column public.auth_logs.user_agent is 'User agent string from the request';
comment on column public.auth_logs.failure_reason is 'Reason for failure (invalid_email, wrong_password, etc.)';