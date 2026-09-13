-- MeteorInk production database foundation
-- Run this in Supabase SQL Editor.
-- RLS is enabled. Server-side API should use the service-role key.

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  google_id text unique,
  email text not null unique,
  name text not null default '',
  surname text not null default '',
  picture text not null default '',
  dob date,
  author_real_name text,
  verified boolean not null default true,
  auth_provider text not null default 'google',
  role text not null default 'reader' check (role in ('admin','team','author','reader')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists users_email_idx on public.users (lower(email));
create index if not exists users_google_id_idx on public.users (google_id);

-- Existing deployments: keep the author's real name private in the server-side users table.
alter table public.users add column if not exists author_real_name text;

create table if not exists public.authors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  username text unique,
  name text not null,
  tagline text not null default '',
  bio text not null default '',
  picture text not null default '',
  banner text not null default '',
  external_links jsonb not null default '[]'::jsonb,
  show_bio boolean not null default true,
  show_links boolean not null default true,
  show_stats boolean not null default true,
  followers bigint not null default 0 check (followers >= 0),
  verified boolean not null default false,
  profile_created_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists authors_name_idx on public.authors (lower(name));
create index if not exists authors_username_idx on public.authors (lower(username));

create table if not exists public.novels (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.authors(id) on delete cascade,
  title text not null,
  description text not null default '',
  genre text not null default 'Uncategorized',
  cover text not null default '',
  status text not null default 'published' check (status in ('draft','published','archived')),
  views bigint not null default 0 check (views >= 0),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists novels_author_idx on public.novels (author_id);
create index if not exists novels_published_idx on public.novels (published_at desc);

create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  novel_id uuid not null references public.novels(id) on delete cascade,
  chapter_number integer not null check (chapter_number > 0),
  title text not null default '',
  content text not null default '',
  views bigint not null default 0 check (views >= 0),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (novel_id, chapter_number)
);

create index if not exists chapters_novel_idx on public.chapters (novel_id, chapter_number);

create table if not exists public.bookmarks (
  user_id uuid not null references public.users(id) on delete cascade,
  novel_id uuid not null references public.novels(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, novel_id)
);

create table if not exists public.reading_history (
  user_id uuid not null references public.users(id) on delete cascade,
  novel_id uuid not null references public.novels(id) on delete cascade,
  chapter_id uuid references public.chapters(id) on delete set null,
  last_read_at timestamptz not null default now(),
  primary key (user_id, novel_id)
);

-- Keep direct browser access closed for now. The Express backend will access
-- these tables with the server-side service-role key after authentication is wired.
alter table public.users enable row level security;
alter table public.authors enable row level security;
alter table public.novels enable row level security;
alter table public.chapters enable row level security;
alter table public.bookmarks enable row level security;
alter table public.reading_history enable row level security;

-- MeteorInk: author follow system
-- Run this in Supabase SQL Editor before deploying the follow feature.

create table if not exists public.author_follows (
  user_id uuid not null references public.users(id) on delete cascade,
  author_id uuid not null references public.authors(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, author_id)
);

create index if not exists author_follows_author_idx
  on public.author_follows (author_id);

create index if not exists author_follows_user_idx
  on public.author_follows (user_id);

alter table public.author_follows enable row level security;

-- Atomic follow/unfollow functions keep the denormalized authors.followers count
-- synchronized even when multiple users follow/unfollow at nearly the same time.
create or replace function public.follow_author(p_user_id uuid, p_author_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count bigint;
  inserted_count integer := 0;
begin
  if not exists (select 1 from public.users where id = p_user_id) then
    raise exception 'User not found';
  end if;

  if not exists (select 1 from public.authors where id = p_author_id) then
    raise exception 'Author not found';
  end if;

  if exists (select 1 from public.authors where id = p_author_id and user_id = p_user_id) then
    raise exception 'You cannot follow your own author profile';
  end if;

  insert into public.author_follows(user_id, author_id)
  values (p_user_id, p_author_id)
  on conflict (user_id, author_id) do nothing;

  get diagnostics inserted_count = row_count;

  if inserted_count > 0 then
    update public.authors
    set followers = followers + 1,
        updated_at = now()
    where id = p_author_id;
  end if;

  select followers into new_count from public.authors where id = p_author_id;
  return coalesce(new_count, 0);
end;
$$;

create or replace function public.unfollow_author(p_user_id uuid, p_author_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count bigint;
  deleted_count integer := 0;
begin
  delete from public.author_follows
  where user_id = p_user_id and author_id = p_author_id;

  get diagnostics deleted_count = row_count;

  if deleted_count > 0 then
    update public.authors
    set followers = greatest(followers - 1, 0),
        updated_at = now()
    where id = p_author_id;
  end if;

  select followers into new_count from public.authors where id = p_author_id;
  return coalesce(new_count, 0);
end;
$$;

revoke all on function public.follow_author(uuid, uuid) from public;
revoke all on function public.unfollow_author(uuid, uuid) from public;

grant execute on function public.follow_author(uuid, uuid) to service_role;
grant execute on function public.unfollow_author(uuid, uuid) to service_role;

comment on table public.author_follows is 'One row per reader following an author.';

