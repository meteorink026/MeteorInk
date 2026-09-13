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
