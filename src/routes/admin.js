import express from "express";
import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import { getProjects } from "../content/projects.js";
import {
  csrfToken,
  matches,
  requireAdmin,
  signIn,
  validCsrf,
} from "../auth/admin.js";

const router = express.Router();

async function renderAdmin(req, res, { status = 200, error = "" } = {}) {
  let projects = [];
  let loadFailed = false;
  try {
    projects = await getProjects();
  } catch (failure) {
    if (failure.status !== 503) throw failure;
    status = 503;
    error = "Your pages could not be loaded. Please try again.";
    loadFailed = true;
  }
  res.status(status).render("pages/admin/index", {
    title: "Admin | Dante Piekart",
    description: "Portfolio administration.",
    csrf: await csrfToken(req),
    error,
    loadFailed,
    projectPages: projects.map((project) => ({
      title: project.title,
      url: `/portfolio/${project.slug}`,
    })),
  });
}

async function renderLogin(
  req,
  res,
  { status = 200, error = "", username = "" } = {},
) {
  const configured = Boolean(req.adminConfig);
  res.status(configured ? status : 503).render("pages/admin/login", {
    title: "Admin login | Dante Piekart",
    description: "Sign in to manage your portfolio.",
    csrf: await csrfToken(req),
    configured,
    username,
    error: configured
      ? error
      : "Admin login is currently unavailable. Please try again later.",
    notice:
      req.query.logged_out === "1"
        ? "You have been logged out."
        : req.query.expired === "1" || res.locals.sessionExpired
          ? "Your session has expired. Please log in again."
          : "",
  });
}

router.use((req, res, next) => {
  res.locals.noindex = true;
  res.set({
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "same-origin",
    "Content-Security-Policy":
      "frame-ancestors 'none'; form-action 'self'; base-uri 'self'",
  });
  next();
});

router.get("/login", async (req, res) => {
  if (res.locals.isAdmin) return res.redirect(302, "/admin");
  await renderLogin(req, res);
});

const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const ip = process.env.VERCEL
      ? req.get("x-vercel-forwarded-for")?.split(",")[0].trim() || req.ip
      : req.ip;
    return ipKeyGenerator(ip);
  },
  handler: async (req, res) =>
    renderLogin(req, res, {
      status: 429,
      error: "Too many login attempts. Please wait 15 minutes and try again.",
    }),
});

router.post(
  "/login",
  (req, res, next) => (req.adminConfig ? next() : renderLogin(req, res)),
  loginLimit,
  express.urlencoded({ extended: false, limit: "8kb", parameterLimit: 5 }),
  async (req, res) => {
    if (res.locals.isAdmin) return res.redirect(303, "/admin");
    if (!validCsrf(req)) {
      return renderLogin(req, res, {
        status: 403,
        error: "This login form has expired. Please try again.",
      });
    }
    const username =
      typeof req.body.username === "string" ? req.body.username.trim() : "";
    const password =
      typeof req.body.password === "string" ? req.body.password : "";
    if (
      !username ||
      !password ||
      username.length > 100 ||
      password.length > 256
    ) {
      return renderLogin(req, res, {
        status: 422,
        error: "Enter your username and password.",
        username: username.slice(0, 100),
      });
    }
    const correctUsername = matches(username, req.adminConfig.username);
    const correctPassword = matches(password, req.adminConfig.password);
    if (!correctUsername || !correctPassword) {
      return renderLogin(req, res, {
        status: 401,
        error: "Incorrect username or password.",
        username,
      });
    }
    await signIn(req);
    res.redirect(303, "/admin");
  },
);

// Every admin route below this guard requires a valid session.
router.use(requireAdmin);

router.get("/", async (req, res) => {
  await renderAdmin(req, res);
});

router.post(
  "/logout",
  express.urlencoded({ extended: false, limit: "8kb", parameterLimit: 5 }),
  async (req, res) => {
    if (!validCsrf(req)) {
      return renderAdmin(req, res, {
        status: 403,
        error: "This logout form has expired. Please try again.",
      });
    }
    req.adminSession.destroy();
    res.redirect(303, "/admin/login?logged_out=1");
  },
);

// Body-parser errors can contain submitted passwords; handle them without logging.
router.use((error, req, res, next) => {
  if (
    ["entity.too.large", "parameters.too.many", "entity.parse.failed"].includes(
      error.type,
    )
  ) {
    return renderLogin(req, res, {
      status: error.status || 400,
      error: "That form could not be submitted. Please try again.",
    });
  }
  next(error);
});

export default router;
