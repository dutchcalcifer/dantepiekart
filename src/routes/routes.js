import express from "express";
import { pages } from "../content/pages.js";
import { getProjects } from "../content/projects.js";
import { site } from "../config/site.js";

const router = express.Router();

// Keep one URL per page, including when visitors arrive with a trailing slash.
router.use((req, res, next) => {
  if (req.path.length > 1 && req.path.endsWith("/")) {
    const queryStart = req.originalUrl.indexOf("?");
    const query = queryStart === -1 ? "" : req.originalUrl.slice(queryStart);
    const normalizedPath = `/${req.path.replace(/^\/+|\/+$/g, "")}`;
    return res.redirect(308, `${normalizedPath}${query}`);
  }
  next();
});

router.get("/sitemap.xml", async (req, res) => {
  res.set("Cache-Control", "no-store");
  const projects = await getProjects();
  const paths = [
    ...pages.map((page) => page.path),
    ...projects.map((project) => `/portfolio/${project.slug}`),
  ];
  const urls = paths
    .map((path) => `<url><loc>${site.url}${path}</loc></url>`)
    .join("");
  res
    .type("application/xml")
    .send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
    );
});

router.get("/robots.txt", (req, res) => {
  res
    .type("text/plain")
    .send(`User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap.xml\n`);
});

for (const page of pages) {
  router.get(page.path, async (req, res) => {
    const projects = page.path === "/portfolio" ? await getProjects() : [];
    if (page.path === "/portfolio") res.set("Cache-Control", "no-store");
    res.render(page.view, {
      title: page.title,
      description: page.description,
      canonicalUrl: `${site.url}${page.path}`,
      projects,
    });
  });
}

router.get("/portfolio/:slug", async (req, res, next) => {
  const projects = await getProjects();
  const project = projects.find((entry) => entry.slug === req.params.slug);
  if (!project) return next();
  res.set("Cache-Control", "no-store");
  res.render("pages/project", {
    title: `${project.title} | Dante Piekart`,
    description: project.description,
    canonicalUrl: `${site.url}/portfolio/${project.slug}`,
    project,
  });
});

export default router;
