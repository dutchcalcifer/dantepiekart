import express from "express";
import { pages, projects } from "../content/pages.js";
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

router.get("/sitemap.xml", (req, res) => {
  const urls = pages
    .map((page) => `<url><loc>${site.url}${page.path}</loc></url>`)
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
  router.get(page.path, (req, res) => {
    res.render(page.view, {
      title: page.title,
      description: page.description,
      canonicalUrl: `${site.url}${page.path}`,
      project: page.project,
      projects,
    });
  });
}

export default router;
