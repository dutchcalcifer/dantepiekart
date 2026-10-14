import localProjects from "./projects.json" with { type: "json" };

const cacheDuration = 60_000;
let cachedProjects;
let cacheExpiresAt = 0;
let pendingRequest;

function connectionError(message) {
  const error = new Error(message);
  error.status = 503;
  return error;
}

// Read the settings from .env locally or from Vercel's environment variables.
function getConnection() {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();

  // Keep local development usable before a database has been configured.
  if (
    !url &&
    !key &&
    !process.env.VERCEL &&
    process.env.NODE_ENV !== "production"
  ) {
    return null;
  }
  if (!url || !key) {
    throw connectionError(
      "Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in .env or Vercel's environment variables.",
    );
  }
  if (!key.startsWith("sb_publishable_")) {
    throw connectionError(
      "Use a Supabase publishable key (sb_publishable_...).",
    );
  }

  let endpoint;
  try {
    endpoint = new URL(url);
  } catch {
    throw connectionError("SUPABASE_URL must be your project's HTTPS URL.");
  }
  const localServer =
    process.env.NODE_ENV !== "production" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname);
  if (
    (endpoint.protocol !== "https:" &&
      !(localServer && endpoint.protocol === "http:")) ||
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.hash ||
    endpoint.pathname !== "/"
  ) {
    throw connectionError(
      "SUPABASE_URL must be the project URL, without an API path or query.",
    );
  }

  return { endpoint: new URL("/rest/v1/projects", endpoint), key };
}

// Keep the existing EJS templates usable with the database's column names.
function toProject(row) {
  return {
    slug: row.slug,
    title: row.title,
    description: row.description,
    paragraphs: row.body
      .split(/\r?\n\s*\r?\n/)
      .map((text) => text.trim())
      .filter(Boolean),
    skillsLabel: row.skills_label,
    skills: row.skills,
    links: row.project_links.map(({ label, url }) => ({ label, url })),
    caseStudy: {
      role: row.role,
      team: row.team,
      timeframe: row.timeframe,
      gallery: row.project_images.map(
        ({ src, alt, width, height, caption }) => ({
          src,
          alt,
          width,
          height,
          caption,
        }),
      ),
    },
  };
}

// Fetch each project with its related links/images, in their display order.
async function fetchProjects({ endpoint, key }) {
  endpoint.searchParams.set(
    "select",
    "slug,title,description,body,skills_label,skills,role,team,timeframe,project_links(label,url),project_images(src,alt,width,height,caption)",
  );
  endpoint.searchParams.set("order", "sort_order.asc,slug.asc");
  endpoint.searchParams.set("project_links.order", "sort_order.asc,id.asc");
  endpoint.searchParams.set("project_images.order", "sort_order.asc,id.asc");

  try {
    const response = await fetch(endpoint, {
      headers: { apikey: key, Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
      redirect: "error",
      cache: "no-store",
    });
    if (!response.ok) {
      throw connectionError(
        `Supabase returned HTTP ${response.status}. Check the project URL, publishable key, Data API and table read permissions.`,
      );
    }
    const rows = await response.json();
    if (!Array.isArray(rows)) {
      throw connectionError(
        "Supabase returned an unexpected project response.",
      );
    }
    return rows.map(toProject);
  } catch (error) {
    if (error.status === 503) throw error;
    // Do not log request headers or credentials in connection failures.
    throw connectionError(
      "Could not load projects from Supabase. Check the connection and whether the project is paused.",
    );
  }
}

// Reuse content for 60 seconds and share one fetch between simultaneous visitors.
export async function getProjects() {
  const connection = getConnection();
  if (!connection) return localProjects;
  if (cachedProjects && Date.now() < cacheExpiresAt) return cachedProjects;
  if (!pendingRequest) {
    pendingRequest = fetchProjects(connection)
      .then((projects) => {
        cachedProjects = projects;
        cacheExpiresAt = Date.now() + cacheDuration;
        return projects;
      })
      .finally(() => {
        pendingRequest = undefined;
      });
  }
  return pendingRequest;
}
