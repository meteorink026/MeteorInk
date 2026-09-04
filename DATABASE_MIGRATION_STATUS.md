# MeteorInk database migration

This build connects Google OAuth users to Supabase `public.users`. The `/api/me` endpoint now reads the authenticated user from Supabase instead of the old local JSON store.

Novel, author, chapter, bookmark, and reading-history browser storage remains unchanged until later migration stages.

Required server environment variables: `SUPABASE_URL` and `SUPABASE_SECRET_KEY`. Never expose the secret key to browser code or commit it to Git.


## Author private identity fields

The author setup flow stores `author_real_name` and `dob` in `public.users` through the Express server using the server-side Supabase secret. These fields are not returned by `/api/me` or the author setup response. Public author data remains in `public.authors` as `name` (pen name) and `bio`.
