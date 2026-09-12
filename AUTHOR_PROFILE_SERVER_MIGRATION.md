# MeteorInk server-backed author profiles

This update moves public author profiles and author-ID search from browser `localStorage` to the Supabase-backed Express API.

## 1. Run the database migration first

Open the Supabase SQL Editor for the MeteorInk project and run:

`supabase-author-profiles-migration.sql`

It adds the public username, profile media, external links, tagline, and visibility fields to `public.authors`, creates the unique username index, and preserves older account photos where possible.

## 2. Deploy the code

After the SQL migration succeeds, push the updated project to GitHub. Render will deploy the new server and frontend.

## 3. Expected behavior

- Author creation writes the profile to `public.authors`.
- Each author gets a globally unique lowercase `username` used as `@UserID`.
- Reader search calls `/api/authors`, so it works across accounts and devices.
- Public profile pages load from `/api/authors/:id`.
- Author edits use `/api/author/me` and are saved server-side.
- Profile photo and banner are saved with the author profile.
- External links are saved as public link objects.

## Important

The current novel catalog is still partly browser-local. This change specifically fixes the author-profile discovery/persistence problem. Novel publishing should be migrated to the server separately rather than pretending localStorage is a database.
