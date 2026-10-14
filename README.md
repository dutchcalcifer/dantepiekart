# Dante Piekart — Portfolio

Personal portfolio built with Node.js 24, Express and EJS.

[dantepiekart.nl](https://www.dantepiekart.nl/)

## Local setup

```sh
nvm install
nvm use
npm ci
```

If `.env` is missing, copy `.env.example` to `.env`. Fill in:

```dotenv
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Find these in Supabase's **Connect** dialog or **Settings → API Keys**. Use the project URL and publishable key. The website does not need a database password or secret key. Your local `.env` is ignored by Git.

```sh
npm run dev
```

Open [localhost:3000](http://localhost:3000). `npm start` runs without the development watcher. Both commands load `.env`; restart after changing that file. Templates are read when a page loads, so reload after editing them.

## Edit portfolio content

Use Supabase's **Table Editor**:

| Table            | What you edit                                                             |
| ---------------- | ------------------------------------------------------------------------- |
| `projects`       | Title, slug, description, body, skills, role, team, timeframe and order   |
| `project_links`  | A project's link labels, URLs and order                                   |
| `project_images` | A project's image paths, alternative text, dimensions, captions and order |

Write the story in `body`, separating paragraphs with a blank line. `skills` is a list; use the array editor. Lower `sort_order` numbers appear first.

Leave generated `id` values unchanged. On a link or image, `project_id` points to its project: select that project or copy its `id`. This is how the database keeps the right images and links together. Deleting a project also deletes its associated link/image rows, but not the image files.

Images currently use files in `public/images/`. To add images without Git, upload them to a public Supabase Storage bucket and use their public HTTPS URLs in `src`. Database rows store image references, not the files themselves. PDFs can stay in `public/files/`.

The database is already set up with public read access and row-level security. No setup SQL needs to be run again. `query-template.sql` is an empty scratch file for future queries.

About, Education and Contact content stays in EJS templates. Main-page metadata lives in `src/content/pages.js`; the domain and shared social image live in `src/config/site.js`.

## What the database code does

The flow is: **browser requests a page → Express reads Supabase → EJS renders HTML**. The database request happens on the server.

| File                          | Purpose                                                                                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/content/projects.js`     | Reads the connection settings, fetches projects with their links/images, and converts database fields into the format used by the templates |
| `src/routes/routes.js`        | Uses that content for the portfolio list, `/portfolio/:slug` pages and `/sitemap.xml`                                                       |
| `src/views/pages/project.ejs` | Displays paragraphs, skills, project details, images and links                                                                              |
| `app.js`                      | Starts Express and handles missing pages or temporary database failures                                                                     |
| `package.json`                | Defines startup and formatting/lint commands; startup loads `.env`                                                                          |

In `projects.js`, `getConnection()` checks the URL/key, `fetchProjects()` makes the read request, `toProject()` maps fields such as `body` into paragraphs, and `getProjects()` returns the cached result.

The server caches projects for 60 seconds and shares a fetch between simultaneous requests. It stops waiting after 8 seconds. New projects automatically get a page and sitemap entry; changing a slug changes its URL.

Local development without either Supabase variable uses `src/content/projects.json`. Production requires both variables. If a configured database is unavailable, portfolio pages show a temporary 503 error; the other main pages remain available.

## Check it yourself

1. Run `npm run dev` and open `/portfolio` and one project page.
2. In Supabase, temporarily add `(test)` to that project's title and save.
3. Wait 60 seconds, then reload both pages. If both show the change, they are reading the database.
4. Restore the title. Check `/sitemap.xml` to see the current project URLs.

An image reference can be checked by opening its `src` URL directly. To check descriptions and canonical URLs, view the project page's HTML source.

```sh
npm run check
```

This checks JavaScript linting and formatting; it does not test the live database. `npm run format` formats supported files. EJS templates are excluded. GitHub Actions runs the checks and a dependency audit.

For connection errors, check the terminal output, the two environment variables, and whether the Supabase project is paused. An unexpectedly empty portfolio can indicate missing read permissions.

## Deploy on Vercel

1. Add `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` under **Settings → Environment Variables**.
2. Enable them for Production and Preview if both should use this database.
3. Push the code and deploy. Changes to environment variables require a new deployment; content edits do not.

Keep the Express preset and Node 24, with the standard build/install/output settings. `vercel.json` includes the views and content in the server bundle. Enable Web Analytics and Speed Insights in the dashboard.

Navigation uses normal page loads. The menu supports keyboard navigation, Escape and focus return; reduced-motion preferences disable animations.
