import { fetchJSON, renderProjects, fetchGitHubData } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// DOM hooks
const projectsContainer = document.querySelector('.projects');
const pieSvg            = d3.select('#projects-pie-plot');
const legendEl          = d3.select('.legend');
const searchInput       = document.querySelector('.searchBar');

// State
let allProjects    = await fetchJSON('../lib/projects.json') || [];
let selectedIndex  = -1;

// Initial render of cards + pie
renderProjects(allProjects, projectsContainer, 'h2');
renderPie(allProjects);

// Search → reset pie selection + re-render
searchInput.addEventListener('input', (e) => {
  selectedIndex = -1;
  const q = e.target.value.trim().toLowerCase();
  const filtered = allProjects.filter(p =>
    Object.values(p).join(' ').toLowerCase().includes(q)
  );
  renderProjects(filtered, projectsContainer, 'h2');
  renderPie(filtered);
});


// ——— Pie + Legend rendering ———
function renderPie(dataProjects) {
  // 1) group by year
  const rolled = d3.rollups(
    dataProjects,
    v => v.length,
    d => d.year
  );
  const data = rolled.map(([label, value]) => ({ label, value }));

  // 2) arc + pie generators
  const arcGen = d3.arc().innerRadius(0).outerRadius(50);
  const pieGen = d3.pie().value(d => d.value);
  const arcs   = pieGen(data);
  const colors = d3.scaleOrdinal(d3.schemeTableau10);

  // 3) clear old draws
  pieSvg.selectAll('path').remove();
  legendEl.selectAll('li').remove();

  // 4) draw slices
  pieSvg.selectAll('path')
    .data(arcs)
    .join('path')
      .attr('d', arcGen)
      .attr('fill', (_, i) => colors(i))
      .classed('selected', d => d.index === selectedIndex)
      .on('click', (event, d) => {
        // toggle
        selectedIndex = (selectedIndex === d.index ? -1 : d.index);
        applyFilter(data);
      });

  // 5) draw legend
  legendEl.selectAll('li')
    .data(data)
    .join('li')
      .attr('class', 'legend-item')
      .classed('selected', (_, i) => i === selectedIndex)
      .attr('style', (_, i) => `--color:${colors(i)}`)
      .html(d => `<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
      .on('click', (event, d, i) => {
        selectedIndex = (selectedIndex === i ? -1 : i);
        applyFilter(data);
      });
}

// ——— applyFilter reads selectedIndex & re-renders cards + pie ———
function applyFilter(pieData) {
  let visible;
  if (selectedIndex === -1) {
    visible = allProjects;
  } else {
    const year = pieData[selectedIndex].label;
    visible = allProjects.filter(p => p.year === year);
  }
  renderProjects(visible, projectsContainer, 'h2');
  renderPie(visible);
}
