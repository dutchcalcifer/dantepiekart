import projects from "./projects.json" with { type: "json" };

export { projects };

export const pages = [
  {
    path: "/",
    view: "index",
    title: "Dante Piekart | Product Designer & Front-end Developer",
    description:
      "Dante Piekart's portfolio: product design, UX research, interaction design and front-end development. Explore selected projects and experience.",
  },
  {
    path: "/about",
    view: "pages/about",
    title: "About | Dante Piekart",
    description:
      "Meet Dante Piekart, a Communication and Multimedia Design graduate combining product design and front-end development.",
  },
  {
    path: "/portfolio",
    view: "pages/portfolio",
    title: "Portfolio | Dante Piekart",
    description:
      "Explore Dante Piekart's work in UX, product design and development, including CMD Navigator, AutoWeek, Tweakers.net and InTouch.",
  },
  ...projects.map((project) => ({
    path: `/portfolio/${project.slug}`,
    view: "pages/project",
    title: `${project.title} | Dante Piekart`,
    description: project.description,
    project,
  })),
  {
    path: "/education",
    view: "pages/education",
    title: "Education | Dante Piekart",
    description:
      "Dante Piekart's education at Amsterdam University of Applied Sciences, the University of Michigan and ROC Horizon College.",
  },
  {
    path: "/contact",
    view: "pages/contact",
    title: "Contact | Dante Piekart",
    description:
      "Get in touch with Dante Piekart about product design, front-end development and collaboration. Find email and social links.",
  },
];
