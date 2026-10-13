import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import projectRoutes from "./src/routes/routes.js";
import expressEjsLayouts from "express-ejs-layouts";
import { site } from "./src/config/site.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.disable("x-powered-by");
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "src/views"));
app.set("layout", "layout/layout");
app.locals.site = site;
app.use(expressEjsLayouts);
app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  res.locals.canonicalUrl = null;
  res.locals.noindex = false;
  res.locals.currentYear = new Date().getFullYear();
  next();
});
app.use("/", projectRoutes);

app.use((req, res) => {
  res.status(404).render("pages/errors/404", {
    title: "Page not found | Dante Piekart",
    description:
      "The page you requested could not be found. Explore Dante Piekart's portfolio instead.",
    noindex: true,
  });
});

// Express recognizes error handlers by their four arguments.
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).render("pages/errors/500", {
    title: "Something went wrong | Dante Piekart",
    description: "This page could not be loaded. Please try again later.",
    noindex: true,
  });
});

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const port = process.env.PORT || 3000;
  app.listen(port, () =>
    console.log(`Server started: http://localhost:${port}`),
  );
}

export default app;
