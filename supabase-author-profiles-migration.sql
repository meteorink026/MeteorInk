-- MeteorInk: server-backed public author profiles
-- Run this in Supabase SQL Editor before deploying the code changes.

alter table public.authors add column if not exists username text;
alter table public.authors add column if not exists tagline text not null default '';
alter table public.authors add column if not exists picture text not null default '';
alter table public.authors add column if not exists banner text not null default '';
alter table public.authors add column if not exists external_links jsonb not null default '[]'::jsonb;
alter table public.authors add column if not exists show_bio boolean not null default true;
alter table public.authors add column if not exists show_links boolean not null default true;
alter table public.authors add column if not exists show_stats boolean not null default true;

-- Give existing authors a stable unique username before the unique index is added.
-- They can change it later from Author Profile.
update public.authors
set username = 'author_' || left(id::text, 8)
where username is null or trim(username) = '';

-- Preserve an existing account profile photo when the older photo endpoint stored it in users.picture.
update public.authors a
set picture = u.picture
from public.users u
where a.user_id = u.id
  and coalesce(a.picture, '') = ''
  and coalesce(u.picture, '') <> '';

create unique index if not exists authors_username_unique_idx
  on public.authors (lower(username));

create index if not exists authors_username_idx
  on public.authors (lower(username));

-- Optional validation helpers. These do not expose private user information.
comment on column public.authors.username is 'Unique public @UserID, stored lowercase.';
comment on column public.authors.external_links is 'Public external links as [{"label":"...","url":"https://..."}].';
