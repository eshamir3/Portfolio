import { fetchJSON, renderProjects, fetchGitHubData } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const allProjects     = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
const statsContainer    = document.querySelector('.github-stats');

// Optional: GitHub stats
if (statsContainer) {
  const gh = await fetchGitHubData('eshamir3');
  statsContainer.innerHTML = gh
    ? `⭐ Public Repos: ${gh.public_repos} |
       👥 Followers: ${gh.followers} |
       📦 Gists: ${gh.public_gists}`
    : '';
}

// grab our controls
const svg         = d3.select('#projects-pie-plot');
const legend      = d3.select('.legend');
const searchInput = document.querySelector('.searchBar');

let selectedIndex = -1;
let currentData   = allProjects;

// helper to render both the grid and the pie
function updateAllDisplay() {
  // grid
  renderProjects(currentData, projectsContainer, 'h2');

  // roll up by year
  const rolled = d3.rollups(
    currentData,
    v => v.length,
    d => d.year
  ).sort((a,b) => b[0] - a[0]);

  const pieData = rolled.map(([year, count]) => ({
    label: year,
    value: count
  }));

  // build pie
  const pieGen   = d3.pie().value(d => d.value);
  const arcs     = pieGen(pieData);
  const arcGen   = d3.arc().innerRadius(0).outerRadius(50);
  const colors   = d3.scaleOrdinal(d3.schemeTableau10);

  svg.selectAll('path').remove();
  legend.selectAll('li').remove();

  // draw slices
  arcs.forEach((d,i) => {
    svg.append('path')
      .attr('d', arcGen(d))
      .attr('fill', colors(i))
      .classed('selected', i === selectedIndex)
      .on('click', () => {
        selectedIndex = (selectedIndex === i ? -1 : i);
        applyFilter(pieData);
      });
  });

  // draw legend
  pieData.forEach((d,i) => {
    legend.append('li')
      .attr('class','legend-item')
      .classed('selected', i === selectedIndex)
      .style('--color', colors(i))
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
      .on('click', () => {
        selectedIndex = (selectedIndex === i ? -1 : i);
        applyFilter(pieData);
      });
  });
}

// apply the year‐based filter when a slice is clicked
function applyFilter(pieData) {
  if (selectedIndex === -1) {
    currentData = allProjects;
  } else {
    const year = pieData[selectedIndex].label;
    currentData = allProjects.filter(p => p.year === year);
  }
  updateAllDisplay();
}

// live search
searchInput.addEventListener('input', e => {
  const q = e.target.value.trim().toLowerCase();
  selectedIndex = -1; // clear any slice selection
  currentData = allProjects.filter(p =>
    Object.values(p).join(' ').toLowerCase().includes(q)
  );
  updateAllDisplay();
});

// initial paint
updateAllDisplay();
