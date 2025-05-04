// projects.js
import { fetchJSON, renderProjects, fetchGitHubData } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const allProjects = await fetchJSON('../lib/projects.json');
const container = document.querySelector('.projects');
const svg = d3.select('#projects-pie-plot');
const legend = d3.select('.legend');
const searchInput = document.querySelector('.searchBar');

let selectedIndex = -1;
let currentProjects = [...allProjects];

function renderPie(projects) {
  const rolled = d3.rollups(projects, v => v.length, d => d.year);
  const data = rolled.map(([year, count]) => ({ label: year, value: count }));

  const arcGen = d3.arc().innerRadius(0).outerRadius(50);
  const pieGen = d3.pie().value(d => d.value);
  const arcs = pieGen(data);
  const colors = d3.scaleOrdinal(d3.schemeTableau10);

  svg.selectAll('path').remove();
  legend.selectAll('li').remove();

  arcs.forEach((d, i) => {
    svg.append('path')
      .attr('d', arcGen(d))
      .attr('fill', colors(i))
      .attr('data-year', data[i].label)
      .attr('class', getSliceClass(i))
      .on('click', () => handleClick(i, data));
  });

  data.forEach((d, i) => {
    legend.append('li')
      .attr('class', getLegendClass(i))
      .attr('style', `--color:${colors(i)}`)
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
      .on('click', () => handleClick(i, data));
  });
}

// Helper: return class for pie slice
function getSliceClass(i) {
  if (selectedIndex === -1) return '';
  return i === selectedIndex ? 'selected' : 'dimmed';
}

// Helper: return class for legend item
function getLegendClass(i) {
  if (selectedIndex === -1) return 'legend-item';
  return 'legend-item' + (i === selectedIndex ? ' selected' : ' dimmed');
}

// Handles slice or legend click
function handleClick(i, data) {
  selectedIndex = selectedIndex === i ? -1 : i;

  svg.selectAll('path')
    .attr('class', (_, idx) => getSliceClass(idx));

  legend.selectAll('li')
    .attr('class', (_, idx) => getLegendClass(idx));

  const year = data[i]?.label;
  const visible = selectedIndex === -1
    ? currentProjects
    : currentProjects.filter(p => p.year === year);

  renderProjects(visible, container, 'h2');

  // Dim non-selected project cards
  document.querySelectorAll('.project-card').forEach(card => {
    const cardYear = card.getAttribute('data-year');
    card.classList.toggle('dimmed', selectedIndex !== -1 && cardYear !== String(year));
  });
}

// Initial render
renderProjects(currentProjects, container, 'h2');
renderPie(currentProjects);

// Search input
searchInput.addEventListener('input', (e) => {
  selectedIndex = -1;
  const q = e.target.value.toLowerCase();
  currentProjects = allProjects.filter(project => {
    const values = Object.values(project).join('\n').toLowerCase();
    return values.includes(q);
  });
  renderProjects(currentProjects, container, 'h2');
  renderPie(currentProjects);
});

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
