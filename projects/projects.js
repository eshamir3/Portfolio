import { fetchJSON, renderProjects, fetchGitHubData } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const allProjects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
const statsContainer = document.querySelector('.github-stats');
const svg = d3.select('#projects-pie-plot');
const legend = d3.select('.legend');
const searchInput = document.querySelector('.searchBar');

// Render GitHub Stats
const githubData = await fetchGitHubData('eshamir3');
if (githubData && statsContainer) {
  statsContainer.innerHTML = `
    ⭐ Public Repos: ${githubData.public_repos} |
    👥 Followers: ${githubData.followers} |
    📦 Gists: ${githubData.public_gists}
  `;
}

// PIE CHART RENDER FUNCTION
function renderPieChart(projects) {
  const rolled = d3.rollups(projects, v => v.length, d => d.year);
  const data = rolled.map(([year, count]) => ({ label: year, value: count }));
  const arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
  const pieGenerator = d3.pie().value(d => d.value);
  const arcs = pieGenerator(data);
  const colors = d3.scaleOrdinal(d3.schemeTableau10);

  svg.selectAll('path').remove();
  legend.selectAll('li').remove();

  arcs.forEach((arc, i) => {
    svg.append('path')
      .attr('d', arcGenerator(arc))
      .attr('fill', colors(i));
  });

  data.forEach((d, i) => {
    legend.append('li')
      .attr('class', 'legend-item')
      .attr('style', `--color:${colors(i)}`)
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
  });
}

// INITIAL RENDER
renderProjects(allProjects, projectsContainer, 'h2');
renderPieChart(allProjects);

// SEARCH + REACTIVE PIE
searchInput.addEventListener('input', (event) => {
  const query = event.target.value.toLowerCase();
  const filtered = allProjects.filter(project => {
    const values = Object.values(project).join('\n').toLowerCase();
    return values.includes(query);
  });

  renderProjects(filtered, projectsContainer, 'h2');
  renderPieChart(filtered);
});
