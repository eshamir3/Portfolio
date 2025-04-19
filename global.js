console.log("IT’S ALIVE!");

// Base path for GitHub Pages vs local dev
const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "/"
  : "/Portfolio/"; // Change this if your repo name is different!

// Step 3.1: Define pages for navigation
let pages = [
  { url: "", title: "Home" },
  { url: "projects/", title: "Projects" },
  { url: "resume/", title: "Resume" },
  { url: "contact/", title: "Contact" },
  { url: "https://github.com/eshamir3", title: "GitHub" } // Replace with your actual GitHub URL
];

// Create <nav> and add it to the top of <body>
let nav = document.createElement("nav");
document.body.prepend(nav);

// Loop through pages and add links
for (let p of pages) {
  let url = p.url;
  let title = p.title;

  // Add BASE_PATH to relative URLs
  url = !url.startsWith("http") ? BASE_PATH + url : url;

  // Create anchor element
  let a = document.createElement("a");
  a.href = url;
  a.textContent = title;

  // Highlight current page
  a.classList.toggle(
    "current",
    a.host === location.host && a.pathname === location.pathname
  );

  // Open external links in new tab
  a.toggleAttribute("target", a.host !== location.host);

  nav.append(a);
}
