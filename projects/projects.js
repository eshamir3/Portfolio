import { fetchJSON, renderProjects, fetchGitHubData } from '../global.js';

// Fetch and render all projects
const allProjects = await fetchJSON('./lib/projects.json');
const container = document.querySelector('.projects');
renderProjects(allProjects, container, 'h2');

// GitHub stats
const statsContainer = document.querySelector('.github-stats');
const githubData = await fetchGitHubData('eshamir3');

if (githubData && statsContainer) {
  statsContainer.innerHTML = `
    ⭐ Public Repos: ${githubData.public_repos} |
    👥 Followers: ${githubData.followers} |
    📦 Gists: ${githubData.public_gists}
  `;
}

// Pie chart (optional static or dynamic)
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const data = [1, 2, 3, 4, 5, 5];
const svg = d3.select('#projects-pie-plot');

const arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
const sliceGenerator = d3.pie().value(d => d);
const arcData = sliceGenerator(data);
const colors = d3.scaleOrdinal(d3.schemeTableau10);

arcData.forEach((d, i) => {
  svg.append('path')
    .attr('d', arcGenerator(d))
    .attr('fill', colors(i));
});

console.log("Fetched projects:", allProjects);
