require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const path = require("path");
const crypto = require("crypto");
const express = require("express");
const session = require("express-session");
const { Pool } = require("pg");
const PgSession = require("connect-pg-simple")(session);
const { OAuth2Client } = require("google-auth-library");

const app = express();
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);
const PORT = Number(process.env.PORT || 3000);
const ROOT = path.join(__dirname, "..");
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 5000
});

let novelSchemaPromise = null;

async function ensureNovelSchema() {
  if (!process.env.DATABASE_URL) return false;
  if (!novelSchemaPromise) {
    novelSchemaPromise = pgPool.query(`select to_regclass('public.authors') as authors_table`)
      .then(check => {
        if (!check.rows[0]?.authors_table) return false;
        return pgPool.query(`
          create table if not exists public.novels (
            id uuid primary key default gen_random_uuid(),
            author_id uuid not null,
            title text not null,
            description text not null default '',
            genre text not null default 'Uncategorized',
            cover text not null default '',
            status text not null default 'published',
            views bigint not null default 0,
            published_at timestamptz,
            created_at timestamptz not null default now(),
            updated_at timestamptz not null default now()
          );
          create index if not exists novels_author_idx on public.novels (author_id);
          create index if not exists novels_published_idx on public.novels (published_at desc);
        `).then(() => true);
      })
      .catch(err => {
        novelSchemaPromise = null;
        throw err;
      });
  }
  return novelSchemaPromise;
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
  console.warn("Supabase is not configured yet. Add SUPABASE_URL and SUPABASE_SECRET_KEY to server/.env.");
}

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.warn("Google OAuth is not configured yet. Fill server/.env first.");
}

const oauth = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || `http://localhost:${PORT}/auth/google/callback`
);

async function supabaseRequest(table, options = {}) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    throw new Error("Supabase environment variables are missing.");
  }
  const url = new URL(`/rest/v1/${table}`, process.env.SUPABASE_URL);
  if (options.query) Object.entries(options.query).forEach(([k,v]) => url.searchParams.set(k, v));
  const headers = {
    apikey: process.env.SUPABASE_SECRET_KEY,
    Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
    "Content-Type": "application/json",
    Prefer: options.prefer || "return=representation"
  };
  const response = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) {
    const message = typeof data === "object" && data?.message ? data.message : text;
    throw new Error(`Supabase ${response.status}: ${message}`);
  }
  return data;
}

async function supabaseRpc(functionName, body = {}) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    throw new Error("Supabase environment variables are missing.");
  }
  const url = new URL(`/rest/v1/rpc/${functionName}`, process.env.SUPABASE_URL);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      apikey: process.env.SUPABASE_SECRET_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) {
    const message = typeof data === "object" && data?.message ? data.message : text;
    throw new Error(`Supabase ${response.status}: ${message}`);
  }
  return data;
}

async function findUserById(id) {
  const rows = await supabaseRequest("users", { query: { select: "*", id: `eq.${id}`, limit: "1" } });
  return rows?.[0] || null;
}

async function findUserByGoogleOrEmail(googleId, email) {
  const rows = await supabaseRequest("users", {
    query: { select: "*", or: `(google_id.eq.${encodeURIComponent(googleId)},email.eq.${encodeURIComponent(email.toLowerCase())})`, limit: "1" }
  });
  return rows?.[0] || null;
}
async function findUserByXId(xId) {
  const rows = await supabaseRequest("users", {
    query: {
      select: "*",
      x_id: `eq.${encodeURIComponent(xId)}`,
      limit: "1"
    }
  });
  return rows?.[0] || null;
}

async function findUserByEmail(email) {
  if (!email) return null;

  const rows = await supabaseRequest("users", {
    query: {
      select: "*",
      email: `eq.${encodeURIComponent(email.toLowerCase())}`,
      limit: "1"
    }
  });

  return rows?.[0] || null;
}
async function upsertGoogleUser(profile) {
  const existing = await findUserByGoogleOrEmail(profile.googleId, profile.email);
  if (!existing) {
    const rows = await supabaseRequest("users", {
      method: "POST",
      body: {
        google_id: profile.googleId,
        email: profile.email.toLowerCase(),
        name: profile.name || "",
        surname: profile.surname || "",
        picture: profile.picture || "",
        verified: true,
        auth_provider: "google",
        role: "reader"
      }
    });
    return rows?.[0] || null;
  }
  const rows = await supabaseRequest("users", {
    method: "PATCH",
    query: { id: `eq.${existing.id}` },
    body: {
      google_id: profile.googleId,
      email: profile.email.toLowerCase(),
      name: existing.name || profile.name || "",
      surname: existing.surname || profile.surname || "",
      picture: existing.picture || profile.picture || "",
      updated_at: new Date().toISOString()
    }
  });
  // Preserve all existing profile fields (especially DOB) even if the
  // Supabase PATCH response does not return the complete row.
  return rows?.[0] ? { ...existing, ...rows[0] } : existing;
}

function safeNext(value) {
  return value === "writer" ? "writer" : "";
}

function safeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    googleId: user.google_id || user.googleId,
    name: user.name || "",
    surname: user.surname || "",
    email: user.email,
    picture: user.picture || "",
    role: user.role || "reader",
    verified: true,
    authProvider: user.auth_provider || "google",
    createdAt: user.created_at || user.createdAt
  };
}

app.use(express.json({ limit: "8mb" }));
app.use(express.urlencoded({ extended: false }));

