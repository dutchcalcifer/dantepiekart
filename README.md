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

| Table            | Content                                                          |
| ---------------- | ---------------------------------------------------------------- |
| `projects`       | Title, slug, story, role, team, timeframe, type and sorting date |
| `skill_labels`   | Reusable headings, such as KEY SKILLS                            |
| `skills`         | Reusable skills or course names                                  |
| `project_skills` | Skills assigned to a project, in their display order             |
| `images`         | Reusable Storage assets, filenames and dimensions                |
| `project_images` | Images assigned to a project, with alt text, caption and order   |
| `project_links`  | A project's link labels, URLs and order                          |

Write the story in `body`, separating paragraphs with a blank line. `project_date` controls newest-first sorting; `timeframe` is the text visitors see. An empty sorting date puts the project last. Types `school` and `personal` appear in the left column; `internship` and `work` appear in the right. Mobile stacks these groups. Lower `sort_order` numbers put skills, links and images first within their project. Skill headings and link labels automatically become uppercase when saved.

Leave generated `id` values unchanged. Relationships use `project_id`, `skill_id`, `image_id` and `skill_label_id` to select existing records. Duplicate skill/image assignments are blocked. Deleting a project removes its assignments and links; shared skills, labels, image records and uploaded files remain. Shared records cannot be deleted while assigned to a project.

Image files stay in the public Supabase Storage bucket. `images.bucket` is the bucket name (currently `portfolio-images`), and `storage_path` is the filename/path inside it, without a leading slash or URL encoding. The server builds the public image URL from those fields. Dimensions belong to the asset; alt text and captions belong to its placement in a project. Upload and assignment forms will come later. PDFs can stay in `public/files/`.

The database uses row-level security and public read permissions. Login does not grant database write permissions yet.

### Replace the old database structure once

1. Deploy this code first. It reads both the old and new schemas, so the website keeps working during the change.
2. Open the existing portfolio project (`jxwsiatpapxbwoqedytp`) in Supabase → **SQL Editor → New query**. Paste the entire contents of `migrate-portfolio.sql`, then click **Run**. Supabase may ask you to confirm the destructive statements because the three old portfolio tables are replaced.
3. The result should show 8 projects, 8 links, 2 image placements, 2 image assets, 30 skills and 2 skill labels. Wait up to 60 seconds and reload the portfolio and admin overview.

The migration copies the current database content inside one transaction, recreates the portfolio tables and restores the content with its new relationships. It preserves project IDs, slugs, text, image placements, links and creation dates. Any failure rolls back the replacement. Storage, Auth and unrelated tables are untouched. Run this migration only once. If you add another project before running it, add its slug, type and sorting date to `project_metadata` near the top of the query.

`query-template.sql` contains the same **empty schema**, without content or table deletion. Use it only for a fresh database, not to migrate the existing one. No new environment variables are required.

About, Education and Contact content stays in EJS templates. Main-page metadata lives in `src/content/pages.js`; the domain and shared social image live in `src/config/site.js`.

## What the database code does

The flow is: **browser requests a page → Express reads Supabase → EJS renders HTML**. The database request happens on the server.

| File                          | Purpose                                                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `src/content/projects.js`     | Reads the connection settings, joins reusable skills/images, sorts projects and converts fields into the format used by the templates |
| `src/routes/routes.js`        | Uses that content for the portfolio list, `/portfolio/:slug` pages and `/sitemap.xml`                                                 |
| `src/views/pages/project.ejs` | Displays paragraphs, skills, project details, images and links                                                                        |
| `app.js`                      | Starts Express and handles missing pages or temporary database failures                                                               |
| `package.json`                | Defines startup and formatting/lint commands; startup loads `.env`                                                                    |

In `projects.js`, `getConnection()` checks the URL/key, `fetchProjects()` makes the read request, `toProject()` maps fields such as `body` into paragraphs, and `getProjects()` returns the cached result.

The server caches projects for 60 seconds and shares a fetch between simultaneous requests. Each database request times out after 8 seconds. Before migration it falls back to the old query if the new columns/relationships are missing. New projects automatically get a page and sitemap entry; changing a slug changes its URL.

Local development without either Supabase variable uses `src/content/projects.json`. Production requires both variables. If a configured database is unavailable, portfolio pages show a temporary 503 error; the other main pages remain available.

## Check it yourself

1. Run `npm run dev` and open `/portfolio` and one project page.
2. In Supabase, temporarily add `(test)` to that project's title and save.
3. Wait 60 seconds, then reload both pages. If both show the change, they are reading the database.
4. Restore the title. Check `/sitemap.xml` to see the current project URLs.

An image can be checked by opening its rendered URL directly or previewing the file in Storage. To check descriptions and canonical URLs, view the project page's HTML source.

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

## Admin login

The bottom of the menu links to `/admin/login`. After signing in, `/admin` lists the project pages from Supabase with preview links, edit/delete icons, and a create-page button. Editing, deletion and creation are disabled until their forms are implemented. The main template pages are not included.

Set these in your local `.env` and in Vercel's environment variables:

```dotenv
ADMIN_USERNAME=admin
ADMIN_PASSWORD=
ADMIN_SESSION_SECRET=
```

Local credentials have been generated in `.env`; open that file to see or change them. Use a password of at least 12 characters and a random session secret of at least 32 characters. Copy the three values into Vercel for each deployment environment that should support login, then redeploy. Missing or incomplete settings disable login without affecting the public website.

`src/auth/admin.js` checks credentials and encrypted session cookies. `src/routes/admin.js` handles login, protects admin routes, and handles logout. The forms reuse the site's fonts, colours and arrow buttons; `public/css/forms.css` adds reusable input styling.

`src/views/partials/admin-page-list.ejs` is the reusable list component, styled in `public/css/admin.css`. The route supplies page titles and URLs so the list stays independent of the database column names. The icons use `public/vectors/edit.svg` and `delete.svg`. Image and skill assignment will be part of the page editor later.

Sessions last up to 8 hours. Cookies are HttpOnly, SameSite and Secure on Vercel/production. Login and logout use POST forms with CSRF protection; passwords are never returned in the HTML. Changing the username, password or session secret invalidates existing sessions. Logout clears the browser's cookie; this stateless design does not maintain a server-side list of individually revoked cookies.

Repeated failed login submissions are limited to 10 per IP per 15 minutes **per running server instance**. This counter resets on restart and is not shared across Vercel instances; use Vercel Firewall rate limiting if you need a deployment-wide limit. Admin pages are excluded from indexing and sent with `Cache-Control: no-store`.

To check: open `/admin` before logging in (it redirects to login), try an incorrect password, sign in with the values in `.env`, then log out and confirm `/admin` redirects again. No password reset or database write access is included yet.
