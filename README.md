# Dante Piekart - Portfolio

Portfolio website for **Dante Piekart**, Product Designer and Front-end Developer. Built with Node.js 24, Express 5 and EJS 7.

[dantepiekart.nl](https://www.dantepiekart.nl/)

## Local development

```sh
nvm install
nvm use
npm ci
npm run dev
```

Open `http://localhost:3000`. `npm start` runs the server without a watcher. Set `PORT` to use another port, for example `PORT=3100 npm start`. The Node 24 major version is specified in `.nvmrc`, `.node-version` and `package.json`; use the latest available Node 24 patch.

Node's native watcher restarts the server when imported source changes. Templates are read when a page is requested; reload the browser after editing content. Production template caching is enabled by Express when `NODE_ENV=production`.

## Checks

```sh
npm run check
npm audit
```

`check` runs ESLint and Prettier. The GitHub Actions workflow runs those checks and a dependency audit on pushes and pull requests.

Use `npm run format` to format supported source files. EJS templates are excluded because Prettier does not support EJS natively.

## Content

- Edit projects in `src/content/projects.json`.
- Copy `docs/project-template.json` to create another project.
- Follow [the portfolio content guide](docs/portfolio-content.md) to add role, research, process, outcomes and screenshots. Empty case-study fields stay hidden.
- Edit main-page titles and descriptions in `src/content/pages.js`.
- Site URL and social-image settings live in `src/config/site.js`.

Project pages, portfolio links and `/sitemap.xml` use the same content list. `/robots.txt` advertises the sitemap. Canonical URLs always use `https://www.dantepiekart.nl`, including on local or preview deployments.

## Vercel

The Express app is exported from `app.js`. Vercel's Express preset handles routing and serves `public/` assets through its CDN. `vercel.json` includes EJS views and project content in the server bundle; there is no separate API function or build step.

Web Analytics and Speed Insights use Vercel's script endpoints directly. Enable both products in the Vercel project dashboard. Those endpoints are supplied by Vercel and are unavailable on the plain local Express server.

The menu uses a native dialog with keyboard focus containment, Escape dismissal and focus return. A skip link and visible focus indicators support keyboard navigation; a navigation fallback is available without JavaScript. Reduced-motion preferences disable animations.

Page navigation uses standard browser page loads with no transition effects. Arrows are embedded in the CSS so they do not wait for a separate icon request.