// Baseline security headers. The app currently relies on inline scripts and
// Google Analytics, so a strict CSP is intentionally left for the deployment
// hardening pass rather than breaking the existing browser build.
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});
app.use(session({
  store: new PgSession({
  pool: pgPool,
  tableName: "session"
}),
  name: "meteorink.sid",
  secret: process.env.SESSION_SECRET || (process.env.NODE_ENV === "production" ? (() => { throw new Error("SESSION_SECRET is required in production."); })() : crypto.randomBytes(32).toString("hex")),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));
function generateXCodeVerifier() {
  return crypto.randomBytes(32).toString("base64url");
}

function generateXCodeChallenge(verifier) {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

app.get("/auth/x", (req, res) => {
  if (!process.env.X_CLIENT_ID || !process.env.X_CLIENT_SECRET) {
    return res.status(500).send("X OAuth is not configured.");
  }

  const state = crypto.randomBytes(24).toString("hex");
  const codeVerifier = generateXCodeVerifier();
  const codeChallenge = generateXCodeChallenge(codeVerifier);

  req.session.xOauthState = state;
  req.session.xCodeVerifier = codeVerifier;
  req.session.xOauthNext = safeNext(req.query.next);

  const redirectUri =
    process.env.X_REDIRECT_URI ||
    `https://meteorink.com/auth/x/callback`;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.X_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: "users.read",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256"
  });

  res.redirect(`https://x.com/i/oauth2/authorize?${params.toString()}`);
});

