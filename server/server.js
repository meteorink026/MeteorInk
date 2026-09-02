require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const path = require("path");
const crypto = require("crypto");
const express = require("express");
const session = require("express-session");
const { OAuth2Client } = require("google-auth-library");

const app = express();
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);
const PORT = Number(process.env.PORT || 3000);
const ROOT = path.join(__dirname, "..");

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
      picture: profile.picture || existing.picture || "",
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
    dob: user.dob || null,
    verified: true,
    authProvider: user.auth_provider || "google",
    createdAt: user.created_at || user.createdAt
  };
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(session({
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

app.get("/health", async (_req, res) => {
  try {
    await supabaseRequest("users", { query: { select: "id", limit: "1" } });
    res.json({ ok: true, service: "meteorink", database: "connected" });
  } catch (err) {
    res.status(503).json({ ok: false, service: "meteorink", database: "error" });
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
