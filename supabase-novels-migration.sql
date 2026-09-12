-- MeteorInk novel catalog migration
-- Run this once in Supabase SQL Editor if public.novels does not already exist.
-- Safe to run when the table already exists.

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

alter table public.novels enable row level security;