app.get("/auth/x/callback", async (req, res) => {
  try {
    if (
      !req.query.code ||
      !req.query.state ||
      req.query.state !== req.session.xOauthState
    ) {
      return res.status(400).send("Invalid X OAuth state. Please start X login again.");
    }

    const codeVerifier = req.session.xCodeVerifier;
    const next = safeNext(req.session.xOauthNext);

    delete req.session.xOauthState;
    delete req.session.xCodeVerifier;
    delete req.session.xOauthNext;

    const redirectUri =
      process.env.X_REDIRECT_URI ||
      `https://meteorink.com/auth/x/callback`;

    const credentials = Buffer.from(
      `${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`
     ).toString("base64");

    const tokenResponse = await fetch("https://api.x.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${credentials}`
      },
      body: new URLSearchParams({
        code: String(req.query.code),
        grant_type: "authorization_code",
	client_id: process.env.X_CLIENT_ID,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      throw new Error(
        `X token exchange failed: ${JSON.stringify(tokenData)}`
      );
    }

    const userResponse = await fetch(
      "https://api.x.com/2/users/me?user.fields=profile_image_url,confirmed_email",
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`
        }
      }
    );

    const userData = await userResponse.json();

    if (!userResponse.ok || !userData.data?.id) {
      throw new Error(
        `X user lookup failed: ${JSON.stringify(userData)}`
      );
    }

    const xUser = userData.data;

    const email = xUser.confirmed_email || "";

    let existing = await findUserByXId(xUser.id);

    if (!existing && email) {
      existing = await findUserByEmail(email);
    }

    let user;

    if (!existing) {
      const rows = await supabaseRequest("users", {
        method: "POST",
        body: {
          x_id: xUser.id,
          email: email.toLowerCase(),
          name: xUser.name || "",
          surname: "",
          picture: xUser.profile_image_url || "",
          verified: true,
          auth_provider: "x",
          role: "reader"
        }
      });

      user = rows?.[0] || null;
    } else {
      const rows = await supabaseRequest("users", {
        method: "PATCH",
        query: { id: `eq.${existing.id}` },
        body: {
          x_id: xUser.id,
          email: email ? email.toLowerCase() : existing.email,
          name: existing.name || xUser.name || "",
          picture: xUser.profile_image_url || existing.picture || "",
          updated_at: new Date().toISOString()
        }
      });

      user = rows?.[0] || existing;
    }

    if (!user) {
      throw new Error("Unable to create or update the X user.");
    }

    req.session.userId = user.id;

    req.session.save(() => {
      const needsProfile = !user.dob;

      if (needsProfile) {
        const query = next
          ? `?xComplete=1&next=${encodeURIComponent(next)}`
          : "?xComplete=1";

        return res.redirect(`/signup.html${query}`);
      }

      const query = next
        ? `?oauth=success&next=${encodeURIComponent(next)}`
        : "?oauth=success";

      res.redirect(`/index.html${query}`);
    });

  } catch (err) {
    console.error("X OAuth error:", err);
    res.status(500).send("X sign-in failed. Check the server console for details.");
  }
});
app.get("/auth/google", (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(500).send("Google OAuth is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.");
  }
  const state = crypto.randomBytes(24).toString("hex");
  req.session.oauthState = state;
  req.session.oauthNext = safeNext(req.query.next);
  const url = oauth.generateAuthUrl({
    access_type: "offline",
    scope: ["openid", "email", "profile"],
    state,
    prompt: "select_account"
  });
  res.redirect(url);
});

app.get("/auth/google/callback", async (req, res) => {
  try {
    if (!req.query.code || !req.query.state || req.query.state !== req.session.oauthState) {
      return res.status(400).send("Invalid OAuth state. Please start Google login again.");
    }
    const next = safeNext(req.session.oauthNext);
    delete req.session.oauthState;
    delete req.session.oauthNext;

    const { tokens } = await oauth.getToken(String(req.query.code));
    const ticket = await oauth.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const p = ticket.getPayload();

    if (!p || !p.sub || !p.email || p.email_verified !== true) {
      return res.status(400).send("Google did not return a verified email address.");
    }

    const user = await upsertGoogleUser({
      googleId: p.sub,
      email: p.email,
      name: p.given_name || p.name || "",
      surname: p.family_name || "",
      picture: p.picture || ""
    });
    if (!user) throw new Error("Unable to create or update the Supabase user.");

    req.session.userId = user.id;
    req.session.save(() => {
      const needsProfile = !user.dob;
      if (needsProfile) {
        const query = next ? "?googleComplete=1&next=" + encodeURIComponent(next) : "?googleComplete=1";
        return res.redirect("/signup.html" + query);
      }
      const query = next ? "?oauth=success&next=" + encodeURIComponent(next) : "?oauth=success";
      res.redirect("/index.html" + query);
    });
  } catch (err) {
    console.error("Google OAuth error:", err);
    res.status(500).send("Google sign-in failed. Check the server console for details.");
  }
});

app.get("/api/me", async (req, res) => {
  try {
    const user = req.session.userId ? await findUserById(req.session.userId) : null;
    res.json({ authenticated: !!user, user: safeUser(user) });
  } catch (err) {
    console.error("/api/me error:", err);
    res.status(500).json({ authenticated: false, user: null, error: "Unable to load account." });
  }
});


app.post("/api/profile/photo", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated." });

  const picture = String(req.body.picture || "").trim();
  if (!/^data:image\/(?:webp|png|jpeg);base64,[A-Za-z0-9+/=\r\n]+$/.test(picture)) {
    return res.status(400).json({ error: "Please provide a valid JPG, PNG or WebP image." });
  }
  if (picture.length > 1600000) {
    return res.status(413).json({ error: "Profile photo is too large. Please choose a smaller image." });
  }

  try {
    const user = await findUserById(req.session.userId);
    if (!user) return res.status(404).json({ error: "Account not found." });

    const rows = await supabaseRequest("users", {
      method: "PATCH",
      query: { id: `eq.${user.id}` },
      body: { picture, updated_at: new Date().toISOString() }
    });
    const updatedUser = rows?.[0] || { ...user, picture };
    res.json({ ok: true, user: safeUser(updatedUser) });
  } catch (err) {
    console.error("/api/profile/photo error:", err);
    res.status(500).json({ error: "Unable to save profile photo." });
  }
});

app.post("/api/google/complete-profile", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated." });
  const dob = String(req.body.dob || "").trim();
  const name = String(req.body.name || "").trim();
  const surname = String(req.body.surname || "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    return res.status(400).json({ error: "Please provide a valid date of birth." });
  }
  const birth = new Date(dob + "T00:00:00");
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() ||
      (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
  if (age < 18) {
    return res.status(403).json({ error: "Standard MeteorInk accounts currently require age 18+." });
  }

  const user = await findUserById(req.session.userId);
  if (!user) return res.status(404).json({ error: "Account not found." });

  const rows = await supabaseRequest("users", {
    method: "PATCH",
    query: { id: `eq.${user.id}` },
    body: {
      name: name || user.name,
      surname: surname || user.surname,
      dob,
      updated_at: new Date().toISOString()
    }
  });
  const updatedUser = rows?.[0] || { ...user, name: name || user.name, surname: surname || user.surname, dob };
  res.json({ ok: true, user: safeUser(updatedUser), next: safeNext(req.body.next) });
});

// Public author directory/profile API. Public fields only.
function isDummyAuthorPicture(value) {
  const url = String(value || "").trim().toLowerCase();
  if (!url) return false;
  return url.includes("pravatar.cc") || url.includes("randomuser.me");
}

function publicAuthor(row) {
  if (!row) return null;
  const picture = isDummyAuthorPicture(row.picture) ? "" : (row.picture || "");
  return {
    id: row.id,
    userId: row.user_id,
    username: row.username || "",
    name: row.name || "",
    tagline: row.tagline || "",
    bio: row.bio || "",
    picture,
    banner: row.banner || "",
    links: Array.isArray(row.external_links) ? row.external_links : [],
    followers: Number(row.followers || 0),
    verified: !!row.verified,
    profileCreatedAt: row.profile_created_at || row.created_at,
    updatedAt: row.updated_at || row.created_at,
    showBio: row.show_bio !== false,
    showLinks: row.show_links !== false,
    showStats: row.show_stats !== false
  };
}

app.get("/api/authors", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim().toLowerCase().slice(0, 80);
    const rows = await supabaseRequest("authors", {
      query: { select: "id,user_id,username,name,tagline,bio,picture,banner,external_links,followers,verified,profile_created_at,created_at,updated_at", order: "created_at.desc", limit: "1000" }
    });
    const filtered = (rows || []).filter(row => !q || [row.username, row.name, row.tagline, row.bio].some(v => String(v || "").toLowerCase().includes(q)));
    res.json({ authors: filtered.map(publicAuthor) });
  } catch (err) {
    console.error("/api/authors error:", err);
    res.status(500).json({ authors: [], error: "Unable to load authors." });
  }
});

app.get("/api/authors/:id/follow", async (req, res) => {
  const authorId = String(req.params.id || "").trim();
  if (!authorId) return res.status(400).json({ error: "Author ID is required." });
  try {
    const authors = await supabaseRequest("authors", {
      query: { select: "id,user_id,followers", id: `eq.${authorId}`, limit: "1" }
    });
    const author = authors?.[0];
    if (!author) return res.status(404).json({ error: "Author not found." });
    let following = false;
    const self = !!req.session.userId && author.user_id === req.session.userId;
    if (req.session.userId && !self) {
      const rows = await supabaseRequest("author_follows", {
        query: { select: "author_id", user_id: `eq.${req.session.userId}`, author_id: `eq.${authorId}`, limit: "1" }
      });
      following = !!rows?.length;
    }
    res.json({ following, self, followers: Number(author.followers || 0) });
  } catch (err) {
    console.error("/api/authors/:id/follow GET error:", err);
    res.status(500).json({ error: "Unable to load follow status." });
  }
});

app.post("/api/authors/:id/follow", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated." });
  const authorId = String(req.params.id || "").trim();
  try {
    const authors = await supabaseRequest("authors", {
      query: { select: "id,user_id,followers", id: `eq.${authorId}`, limit: "1" }
    });
    const author = authors?.[0];
    if (!author) return res.status(404).json({ error: "Author not found." });
    if (author.user_id === req.session.userId) return res.status(400).json({ error: "You cannot follow your own author profile." });
    const result = await supabaseRpc("follow_author", { p_user_id: req.session.userId, p_author_id: authorId });
    const followers = Number(Array.isArray(result) ? result[0] : result);
    res.json({ ok: true, following: true, followers: Number.isFinite(followers) ? followers : Number(author.followers || 0) });
  } catch (err) {
    console.error("/api/authors/:id/follow POST error:", err);
    res.status(500).json({ error: "Unable to follow author." });
  }
});

app.delete("/api/authors/:id/follow", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated." });
  const authorId = String(req.params.id || "").trim();
  try {
    const authors = await supabaseRequest("authors", {
      query: { select: "id,user_id,followers", id: `eq.${authorId}`, limit: "1" }
    });
    const author = authors?.[0];
    if (!author) return res.status(404).json({ error: "Author not found." });
    const result = await supabaseRpc("unfollow_author", { p_user_id: req.session.userId, p_author_id: authorId });
    const followers = Number(Array.isArray(result) ? result[0] : result);
    res.json({ ok: true, following: false, followers: Number.isFinite(followers) ? followers : Number(author.followers || 0) });
  } catch (err) {
    console.error("/api/authors/:id/follow DELETE error:", err);
    res.status(500).json({ error: "Unable to unfollow author." });
  }
});

app.get("/api/authors/:id", async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    const rows = await supabaseRequest("authors", {
      query: { select: "id,user_id,username,name,tagline,bio,picture,banner,external_links,followers,verified,profile_created_at,created_at,updated_at", id: `eq.${id}`, limit: "1" }
    });
    const author = publicAuthor(rows?.[0]);
    if (!author) return res.status(404).json({ error: "Author not found." });
    res.json({ author });
  } catch (err) {
    console.error("/api/authors/:id error:", err);
    res.status(404).json({ error: "Author not found." });
  }
});

app.get("/api/authors/by-username/:username", async (req, res) => {
  try {
    const username = String(req.params.username || "").trim().toLowerCase();
    const rows = await supabaseRequest("authors", {
      query: { select: "id,user_id,username,name,tagline,bio,picture,banner,external_links,followers,verified,profile_created_at,created_at,updated_at", username: `eq.${username}`, limit: "1" }
    });
    const author = publicAuthor(rows?.[0]);
    if (!author) return res.status(404).json({ error: "Author not found." });
    res.json({ author });
  } catch (err) {
    console.error("/api/authors/by-username error:", err);
    res.status(404).json({ error: "Author not found." });
  }
});

app.get("/api/author/me", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated." });
  try {
    const rows = await supabaseRequest("authors", {
      query: { select: "*", user_id: `eq.${req.session.userId}`, limit: "1" }
    });
    const author = publicAuthor(rows?.[0]);
    if (!author) return res.status(404).json({ error: "Author profile not found." });
    res.json({ author });
  } catch (err) {
    console.error("/api/author/me error:", err);
    res.status(500).json({ error: "Unable to load author profile." });
  }
});

app.patch("/api/author/me", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated." });
  const username = String(req.body.username || "").trim().replace(/^@+/, "").toLowerCase();
  const name = String(req.body.name || "").trim();
  const tagline = String(req.body.tagline || "").trim();
  const bio = String(req.body.bio || "").trim();
  const picture = String(req.body.picture || "").trim();
  const banner = String(req.body.banner || "").trim();
  const links = Array.isArray(req.body.links) ? req.body.links : [];
  const showBio = req.body.showBio !== false;
  const showLinks = req.body.showLinks !== false;
  const showStats = req.body.showStats !== false;

  if (!/^[a-z0-9_]{3,30}$/.test(username)) return res.status(400).json({ error: "User ID must be 3–30 characters using letters, numbers and underscores." });
  if (!name || name.length > 80) return res.status(400).json({ error: "Please provide a valid pen name." });
  if (tagline.length > 120 || bio.length > 1200) return res.status(400).json({ error: "Profile text is too long." });
  if (links.length > 30) return res.status(400).json({ error: "You can add up to 30 external links." });
  for (const link of links) {
    if (!link || String(link.url || "").length > 1000 || !/^https?:\/\//i.test(String(link.url || ""))) return res.status(400).json({ error: "Each external link must use http:// or https://." });
  }
  if (picture && picture.length > 3000000) return res.status(413).json({ error: "Profile photo is too large." });
  if (banner && banner.length > 5000000) return res.status(413).json({ error: "Profile banner is too large." });

  try {
    const existing = await supabaseRequest("authors", { query: { select: "*", user_id: `eq.${req.session.userId}`, limit: "1" } });
    const current = existing?.[0];
    if (!current) return res.status(404).json({ error: "Author profile not found." });
    const conflict = await supabaseRequest("authors", { query: { select: "id,user_id", username: `eq.${username}`, limit: "1" } });
    if (conflict?.[0] && conflict[0].id !== current.id) return res.status(409).json({ error: "That User ID is already taken." });
    const rows = await supabaseRequest("authors", {
      method: "PATCH",
      query: { id: `eq.${current.id}` },
      body: { username, name, tagline, bio, picture, banner, external_links: links, show_bio: showBio, show_links: showLinks, show_stats: showStats, updated_at: new Date().toISOString() }
    });
    res.json({ ok: true, author: publicAuthor(rows?.[0] || { ...current, username, name, tagline, bio, picture, banner, external_links: links, show_bio: showBio, show_links: showLinks, show_stats: showStats }) });
  } catch (err) {
    console.error("/api/author/me PATCH error:", err);
    if (String(err.message || "").includes("duplicate key") || String(err.message || "").includes("authors_username_key")) return res.status(409).json({ error: "That User ID is already taken." });
    res.status(500).json({ error: "Unable to save author profile." });
  }
});


function publicNovel(row, author) {
  if (!row) return null;
  return {
    id: row.id,
    authorId: row.author_id,
    authorName: author?.name || "Unknown Author",
    authorUsername: author?.username || "",
    authorPicture: author?.picture || "",
    authorVerified: !!author?.verified,
    title: row.title || "Untitled Novel",
    description: row.description || "",
    genre: row.genre || "Uncategorized",
    genres: String(row.genre || "Uncategorized").split(",").map(x => x.trim()).filter(Boolean),
    cover: row.cover || "",
    status: row.status || "published",
    views: Number(row.views || 0),
    chapters: Number(row.chapter_count || 0),
    publishedAt: row.published_at || row.created_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function loadNovelAuthors(rows) {
  const ids = [...new Set((rows || []).map(r => r.author_id).filter(Boolean))];
  if (!ids.length) return new Map();
  const authors = await supabaseRequest("authors", {
    query: {
      select: "id,username,name,picture,verified",
      id: `in.(${ids.join(",")})`,
      limit: "1000"
    }
  });
  return new Map((authors || []).map(a => [String(a.id), a]));
}

async function loadNovelsFromPostgres({ q = "", authorId = "", id = "", status = "published" } = {}) {
  if (!(await ensureNovelSchema())) return null;
  const params = [];
  const where = [];

  if (id) {
    params.push(id);
    where.push(`n.id = $${params.length}`);
  }
  if (authorId) {
    params.push(authorId);
    where.push(`n.author_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    where.push(`n.status = $${params.length}`);
  }
  if (q) {
    params.push(`%${q}%`);
    where.push(`(
      n.title ILIKE $${params.length}
      OR n.description ILIKE $${params.length}
      OR n.genre ILIKE $${params.length}
      OR COALESCE(a.name, '') ILIKE $${params.length}
      OR COALESCE(a.username, '') ILIKE $${params.length}
    )`);
  }

  const result = await pgPool.query(`
    select
      n.id, n.author_id, n.title, n.description, n.genre, n.cover,
      n.status, n.views, n.published_at, n.created_at, n.updated_at,
      a.username as author_username, a.name as author_name,
      a.picture as author_picture, a.verified as author_verified
    from public.novels n
    left join public.authors a on a.id = n.author_id
    ${where.length ? `where ${where.join(" and ")}` : ""}
    order by n.published_at desc nulls last, n.created_at desc
    limit 1000
  `, params);

  return result.rows;
}

function publicPostgresNovel(row) {
  if (!row) return null;
  return publicNovel(row, {
    id: row.author_id,
    username: row.author_username || "",
    name: row.author_name || "Unknown Author",
    picture: row.author_picture || "",
    verified: !!row.author_verified
  });
}

app.get("/api/novels", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim().toLowerCase().slice(0, 100);
    const authorId = String(req.query.authorId || "").trim();
    const status = ["published", "draft", "archived"].includes(String(req.query.status || "published"))
      ? String(req.query.status || "published")
      : "published";

    try {
      const pgRows = await loadNovelsFromPostgres({ q, authorId, status });
      if (pgRows) return res.json({ novels: pgRows.map(publicPostgresNovel) });
    } catch (pgErr) {
      console.warn("[MeteorInk] PostgreSQL novel catalog unavailable, falling back to Supabase:", pgErr.message);
    }

    const rows = await supabaseRequest("novels", {
      query: {
        select: "id,author_id,title,description,genre,cover,status,views,published_at,created_at,updated_at",
        ...(authorId ? { author_id: `eq.${authorId}` } : {}),
        status: `eq.${status}`,
        order: "published_at.desc,created_at.desc",
        limit: "1000"
      }
    });
    const authors = await loadNovelAuthors(rows || []);
    let novels = (rows || []).map(row => publicNovel(row, authors.get(String(row.author_id))));
    if (q) novels = novels.filter(n => [n.title, n.description, n.genre, n.authorName, n.authorUsername]
      .some(v => String(v || "").toLowerCase().includes(q)));
    res.json({ novels });
  } catch (err) {
    console.error("/api/novels error:", err);
    res.status(500).json({ novels: [], error: String(err?.message || "Unable to load novels.") });
  }
});

app.get("/api/novels/:id", async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();

    try {
      const pgRows = await loadNovelsFromPostgres({ id, status: "published" });
      if (pgRows) {
        const novel = pgRows[0];
        if (!novel) return res.status(404).json({ error: "Novel not found." });
        return res.json({ novel: publicPostgresNovel(novel) });
      }
    } catch (pgErr) {
      console.warn("[MeteorInk] PostgreSQL novel detail unavailable, falling back to Supabase:", pgErr.message);
    }

    const rows = await supabaseRequest("novels", {
      query: {
        select: "id,author_id,title,description,genre,cover,status,views,published_at,created_at,updated_at",
        id: `eq.${id}`,
        status: "eq.published",
        limit: "1"
      }
    });
    const row = rows?.[0];
    if (!row) return res.status(404).json({ error: "Novel not found." });
    const authors = await loadNovelAuthors([row]);
    res.json({ novel: publicNovel(row, authors.get(String(row.author_id))) });
  } catch (err) {
    console.error("/api/novels/:id error:", err);
    res.status(404).json({ error: "Novel not found." });
  }
});

