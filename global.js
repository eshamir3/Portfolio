console.log("IT’S ALIVE!");

// Base path for GitHub Pages vs local dev
const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "/"
  : "/Portfolio/"; // ✅ Matches your repo name exactly (capital "P")

// Define pages for navigation
let pages = [
  { url: "index.html", title: "Home" }, // ✅ FIXED: use "index.html" instead of ""
  { url: "projects/", title: "Projects" },
  { url: "resume/", title: "Resume" },
  { url: "contact/", title: "Contact" },
  { url: "https://github.com/eshamir3", title: "GitHub" } // ✅ Use your real GitHub URL
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

  // Highlight current page
  a.classList.toggle(
    "current",
    a.host === location.host && a.pathname === location.pathname
  );

  // Open external links in a new tab
  a.toggleAttribute("target", a.host !== location.host);

  nav.append(a);
}


// STEP 4: DARK MODE TOGGLE

// Add the switch dropdown to the page
document.body.insertAdjacentHTML(
    'afterbegin',
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
  
  // Get the dropdown element
  const select = document.querySelector(".color-scheme select");
  
  // Function to apply color scheme to root
  function setColorScheme(scheme) {
    document.documentElement.style.setProperty("color-scheme", scheme);
  }
  
  // Listen for user changes
  select.addEventListener("input", function (event) {
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
  