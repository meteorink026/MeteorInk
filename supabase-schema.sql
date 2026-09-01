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
  verified boolean not null default true,
  auth_provider text not null default 'google',
  role text not null default 'reader' check (role in ('admin','team','author','reader')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists users_email_idx on public.users (lower(email));
create index if not exists users_google_id_idx on public.users (google_id);

create table if not exists public.authors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  name text not null,
  bio text not null default '',
  followers bigint not null default 0 check (followers >= 0),
  verified boolean not null default false,
  profile_created_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists authors_name_idx on public.authors (lower(name));

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
