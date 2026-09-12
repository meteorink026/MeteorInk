# MeteorInk v70: Server-backed Novel Catalog

This release moves the novel catalog used by the homepage, Novels page, search, author dashboard, and novel detail page from browser-only localStorage to the Express + Supabase backend.

## What changed

- `GET /api/novels` returns the public published novel catalog.
- `GET /api/novels/:id` returns one published novel.
- `POST /api/novels` publishes a novel for the currently authenticated author.
- `GET /api/author/me/novels` loads an author's own server-side novels.
- Author Dashboard now publishes directly to the server.
- Older localStorage novels are automatically bridged to the server when the author dashboard opens and the account has no server-side novels yet.
- Homepage Trending Novels, Latest Arrivals, Random Novels, and Fan Fiction now read from the server catalog.
- Novels page and Search now read novels from the server catalog.
- Novel detail pages load the server copy first, with localStorage only as a fallback.

## Supabase

The existing `public.novels` table from `supabase-schema.sql` is sufficient. If it has not been created in the deployed database, run `supabase-novels-migration.sql` in Supabase SQL Editor.

## Important limitation

This release server-backs novel metadata and the public catalog. Chapter publishing/reading is still a separate part of the application and is not converted into a complete multi-user chapter system by this release.
