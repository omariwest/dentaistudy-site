-- BracketMotion-only bootstrap for a NEW Supabase project; NEVER apply to DentAIstudy.
-- The five patient photos remain browser-local. No patient-photo bucket.
create table public.bracketmotion_cases (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 label text not null default 'Untitled Case' constraint bracketmotion_cases_label_check
   check (char_length(label) between 1 and 120),
 records jsonb not null default '{}'::jsonb,
 scope_issue text not null default '',
 plan jsonb not null default '{}'::jsonb,
 plan_approved boolean not null default false,
 setup_approved boolean not null default false,
 scan_state jsonb not null default '{}'::jsonb,
 stage_state jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 last_opened_at timestamptz not null default now()
);
create index bracketmotion_cases_user_updated_idx on public.bracketmotion_cases(user_id,updated_at desc);
alter table public.bracketmotion_cases enable row level security;
grant select,insert,update,delete on public.bracketmotion_cases to authenticated;
create policy bracketmotion_cases_select_own on public.bracketmotion_cases for select to authenticated using ((select auth.uid())=user_id);
create policy bracketmotion_cases_insert_own on public.bracketmotion_cases for insert to authenticated with check ((select auth.uid())=user_id);
create policy bracketmotion_cases_update_own on public.bracketmotion_cases for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy bracketmotion_cases_delete_own on public.bracketmotion_cases for delete to authenticated using ((select auth.uid())=user_id);

-- Legacy STL/PLY scan bucket kept private for existing editor compatibility.
insert into storage.buckets(id,name,public,file_size_limit) values
 ('bracketmotion-cases','bracketmotion-cases',false,104857600);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('bracketmotion-profiles','bracketmotion-profiles',false,2097152,
 array['image/jpeg','image/png','image/webp']::text[]);

create policy bracketmotion_profile_select_own on storage.objects for select to authenticated
using (bucket_id='bracketmotion-profiles' and name=(select auth.uid())::text||'/avatar');
create policy bracketmotion_profile_insert_own on storage.objects for insert to authenticated
with check (bucket_id='bracketmotion-profiles' and name=(select auth.uid())::text||'/avatar');
create policy bracketmotion_profile_update_own on storage.objects for update to authenticated
using (bucket_id='bracketmotion-profiles' and name=(select auth.uid())::text||'/avatar')
with check (bucket_id='bracketmotion-profiles' and name=(select auth.uid())::text||'/avatar');
create policy bracketmotion_profile_delete_own on storage.objects for delete to authenticated
using (bucket_id='bracketmotion-profiles' and name=(select auth.uid())::text||'/avatar');

create policy bracketmotion_storage_select_own_case on storage.objects for select to authenticated
using (bucket_id='bracketmotion-cases' and (storage.foldername(name))[1]=(select auth.uid())::text and
 exists(select 1 from public.bracketmotion_cases c where c.id::text=(storage.foldername(name))[2] and c.user_id=(select auth.uid())));
create policy bracketmotion_storage_insert_own_case on storage.objects for insert to authenticated
with check (bucket_id='bracketmotion-cases' and (storage.foldername(name))[1]=(select auth.uid())::text and
 exists(select 1 from public.bracketmotion_cases c where c.id::text=(storage.foldername(name))[2] and c.user_id=(select auth.uid())));
create policy bracketmotion_storage_update_own_case on storage.objects for update to authenticated
using (bucket_id='bracketmotion-cases' and (storage.foldername(name))[1]=(select auth.uid())::text and
 exists(select 1 from public.bracketmotion_cases c where c.id::text=(storage.foldername(name))[2] and c.user_id=(select auth.uid())))
with check (bucket_id='bracketmotion-cases' and (storage.foldername(name))[1]=(select auth.uid())::text and
 exists(select 1 from public.bracketmotion_cases c where c.id::text=(storage.foldername(name))[2] and c.user_id=(select auth.uid())));
create policy bracketmotion_storage_delete_own_case on storage.objects for delete to authenticated
using (bucket_id='bracketmotion-cases' and (storage.foldername(name))[1]=(select auth.uid())::text and
 exists(select 1 from public.bracketmotion_cases c where c.id::text=(storage.foldername(name))[2] and c.user_id=(select auth.uid())));
