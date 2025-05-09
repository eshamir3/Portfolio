console.log("IT'S ALIVE!");

// Base path for GitHub Pages vs local dev
const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "/"
  : "/Portfolio/"; // ✅ Matches your repo name exactly (capital "P")

// Define pages for navigation
let pages = [
    { url: "index.html", title: "Home" },
    { url: "projects/", title: "Projects" },
    { url: "resume/", title: "Resume" },
    { url: "contact/", title: "Contact" },
    { url: "meta/", title: "Meta" },
    { url: "https://github.com/eshamir3", title: "GitHub" }
  ];

// Create <nav> and add it to the top of <body>
let nav = document.createElement("nav");
document.body.prepend(nav);

// Loop through pages and add links
for (let p of pages) {
  let url = p.url;
  let title = p.title;

  // Add BASE_PATH to internal URLs
  url = !url.startsWith("http") ? BASE_PATH + url : url;

  // Create link element
  let a = document.createElement("a");
  a.href = url;
  a.textContent = title;

  // Highlight current page safely (fix for GitHub Pages)
  a.classList.toggle(
    "current",
    a.pathname.replace(BASE_PATH, "/") === location.pathname.replace(BASE_PATH, "/")
  );

  // Open external links in a new tab
  a.toggleAttribute("target", a.host !== location.host);

  nav.append(a);
}

// DARK MODE TOGGLE
document.body.insertAdjacentHTML(
  "afterbegin",
  `
    <label class="color-scheme">
      Theme:
      <select>
        <option value="light dark">Automatic</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  `
);

const select = document.querySelector(".color-scheme select");

function setColorScheme(scheme) {
  document.documentElement.style.setProperty("color-scheme", scheme);
}

// Listen for user changes
select.addEventListener("input", (event) => {
  const selected = event.target.value;
  console.log("Color scheme changed to", selected);
  setColorScheme(selected);
  localStorage.colorScheme = selected;
});

// On page load: restore saved preference (if any)
if ("colorScheme" in localStorage) {
  const saved = localStorage.colorScheme;
  setColorScheme(saved);
  select.value = saved;
}

// CONTACT FORM SUBMIT
const form = document.querySelector("#contact-form");

form?.addEventListener("submit", (event) => {
  event.preventDefault();

  const data = new FormData(form);
  let params = [];

  for (let [name, value] of data) {
    params.push(`${name}=${encodeURIComponent(value)}`);
  }

  const url = `${form.action}?${params.join("&")}`;
  location.href = url; // Opens default mail app with prefilled subject/body
});

// FETCH JSON DATA
export async function fetchJSON(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }
    console.log(response); // Optional: For debugging
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching or parsing JSON data:", error);
  }
}

// RENDER PROJECTS
export function renderProjects(projects, containerElement, headingLevel = "h2") {
    if (!containerElement || !Array.isArray(projects)) {
      console.warn("No container or invalid projects array");
      return;
    }
  
    containerElement.innerHTML = '';
  
    if (projects.length === 0) {
      containerElement.innerHTML = "<p>No projects available. Stay tuned!</p>";
      return;
    }
  
    for (const project of projects) {
      const article = document.createElement("article");
      const headingTag = document.createElement(headingLevel);
      headingTag.textContent = project.title || "Untitled Project";
  
      // Safe image rendering
      const imgHTML = project.image
        ? `<img src="${project.image}" alt="${project.title || "Project image"}">`
        : "";
  
      article.innerHTML = `
        ${headingTag.outerHTML}
        ${imgHTML}
        <p>${project.description || ''}</p>
        <p class="project-year">${project.year ? `c. ${project.year}` : ''}</p>
      `;
  
      containerElement.appendChild(article);
    }
  }
  
// FETCH GitHub Data from GitHub API
export async function fetchGitHubData(username) {
  try {
    const response = await fetch(`https://api.github.com/users/${username}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch GitHub data: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching GitHub data:", error);
    return null;
  }
}
  