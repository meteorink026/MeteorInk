METEORINK v67

This build follows the MeteorInk master specification and keeps the existing visual direction while making the main flows functional in a browser.

Included:
- Shared, identical Navbar across pages
- Adaptation Room replacing the retired Community page
- Active Home/Authors navigation state
- Search dropdown with top 5 results, See All, and Not In Existence
- Trending Novels filters: Today / 7 Days / 1 Month
- Top Authors filters: 7 Days / 1 Month / GOAT
- Emerging Authors eligibility logic
- Latest Arrivals automatic sorting
- Local browser data adapter for novels/authors/users
- Retired Community/Discussion prototype removed from the active build
- Sign Up flow with DOB and 18+ standard-account gate
- Password visibility controls
- Development Gmail OTP verification (OTP: 000000)
- Login flow
- Start Writing flow
- Author profile setup
- Author Dashboard and local novel publishing
- Novel page and basic reader page
- Author profiles
- Responsive layouts
- Provided MeteorInk imagery retained

IMPORTANT PRODUCTION NOTE:
This package is a browser-runnable MeteorInk build. Google OAuth is now wired for local development through the included Node.js/Express server. Email OTP delivery, Instagram OAuth, persistent multi-user database storage, and production-grade session infrastructure still need a real backend/provider before production deployment.

Run locally with the OAuth server:
1. Install Node.js LTS.
2. Copy .env.example to .env and fill in the Google OAuth values.
3. Run: npm install
4. Run: npm start
5. Open http://localhost:3000/

Windows shortcut: double-click START_METEORINK.bat.
Do NOT open index.html directly with file:// when testing Google OAuth.

Google OAuth setup instructions are in OAUTH_SETUP.md.


V67 audit notes:
- Added baseline security response headers and disabled Express fingerprinting.
- Added /api/status for a deployment-safe health check.
- Added favicon + web manifest references across HTML pages.
- Removed the external placeholder-avatar dependency from Top Authors; initials are generated locally.
- Escaped dynamic novel/reader content before inserting it into HTML.
- Fixed the reader missing-content message so it says “Novel not found” rather than “Chapter not found”.
- The package delivered for review excludes .git, node_modules, and server/.env. Keep real production secrets outside the source archive.

Still intentionally pending before a full production launch:
- Frontend catalog/publishing is still localStorage-backed; Supabase is currently used by the auth/server foundation.
- Chapter CRUD, real reader chapter loading, bookmarks, reading history, and contact/report submission still need server API wiring.
- Real email delivery is not connected.
