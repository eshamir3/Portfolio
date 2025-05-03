import { fetchJSON, renderProjects, fetchGitHubData } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// grab DOM elements
const container = document.querySelector('.projects');
const statsContainer = document.querySelector('.github-stats');
const svg = d3.select('#projects-pie-plot');
const legend = d3.select('.legend');
const searchInput = document.querySelector('.searchBar');

let allProjects = await fetchJSON('../lib/projects.json');
renderProjects(allProjects, container, 'h2');

// GitHub stats (unchanged)
if (statsContainer) {
  const gh = await fetchGitHubData('eshamir3');
  statsContainer.textContent = gh
    ? `⭐ ${gh.public_repos} | 👥 ${gh.followers} | 📦 ${gh.public_gists}`
    : '';
}

// state for which wedge is selected
let selectedIndex = -1;

function renderPie(projects) {
  // group by year
  const rolled = d3.rollups(projects, v => v.length, d => d.year);
  const data = rolled.map(([year, count]) => ({ label: year, value: count }));

  // generators
  const arcGen = d3.arc().innerRadius(0).outerRadius(50);
  const pieGen = d3.pie().value(d => d.value);
  const arcs = pieGen(data);
  const colors = d3.scaleOrdinal(d3.schemeTableau10);

  // clear old
  svg.selectAll('path').remove();
  legend.selectAll('li').remove();

  // draw slices
  svg.selectAll('path')
    .data(arcs)
    .join('path')
    .attr('d', arcGen)
    .attr('fill', (_, i) => colors(i))
    .classed('selected', (_, i) => i === selectedIndex)
    .on('click', (_, d, nodes) => {
      // get index
      const i = d3.select(nodes[i]).datum().index;
      // toggle
      selectedIndex = selectedIndex === i ? -1 : i;
      applyFilter();
    });

  // draw legend
  legend.selectAll('li')
    .data(data)
    .join('li')
    .attr('class', 'legend-item')
    .classed('selected', (_, i) => i === selectedIndex)
    .attr('style', (_, i) => `--color:${colors(i)}`)
    .html(d => `<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
    .on('click', (_, __, nodes) => {
      const i = nodes.indexOf(nodes.find(n => n === nodes[0])); // simpler: use bound index
      selectedIndex = selectedIndex === i ? -1 : i;
      applyFilter();
    });
}

function applyFilter() {
  // decide which projects to show
  let filtered;
  if (selectedIndex === -1) {
    filtered = allProjects;
  } else {
    const year = d3.rollups(allProjects, v => v.length, d => d.year)
      [selectedIndex][0];
    filtered = allProjects.filter(p => p.year === year);
  }
  // re-render everything
  renderProjects(filtered, container, 'h2');
  renderPie(filtered);
}

// wire up search to also update filter
searchInput.addEventListener('input', e => {
  const q = e.target.value.trim().toLowerCase();
  allProjects = allProjects.filter(p =>
    Object.values(p).some(v =>
      String(v).toLowerCase().includes(q)
    )
  );
  selectedIndex = -1;    // clear any pie selection
  applyFilter();
});

// initial draw
renderPie(allProjects);
