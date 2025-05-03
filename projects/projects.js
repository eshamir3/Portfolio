import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const allProjects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
const svg = d3.select('#projects-pie-plot');
const legend = d3.select('.legend');
const searchInput = document.querySelector('.searchBar');

function init() {
  // initial render
  update(allProjects);

  // reactive search
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase();
    const filtered = allProjects.filter(project =>
      Object.values(project).join(' ').toLowerCase().includes(q)
    );
    update(filtered);
  });
}

// render both list and chart+legend
function update(projects) {
  renderProjects(projects, projectsContainer, 'h2');
  renderPieChart(projects);
}

function renderPieChart(projects) {
  // group by year & count
  const rolled = d3.rollups(
    projects,
    v => v.length,
    d => d.year
  ).sort((a,b) => b[0].localeCompare(a[0]));

  const data = rolled.map(([year, count]) => ({
    label: year,
    value: count
  }));

  // pie + arc generators
  const pieGen = d3.pie().value(d => d.value);
  const arcs = pieGen(data);
  const arcGen = d3.arc().innerRadius(0).outerRadius(50);

  // color scale
  const colors = d3.scaleOrdinal(d3.schemeTableau10)
    .domain(data.map(d => d.label));

  // clear previous
  svg.selectAll('path').remove();
  legend.selectAll('li').remove();

  // draw slices
  svg.selectAll('path')
    .data(arcs)
    .join('path')
    .attr('d', arcGen)
    .attr('fill', (_, i) => colors(i));

  // draw legend
  legend.selectAll('li')
    .data(data)
    .join('li')
    .attr('class', 'legend-item')
    .attr('style', (_,i) => `--color:${colors(i)}`)
    .html(d => `<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
}

// kick things off
init();