app.post("/api/novels", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated." });

  try {
    const authors = await supabaseRequest("authors", {
      query: {
        select: "id,username,name,picture,verified",
        user_id: `eq.${req.session.userId}`,
        limit: "1"
      }
    });
    const author = authors?.[0];
    if (!author) return res.status(403).json({ error: "Create your author profile first." });

    const title = String(req.body.title || "").trim();
    const description = String(req.body.description || "").trim();
    const genre = String(req.body.genre || "Uncategorized").trim() || "Uncategorized";
    const cover = String(req.body.cover || "").trim();
    const requestedId = String(req.body.id || "").trim();
    const id = requestedId || crypto.randomUUID();

    if (!title || title.length > 160) return res.status(400).json({ error: "Please provide a valid novel title." });
    if (description.length > 5000) return res.status(400).json({ error: "Novel description is too long." });
    if (genre.length > 500) return res.status(400).json({ error: "Genre selection is too long." });
    if (cover.length > 7000000) return res.status(413).json({ error: "Novel cover is too large." });
    if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: "Invalid novel ID." });

    const publishedAt = new Date().toISOString();

    // The deployed app already has DATABASE_URL because it is used by the
    // session store. Use the same database for novels when it contains the
    // authors table. This avoids Supabase REST schema-cache/RLS failures.
    try {
      if (await ensureNovelSchema()) {
        const existing = await pgPool.query(
          "select id, author_id, published_at from public.novels where id = $1 limit 1",
          [id]
        );

        if (existing.rows[0] && String(existing.rows[0].author_id) !== String(author.id)) {
          return res.status(409).json({ error: "Novel ID already belongs to another author." });
        }

        if (existing.rows[0]) {
          const updated = await pgPool.query(`
            update public.novels
            set title=$1, description=$2, genre=$3, cover=$4,
                status='published',
                published_at=coalesce(published_at, $5::timestamptz),
                updated_at=$5::timestamptz
            where id=$6 and author_id=$7
            returning id,author_id,title,description,genre,cover,status,views,published_at,created_at,updated_at
          `, [title, description, genre, cover, publishedAt, id, author.id]);

          const row = updated.rows[0];
          if (row) return res.json({ ok: true, novel: publicPostgresNovel({ ...row, author_username: author.username, author_name: author.name, author_picture: author.picture, author_verified: author.verified }) });
        } else {
          const inserted = await pgPool.query(`
            insert into public.novels
              (id, author_id, title, description, genre, cover, status, published_at, updated_at)
            values ($1,$2,$3,$4,$5,$6,'published',$7,$7)
            returning id,author_id,title,description,genre,cover,status,views,published_at,created_at,updated_at
          `, [id, author.id, title, description, genre, cover, publishedAt]);

          const row = inserted.rows[0];
          return res.status(201).json({
            ok: true,
            novel: publicPostgresNovel({
              ...row,
              author_username: author.username,
              author_name: author.name,
              author_picture: author.picture,
              author_verified: author.verified
            })
          });
        }
      }
    } catch (pgErr) {
      console.warn("[MeteorInk] PostgreSQL publish failed, falling back to Supabase REST:", pgErr.message);
    }

    // Supabase fallback for deployments where DATABASE_URL is not the same
    // database as the MeteorInk Supabase project.
    if (requestedId) {
      const existing = await supabaseRequest("novels", {
        query: { select: "*", id: `eq.${requestedId}`, limit: "1" }
      });
      if (existing?.[0]) {
        if (String(existing[0].author_id) !== String(author.id)) {
          return res.status(409).json({ error: "Novel ID already belongs to another author." });
        }
        const updated = await supabaseRequest("novels", {
          method: "PATCH",
          query: { id: `eq.${requestedId}`, author_id: `eq.${author.id}` },
          body: {
            title, description, genre, cover, status: "published",
            published_at: existing[0].published_at || publishedAt,
            updated_at: publishedAt
          }
        });
        return res.json({ ok: true, novel: publicNovel(updated?.[0] || { ...existing[0], title, description, genre, cover, status: "published" }, author) });
      }
    }

    const rows = await supabaseRequest("novels", {
      method: "POST",
      body: {
        id,
        author_id: author.id,
        title,
        description,
        genre,
        cover,
        status: "published",
        published_at: publishedAt,
        updated_at: publishedAt
      }
    });

    const row = rows?.[0];
    if (!row) throw new Error("Novel was saved but no record was returned.");
    res.status(201).json({ ok: true, novel: publicNovel(row, author) });
  } catch (err) {
    console.error("/api/novels POST error:", err);
    const message = String(err?.message || "Unable to publish novel.");
    if (/duplicate key|unique constraint/i.test(message)) {
      return res.status(409).json({ error: "A novel with this ID already exists." });
    }
    if (/relation .*novels|could not find the table|schema cache/i.test(message)) {
      return res.status(503).json({ error: "Novel database table is unavailable. Check the production database connection." });
    }
    res.status(500).json({ error: message });
  }
});


