import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
  res.render("index", {
    layout: "layout/layout",
    title: "Experience Designer",
    currentPath: req.path,
  });
});

router.get("/about", (req, res) => {
  res.render("pages/about", {
    layout: "layout/layout",
    title: "About",
    currentPath: req.path,
  });
});

router.get("/portfolio", (req, res) => {
  res.render("pages/portfolio", {
    layout: "layout/layout",
    title: "Portfolio",
    currentPath: req.path,
  });
});

router.get("/portfolio/fdd", (req, res) => {
  res.render("pages/portfolio/fdd", {
    layout: "layout/layout",
    title: "FD&D",
    currentPath: req.path,
  });
});

router.get("/portfolio/tweakers", (req, res) => {
  res.render("pages/portfolio/tweakers", {
    layout: "layout/layout",
    title: "Tweakers.net",
    currentPath: req.path,
  });
});

router.get("/portfolio/exchange", (req, res) => {
  res.render("pages/portfolio/exchange", {
    layout: "layout/layout",
    title: "Exchange Program",
    currentPath: req.path,
  });
});

router.get("/portfolio/webuildapps", (req, res) => {
  res.render("pages/portfolio/webuildapps", {
    layout: "layout/layout",
    title: "Webuildapps",
    currentPath: req.path,
  });
});

router.get("/portfolio/colors", (req, res) => {
  res.render("pages/portfolio/colors", {
    layout: "layout/layout",
    title: "Colors",
    currentPath: req.path,
  });
});

router.get("/portfolio/canvasheroes", (req, res) => {
  res.render("pages/portfolio/canvasheroes", {
    layout: "layout/layout",
    title: "CanvasHeroes",
    currentPath: req.path,
  });
});

router.get("/portfolio/intouch", (req, res) => {
  res.render("pages/portfolio/intouch", {
    layout: "layout/layout",
    title: "InTouch",
    currentPath: req.path,
  });
});

router.get("/education", (req, res) => {
  res.render("pages/education", {
    layout: "layout/layout",
    title: "Education",
    currentPath: req.path,
  });
});

router.get("/contact", (req, res) => {
  res.render("pages/contact", {
    layout: "layout/layout",
    title: "Contact",
    currentPath: req.path,
  });
});

export default router;
