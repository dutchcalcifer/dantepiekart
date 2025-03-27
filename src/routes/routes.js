import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
  res.render("index", {
    layout: "./partials/layout",
    title: "Experience Designer",
  });
});

export default router;
