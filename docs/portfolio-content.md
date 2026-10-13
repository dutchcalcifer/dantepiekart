# Filling in portfolio projects

Edit `src/content/projects.json`. Each entry creates its project page, portfolio link, metadata and sitemap entry. Existing descriptions, skills and links have been retained; `fdd` is ready for your content.

To add a project, copy `docs/project-template.json` into the array. Use a unique lowercase slug with hyphens. Write an accurate summary in `description`; this appears in search results and social previews.

The `caseStudy` fields are optional. Empty fields do not create headings, placeholder text or image boxes on the website.

| Field                   | What to add                                                                   |
| ----------------------- | ----------------------------------------------------------------------------- |
| `paragraphs`            | Short introductory paragraphs, as an array of strings                         |
| `skills`                | Skills or tools used, as an array of strings                                  |
| `links`                 | Objects with `label` and `url`, for your website, prototype or PDF            |
| `caseStudy.role`        | Your responsibilities and contribution                                        |
| `caseStudy.team`        | Who you worked with                                                           |
| `caseStudy.timeframe`   | Dates or project duration                                                     |
| `caseStudy.challenge`   | The problem, audience and constraints                                         |
| `caseStudy.approach`    | Objects with `title` and `text` describing research, iterations and decisions |
| `caseStudy.outcome`     | What changed, with evidence or metrics when available                         |
| `caseStudy.reflections` | What you learned and what you would improve                                   |
| `caseStudy.gallery`     | Image objects with `src`, `alt`, `width`, `height` and optional `caption`     |

Example link:

```json
{ "label": "VIEW PROTOTYPE", "url": "https://example.com/prototype" }
```

Example approach step:

```json
{
  "title": "Research",
  "text": "Describe what you investigated and how the findings informed your design."
}
```

Example gallery entry:

```json
{
  "src": "/images/projects/your-project/screen.webp",
  "alt": "Describe the design and the relevant detail shown in this screenshot.",
  "width": 1600,
  "height": 1000,
  "caption": "Explain what this image demonstrates."
}
```

Place that image in `public/images/projects/your-project/`. Supply its real dimensions to reserve space before it loads. Use root-relative local paths beginning with `/`, or full HTTPS URLs. Text fields render as plain text; HTML is escaped.

Run `npm run check` after editing. It checks content structure, local resources, page rendering, links and metadata. Reload your browser to see JSON/template changes during `npm run dev`; Node's watcher restarts imported JavaScript automatically.

The shared social image is `public/images/social-preview.png`. Its editable source is `public/images/social-preview.svg`. Site-wide URL and image settings live in `src/config/site.js`; main-page titles and descriptions live in `src/content/pages.js`.
