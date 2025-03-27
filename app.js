import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import projectRoutes from "./src/routes/routes.js";
import expressEjsLayouts from "express-ejs-layouts";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "src/views"));

app.use(expressEjsLayouts);

app.use("/", projectRoutes);

app.use((req, res) => {
  res.status(404).render("pages/404.ejs", {
    layout: "./partials/layout",
    title: "404",
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render("pages/500.ejs", {
    layout: "./partials/layout",
    title: "500",
  });
});

app.listen(PORT, () => {
  console.log("Server Started: http://localhost:" + PORT);
});
