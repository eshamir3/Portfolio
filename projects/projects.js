import { fetchJSON, renderProjects, fetchGitHubData } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');

// RENDER PROJECTS
function renderProject(project) {
  const article = document.createElement("article");
  article.className = "project";

  article.innerHTML = `
    <h2>${project.title}</h2>
    <div class="project-text">
      <p>${project.description}</p>
      <p class="project-year">c. ${project.year}</p>
    </div>
  `;

  return article;
}

projects.forEach(project => {
  const el = renderProject(project);
  projectsContainer.appendChild(el);
});

// D3 PIE CHART
let data = [
  { value: 1, label: 'apples' },
  { value: 2, label: 'oranges' },
  { value: 3, label: 'mangos' },
  { value: 4, label: 'pears' },
  { value: 5, label: 'limes' },
  { value: 5, label: 'cherries' }
];

let svg = d3.select("#projects-pie-plot");
let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
let sliceGenerator = d3.pie().value(d => d.value);
let arcData = sliceGenerator(data);
let colors = d3.scaleOrdinal(d3.schemeTableau10);

arcData.forEach((d, i) => {
  svg.append("path")
    .attr("d", arcGenerator(d))
    .attr("fill", colors(i));
});

// GitHub Stats
const githubStatsEl = document.querySelector('.github-stats');
fetchGitHubData("eshamir3").then(data => {
  if (data) {
    githubStatsEl.innerHTML = `
      ⭐ Public Repos: ${data.public_repos} |
      👥 Followers: ${data.followers} |
      📦 Gists: ${data.public_gists}
    `;
  }
});
