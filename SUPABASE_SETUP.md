# MeteorInk Supabase foundation

This build adds the production database schema without changing the current visual UI.

## 1. Create the Supabase project
Use the MeteorInk Supabase project.

## 2. Run the schema
Open Supabase Dashboard → SQL Editor → New query, paste `supabase-schema.sql`, and run it.

## 3. Environment variables
Do not put real secrets in the project files. On the eventual hosting provider, add:

- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- GOOGLE_REDIRECT_URI
- SESSION_SECRET
- SUPABASE_URL
- SUPABASE_SECRET_KEY
- NODE_ENV=production
- PORT (if required by the host)

Never expose `SUPABASE_SECRET_KEY` to browser JavaScript.

## Important
The current browser data adapter is intentionally still present in this stage. The next code migration must replace its persistent users/authors/novels/chapter storage with API calls to the database before this build is treated as a fully multi-user production release.
