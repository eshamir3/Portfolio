import { fetchJSON, renderProjects, fetchGitHubData } from '../global.js';

// Fetch and render all projects
const allProjects = await fetchJSON('../lib/projects.json');
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

const svg = d3.select('#projects-pie-plot');
const legend = d3.select('.legend');
const searchInput = document.querySelector('.searchBar');

function renderPieChart(projects) {
  // group projects by year and count
  const rolledData = d3.rollups(projects, v => v.length, d => d.year);
  const data = rolledData.map(([year, count]) => ({ label: year, value: count }));
  const arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
  const pieGenerator = d3.pie().value(d => d.value);
  const arcs = pieGenerator(data);
  const colors = d3.scaleOrdinal(d3.schemeTableau10);

  // clear previous chart and legend
  svg.selectAll('path').remove();
  legend.selectAll('li').remove();

  // draw pie slices
  arcs.forEach((d, i) => {
    svg.append('path')
      .attr('d', arcGenerator(d))
      .attr('fill', colors(i));
  });

  // draw legend items
  data.forEach((d, i) => {
    legend.append('li')
      .attr('class', 'legend-item')
      .attr('style', `--color:${colors(i)}`)
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
  });
}

// initial render
renderPieChart(allProjects);

// reactive filtering and re-rendering
searchInput.addEventListener('input', event => {
  const q = event.target.value.toLowerCase();
  const filtered = allProjects.filter(project => {
    const vals = Object.values(project).join('\n').toLowerCase();
    return vals.includes(q);
  });
  renderProjects(filtered, container, 'h2');
  renderPieChart(filtered);
});

console.log("Fetched projects:", allProjects);
