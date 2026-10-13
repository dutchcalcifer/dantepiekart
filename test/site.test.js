import assert from "node:assert/strict";
import { once } from "node:events";
import fs from "node:fs/promises";
import { before, after, test } from "node:test";
import app from "../app.js";
import { pages, projects } from "../src/content/pages.js";
import { site } from "../src/config/site.js";

let server;
let baseUrl;
const renderedPages = new Map();

before(async () => {
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server?.listening) await new Promise((resolve) => server.close(resolve));
});

function decode(value) {
  return value.replace(/&(?:amp|quot|lt|gt|#39|#\d+);/g, (entity) => {
    const named = {
      "&amp;": "&",
      "&quot;": '"',
      "&lt;": "<",
      "&gt;": ">",
      "&#39;": "'",
    };
    return named[entity] ?? String.fromCodePoint(Number(entity.slice(2, -1)));
  });
}

function meta(html, name) {
  const tag = [...html.matchAll(/<meta\b[^>]+>/g)]
    .map(([value]) => value)
    .find(
      (value) =>
        value.includes(`name="${name}"`) ||
        value.includes(`property="${name}"`),
    );
  return tag && decode(tag.match(/content="([^"]*)"/)[1]);
}

test("every page renders with unique metadata and a trusted canonical URL", async () => {
  const descriptions = new Set();
  for (const page of pages) {
    const response = await fetch(`${baseUrl}${page.path}`, {
      headers: { Host: "untrusted.example" },
    });
    assert.equal(response.status, 200, page.path);
    const html = await response.text();
    renderedPages.set(page.path, html);
    assert.equal(decode(html.match(/<title>(.*?)<\/title>/s)[1]), page.title);
    assert.equal(meta(html, "description"), page.description);
    assert.equal(meta(html, "og:title"), page.title);
    assert.equal(meta(html, "og:description"), page.description);
    assert.equal(meta(html, "og:url"), `${site.url}${page.path}`);
    assert.equal(meta(html, "twitter:card"), "summary_large_image");
    assert.equal(meta(html, "twitter:description"), page.description);
    assert.equal(meta(html, "og:image"), `${site.url}${site.socialImage}`);
    assert.ok(
      html.includes(`<link rel="canonical" href="${site.url}${page.path}"`),
      page.path,
    );
    assert.equal([...html.matchAll(/<h1\b/g)].length, 1, page.path);
    assert.ok(
      !descriptions.has(page.description),
      `Duplicate description: ${page.path}`,
    );
    descriptions.add(page.description);
  }
});

