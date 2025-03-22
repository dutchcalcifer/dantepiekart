import express from "express";

const router = express.Router();

// Home route - renders the index.ejs file
router.get("/", (req, res) => {
  res.render("index", { title: "Home Page" });
});

export default router;
