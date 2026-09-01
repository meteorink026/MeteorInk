# MeteorInk Google OAuth - Local Setup

The current MeteorInk build now includes a real Google OAuth server flow for local development.

## 1. Install Node.js

Use a current Node.js LTS release.

## 2. Create the environment file

At the project root, copy:

`.env.example` -> `.env`

Fill in:

- `GOOGLE_CLIENT_ID`: the Client ID from Google Cloud > Google Auth Platform > Clients > MeteorInk Web
- `GOOGLE_CLIENT_SECRET`: the Client Secret from the downloaded Google OAuth JSON
- `GOOGLE_REDIRECT_URI`: `http://localhost:3000/auth/google/callback`
- `SESSION_SECRET`: a long random string

Do not publish `.env` or the client secret.

## 3. Install dependencies

From the folder containing `package.json`:

```bash
npm install
```

## 4. Start MeteorInk

```bash
npm start
```

Open:

`http://localhost:3000/`

Do not open `index.html` directly with `file:///...` for OAuth testing.

## 5. Google Cloud values

The OAuth client should use:

Authorized JavaScript origin:
`http://localhost:3000`

Authorized redirect URI:
`http://localhost:3000/auth/google/callback`

## Important

Start the site through Express at `http://localhost:3000/`. The server owns the Google OAuth callback and session cookie. Opening the HTML files with `file://` bypasses the server and cannot complete OAuth correctly.

The OAuth `next=writer` intent is preserved, so starting the Google flow from the Start Writing path returns the user to the author setup/dashboard flow after authentication.

## What this build does

- Sign Up page: Continue with Google
- Log In page: Continue with Google
- Google verified email is used to create/sign into a MeteorInk account
- New Google accounts are sent through a DOB/profile-completion step
- Existing Google accounts go straight to the homepage
- A server session is created
- Header changes to the signed-in user's name and Log Out
- `/api/me` exposes only the current authenticated user's safe profile
- `/api/logout` destroys the session
- Google users are stored locally in `server/data/google-users.json` for development

This is a development authentication adapter. Before production, replace the JSON user store and in-memory session store with a real database and persistent session infrastructure.