test("portfolio links and local assets resolve, including FD&D", async () => {
  const urls = new Set();
  for (const html of renderedPages.values()) {
    for (const [, raw] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const url = decode(raw);
      if (url.startsWith("/_vercel/")) continue; // These endpoints are provided by Vercel.
      if (url.startsWith("/") && !url.startsWith("//")) urls.add(url);
      else assert.match(url, /^(https:\/\/|mailto:|#)/, `Fragile URL: ${url}`);
    }
  }
  assert.ok(urls.has("/portfolio/fdd"));
  for (const url of urls) {
    const response = await fetch(`${baseUrl}${url}`);
    assert.equal(response.status, 200, url);
    await response.arrayBuffer();
  }
});

test("trailing slash redirects preserve queries and stay on the same origin", async () => {
  for (const [path, expected] of [
    ["/portfolio/?from=nav", "/portfolio?from=nav"],
    ["/portfolio/cmdnavigator///", "/portfolio/cmdnavigator"],
    ["//untrusted.example/", "/untrusted.example"],
  ]) {
    const response = await fetch(`${baseUrl}${path}`, { redirect: "manual" });
    assert.equal(response.status, 308);
    assert.equal(response.headers.get("location"), expected);
  }
});

test("sitemap lists all pages and robots advertises the canonical sitemap", async () => {
  const sitemap = await fetch(`${baseUrl}/sitemap.xml`);
  assert.equal(sitemap.status, 200);
  assert.match(sitemap.headers.get("content-type"), /application\/xml/);
  const xml = await sitemap.text();
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(([, url]) => url);
  assert.deepEqual(
    urls.sort(),
    pages.map((page) => `${site.url}${page.path}`).sort(),
  );
  const robots = await fetch(`${baseUrl}/robots.txt`);
  assert.equal(robots.status, 200);
  assert.match(
    await robots.text(),
    new RegExp(`Sitemap: ${site.url}/sitemap.xml`),
  );
});

test("missing pages return a useful, non-indexable 404", async () => {
  const response = await fetch(`${baseUrl}/missing-page`);
  assert.equal(response.status, 404);
  const html = await response.text();
  assert.equal(meta(html, "robots"), "noindex, follow");
  assert.match(html, /Page not found/);
  assert.ok(!html.includes('rel="canonical"'));
});

test("empty case studies stay hidden; filled fields and images render safely", async () => {
  const project = projects.find((entry) => entry.slug === "cmdnavigator");
  assert.ok(
    !renderedPages.get("/portfolio/cmdnavigator").includes("The challenge"),
  );
  const original = project.caseStudy;
  try {
    project.caseStudy = {
      role: "Product designer",
      team: "Two designers",
      timeframe: "2026",
      challenge: "<script>alert('content')</script>",
      approach: [
        { title: "Research", text: "Tested the prototype with students." },
      ],
      outcome: "The revised prototype was tested.",
      reflections: "Clearer labels helped.",
      gallery: [
        {
          src: "/images/example.webp",
          alt: "Prototype screen",
          width: 1600,
          height: 1000,
          caption: "A research prototype.",
        },
      ],
    };
    const response = await fetch(`${baseUrl}/portfolio/cmdnavigator`);
    assert.equal(response.status, 200);
    const html = await response.text();
    for (const heading of [
      "My role",
      "The challenge",
      "My approach",
      "Project gallery",
      "The outcome",
      "What I learned",
    ])
      assert.ok(html.includes(heading), heading);
    assert.ok(!html.includes("<script>alert('content')</script>"));
    assert.match(html, /&lt;script&gt;/);
    assert.match(
      html,
      /alt="Prototype screen" width="1600" height="1000" loading="lazy"/,
    );
  } finally {
    project.caseStudy = original;
  }
});

test("project data uses unique slugs and complete, safe content fields", async () => {
  assert.equal(
    new Set(projects.map((project) => project.slug)).size,
    projects.length,
  );
  for (const project of projects) {
    assert.match(project.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    for (const field of ["title", "description", "skillsLabel"])
      assert.ok(
        typeof project[field] === "string" && project[field].trim(),
        `${project.slug}: ${field}`,
      );
    for (const field of ["paragraphs", "skills"])
      assert.ok(project[field].every((value) => typeof value === "string"));
    for (const link of project.links) {
      assert.ok(link.label.trim());
      assert.match(link.url, /^(https:\/\/|\/(?!\/))/);
    }
    for (const field of [
      "role",
      "team",
      "timeframe",
      "challenge",
      "outcome",
      "reflections",
    ])
      assert.equal(typeof project.caseStudy[field], "string");
    for (const step of project.caseStudy.approach) {
      assert.ok(step.title.trim());
      assert.ok(step.text.trim());
    }
    for (const image of project.caseStudy.gallery) {
      assert.ok(image.alt.trim());
      assert.ok(Number.isInteger(image.width) && image.width > 0);
      assert.ok(Number.isInteger(image.height) && image.height > 0);
      assert.match(image.src, /^(https:\/\/|\/(?!\/))/);
      if (image.src.startsWith("/")) await fs.access(`public${image.src}`);
    }
  }
});

test("the social image is a real 1200 by 630 PNG", async () => {
  const image = await fs.readFile(`public${site.socialImage}`);
  assert.equal(image.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(image.readUInt32BE(16), 1200);
  assert.equal(image.readUInt32BE(20), 630);
});