app.patch("/api/novels/:id", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated." });

  try {
    const novelId = String(req.params.id || "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(novelId)) return res.status(400).json({ error: "Invalid novel ID." });

    const authors = await supabaseRequest("authors", {
      query: {
        select: "id,username,name,picture,verified",
        user_id: `eq.${req.session.userId}`,
        limit: "1"
      }
    });
    const author = authors?.[0];
    if (!author) return res.status(403).json({ error: "Author profile not found." });

    const title = String(req.body.title || "").trim();
    const description = String(req.body.description || "").trim();
    const genre = String(req.body.genre || "Uncategorized").trim() || "Uncategorized";
    const cover = String(req.body.cover || "").trim();
    if (!title || title.length > 160) return res.status(400).json({ error: "Please provide a valid novel title." });
    if (description.length > 5000) return res.status(400).json({ error: "Novel description is too long." });
    if (genre.length > 500) return res.status(400).json({ error: "Genre selection is too long." });
    if (cover.length > 7000000) return res.status(413).json({ error: "Novel cover is too large." });

    const updatedAt = new Date().toISOString();

    try {
      if (await ensureNovelSchema()) {
        const existing = await pgPool.query(
          "select id, author_id, status, published_at from public.novels where id = $1 limit 1",
          [novelId]
        );
        if (existing.rows[0]) {
          if (String(existing.rows[0].author_id) !== String(author.id)) {
            return res.status(403).json({ error: "You can only edit your own novels." });
          }
          const result = await pgPool.query(`
            update public.novels
            set title=$1, description=$2, genre=$3, cover=$4, updated_at=$5::timestamptz
            where id=$6 and author_id=$7
            returning id,author_id,title,description,genre,cover,status,views,published_at,created_at,updated_at
          `, [title, description, genre, cover, updatedAt, novelId, author.id]);
          const row = result.rows[0];
          if (!row) return res.status(404).json({ error: "Novel not found." });
          return res.json({
            ok: true,
            novel: publicPostgresNovel({
              ...row,
              author_username: author.username,
              author_name: author.name,
              author_picture: author.picture,
              author_verified: author.verified
            })
          });
        }
      }
    } catch (pgErr) {
      console.warn("[MeteorInk] PostgreSQL novel edit failed, falling back to Supabase REST:", pgErr.message);
    }

    const existing = await supabaseRequest("novels", {
      query: { select: "*", id: `eq.${novelId}`, limit: "1" }
    });
    const current = existing?.[0];
    if (!current) return res.status(404).json({ error: "Novel not found." });
    if (String(current.author_id) !== String(author.id)) {
      return res.status(403).json({ error: "You can only edit your own novels." });
    }

    const rows = await supabaseRequest("novels", {
      method: "PATCH",
      query: { id: `eq.${novelId}`, author_id: `eq.${author.id}` },
      body: { title, description, genre, cover, updated_at: updatedAt }
    });
    const row = rows?.[0] || { ...current, title, description, genre, cover, updated_at: updatedAt };
    return res.json({ ok: true, novel: publicNovel(row, author) });
  } catch (err) {
    console.error("/api/novels/:id PATCH error:", err);
    res.status(500).json({ error: String(err?.message || "Unable to update novel.") });
  }
});

