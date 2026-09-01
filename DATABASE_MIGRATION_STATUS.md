# MeteorInk database migration

This build connects Google OAuth users to Supabase `public.users`. The `/api/me` endpoint now reads the authenticated user from Supabase instead of the old local JSON store.

Novel, author, chapter, bookmark, and reading-history browser storage remains unchanged until later migration stages.

Required server environment variables: `SUPABASE_URL` and `SUPABASE_SECRET_KEY`. Never expose the secret key to browser code or commit it to Git.
