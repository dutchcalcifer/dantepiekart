import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { getIronSession, nodeCookies } from "iron-session";

const sessionDuration = 8 * 60 * 60;

// Credentials stay on the server. Incomplete settings disable login.
function getConfig() {
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (
    !username ||
    username.length > 100 ||
    !password ||
    password.length < 12 ||
    password.length > 256 ||
    !secret ||
    secret.length < 32
  ) {
    return null;
  }
  return { username, password, secret };
}

export function matches(value, expected) {
  if (typeof value !== "string" || typeof expected !== "string") return false;
  const digest = (text) => createHash("sha256").update(text).digest();
  return timingSafeEqual(digest(value), digest(expected));
}

// Changing credentials invalidates existing sessions as well as future logins.
function credentialVersion(config) {
  return createHmac("sha256", config.secret)
    .update(config.username + "\0" + config.password)
    .digest("hex");
}

export async function adminSession(req, res, next) {
  res.locals.isAdmin = false;
  res.locals.sessionExpired = false;
  req.adminConfig = getConfig();
  if (!req.adminConfig) return next();

  const secure =
    process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
  const cookies = nodeCookies(req, res);
  const options = {
    cookieName: secure ? "__Host-portfolio-admin" : "portfolio-admin",
    password: req.adminConfig.secret,
    ttl: sessionDuration,
    cookieOptions: { secure, httpOnly: true, sameSite: "lax", path: "/" },
  };
  req.adminSession = await getIronSession(cookies, options);
  const session = req.adminSession;
  res.locals.isAdmin =
    session.isAdmin === true &&
    typeof session.expiresAt === "number" &&
    session.expiresAt > Date.now() &&
    matches(session.version, credentialVersion(req.adminConfig));

  if (session.isAdmin && !res.locals.isAdmin) {
    res.locals.sessionExpired = true;
    session.destroy();
    req.adminSession = await getIronSession(
      { ...cookies, read: () => undefined, names: () => [] },
      options,
    );
  }
  res.vary("Cookie");
  next();
}

export async function csrfToken(req) {
  if (!req.adminSession) return "";
  if (!req.adminSession.csrf) {
    req.adminSession.csrf = randomBytes(32).toString("hex");
    await req.adminSession.save();
  }
  return req.adminSession.csrf;
}

export function validCsrf(req) {
  return (
    req.get("sec-fetch-site") !== "cross-site" &&
    matches(req.body?.csrf, req.adminSession?.csrf)
  );
}

export async function signIn(req) {
  req.adminSession.isAdmin = true;
  req.adminSession.version = credentialVersion(req.adminConfig);
  req.adminSession.expiresAt = Date.now() + sessionDuration * 1000;
  req.adminSession.csrf = randomBytes(32).toString("hex");
  await req.adminSession.save();
}

export function requireAdmin(req, res, next) {
  if (!res.locals.isAdmin) {
    const expired = res.locals.sessionExpired ? "?expired=1" : "";
    return res.redirect(
      req.method === "GET" ? 302 : 303,
      `/admin/login${expired}`,
    );
  }
  next();
}