app.delete("/api/novels/:id", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated." });

  try {
    const novelId = String(req.params.id || "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(novelId)) {
      return res.status(400).json({ error: "Invalid novel ID." });
    }

    const authors = await supabaseRequest("authors", {
      query: {
        select: "id",
        user_id: `eq.${req.session.userId}`,
        limit: "1"
      }
    });
    const author = authors?.[0];
    if (!author) return res.status(403).json({ error: "Author profile not found." });

    // Use PostgreSQL when configured, matching the existing novel read/write path.
    try {
      if (await ensureNovelSchema()) {
        const existing = await pgPool.query(
          "select id, author_id from public.novels where id = $1 limit 1",
          [novelId]
        );
        const current = existing.rows[0];
        if (!current) return res.status(404).json({ error: "Novel not found." });
        if (String(current.author_id) !== String(author.id)) {
          return res.status(403).json({ error: "You can only delete your own novels." });
        }

        const result = await pgPool.query(
          "delete from public.novels where id = $1 and author_id = $2 returning id",
          [novelId, author.id]
        );
        if (!result.rows[0]) return res.status(404).json({ error: "Novel not found." });
        return res.json({ ok: true, id: novelId });
      }
    } catch (pgErr) {
      console.warn("[MeteorInk] PostgreSQL novel delete failed, falling back to Supabase REST:", pgErr.message);
    }

    const existing = await supabaseRequest("novels", {
      query: { select: "id,author_id", id: `eq.${novelId}`, limit: "1" }
    });
    const current = existing?.[0];
    if (!current) return res.status(404).json({ error: "Novel not found." });
    if (String(current.author_id) !== String(author.id)) {
      return res.status(403).json({ error: "You can only delete your own novels." });
    }

    const deleted = await supabaseRequest("novels", {
      method: "DELETE",
      query: { id: `eq.${novelId}`, author_id: `eq.${author.id}` },
      prefer: "return=representation"
    });
    if (!deleted?.length) return res.status(404).json({ error: "Novel not found." });
    return res.json({ ok: true, id: novelId });
  } catch (err) {
    console.error("/api/novels/:id DELETE error:", err);
    const message = String(err?.message || "Unable to delete novel.");
    if (/foreign key|violates|constraint/i.test(message)) {
      return res.status(409).json({ error: "This novel could not be deleted because another record still depends on it." });
    }
    res.status(500).json({ error: message });
  }
});

app.get("/api/author/me/novels", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated." });
  try {
    const authors = await supabaseRequest("authors", { query: { select: "id,username,name,picture,verified", user_id: `eq.${req.session.userId}`, limit: "1" } });
    const author = authors?.[0];
    if (!author) return res.status(404).json({ novels: [], error: "Author profile not found." });
    try {
      const pgRows = await loadNovelsFromPostgres({ authorId: author.id, status: "" });
      if (pgRows) return res.json({ novels: pgRows.map(row => publicPostgresNovel({
        ...row,
        author_username: author.username,
        author_name: author.name,
        author_picture: author.picture,
        author_verified: author.verified
      })) });
    } catch (pgErr) {
      console.warn("[MeteorInk] PostgreSQL author novel list unavailable, falling back to Supabase:", pgErr.message);
    }

    const rows = await supabaseRequest("novels", {
      query: { select: "id,author_id,title,description,genre,cover,status,views,published_at,created_at,updated_at", author_id: `eq.${author.id}`, order: "created_at.desc", limit: "1000" }
    });
    res.json({ novels: (rows || []).map(row => publicNovel(row, author)) });
  } catch (err) {
    console.error("/api/author/me/novels error:", err);
    res.status(500).json({ novels: [], error: "Unable to load your novels." });
  }
});

app.get("/health", async (_req, res) => {
  try {
    await supabaseRequest("users", { query: { select: "id", limit: "1" } });
    res.json({ ok: true, service: "meteorink", database: "connected" });
  } catch (err) {
    res.status(503).json({ ok: false, service: "meteorink", database: "error" });
  }
});

app.post("/api/author/setup", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated." });

  const realName = String(req.body.realName || "").trim();
  const dob = String(req.body.dob || "").trim();
  const penName = String(req.body.penName || "").trim();
  let username = String(req.body.username || "").trim().replace(/^@+/, "").toLowerCase();
  const bio = String(req.body.bio || "").trim();

  if (!realName) return res.status(400).json({ error: "Please provide your real name." });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    return res.status(400).json({ error: "Please provide a valid date of birth." });
  }
  if (!penName) return res.status(400).json({ error: "Please provide a pen name." });
  if (!username) username = penName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 30);
  if (!/^[a-z0-9_]{3,30}$/.test(username)) return res.status(400).json({ error: "Please choose a valid User ID." });
  if (penName.length > 80) return res.status(400).json({ error: "Pen name is too long." });
  if (bio.length > 1200) return res.status(400).json({ error: "Bio is too long." });

  const birth = new Date(dob + "T00:00:00");
  if (Number.isNaN(birth.getTime())) return res.status(400).json({ error: "Please provide a valid date of birth." });
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() ||
      (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
  if (age < 18) return res.status(403).json({ error: "Standard MeteorInk author accounts currently require age 18+." });

  try {
    const user = await findUserById(req.session.userId);
    if (!user) return res.status(404).json({ error: "Account not found." });

    // Check/create the public author profile first. The account is promoted to
    // author only after this succeeds, avoiding a half-created author account.
    const existing = await supabaseRequest("authors", {
      query: { select: "*", user_id: `eq.${user.id}`, limit: "1" }
    });
    const usernameConflict = await supabaseRequest("authors", {
      query: { select: "id,user_id", username: `eq.${username}`, limit: "1" }
    });
    if (usernameConflict?.[0] && usernameConflict[0].user_id !== user.id) return res.status(409).json({ error: "That User ID is already taken." });

    let author;
    if (existing?.[0]) {
      const rows = await supabaseRequest("authors", {
        method: "PATCH",
        query: { id: `eq.${existing[0].id}` },
        body: {
          username,
          name: penName,
          bio,
          updated_at: new Date().toISOString()
        }
      });
      author = rows?.[0] || { ...existing[0], name: penName, bio };
    } else {
      const rows = await supabaseRequest("authors", {
        method: "POST",
        body: {
          user_id: user.id,
          username,
          name: penName,
          bio,
          followers: 0,
          verified: false
        }
      });
      author = rows?.[0] || null;
    }

    if (!author) throw new Error("Supabase did not return the created author profile.");

    // Private identity data is stored only server-side in Supabase.
    // It is deliberately not returned by this endpoint or /api/me.
    await supabaseRequest("users", {
      method: "PATCH",
      query: { id: `eq.${user.id}` },
      body: {
        author_real_name: realName,
        dob,
        role: "author",
        updated_at: new Date().toISOString()
      },
      prefer: "return=minimal"
    });

    // Return public author fields only. Never return real_name or dob here.
    res.json({
      ok: true,
      author: {
        id: author.id,
        username: author.username || username,
        userId: author.user_id,
        name: author.name || "",
        bio: author.bio || "",
        followers: Number(author.followers || 0),
        verified: !!author.verified,
        profileCreatedAt: author.profile_created_at || author.created_at
      }
    });
  } catch (err) {
    console.error("/api/author/setup error:", err);
    const message = err?.message || "Unable to create the author profile.";
    res.status(500).json({ error: message });
  }
});

// Small operational endpoint for deployment checks. Keep this before static
// file serving so it cannot be shadowed by a file named "health".
app.get("/api/status", async (_req, res) => {
  try {
    await supabaseRequest("users", { query: { select: "id", limit: "1" } });
    res.json({ ok: true, service: "meteorink", database: "connected" });
  } catch (_err) {
    res.status(503).json({ ok: false, service: "meteorink", database: "unavailable" });
  }
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("meteorink.sid");
    res.json({ ok: true });
  });
});

// Never expose server-side code, user data, environment files, or VCS metadata.
app.use((req, res, next) => {
  const pathname = req.path.toLowerCase();
  if (pathname === "/.env" || pathname.startsWith("/server/") || pathname.startsWith("/.git/")) {
    return res.sendStatus(404);
  }
  next();
});

// Serve the existing MeteorInk browser app from the same origin.
app.use(express.static(ROOT, { index: "index.html", dotfiles: "deny" }));

app.listen(PORT, () => {
  console.log(`MeteorInk running at http://localhost:${PORT}/`);
});
