import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const allProjects      = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
const svg               = d3.select('#projects-pie-plot');
const legend            = d3.select('.legend');
const searchInput       = document.querySelector('.searchBar');

let selectedIndex = -1;

// initial render
update(allProjects);

// filter as you type
searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim().toLowerCase();
  const filtered = allProjects.filter(p =>
    Object.values(p).join(' ').toLowerCase().includes(q)
  );
  selectedIndex = -1;  // reset any slice selection
  update(filtered);
});

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

  const data = rolled.map(([year,count]) => ({ label: year, value: count }));

  const pieGen = d3.pie().value(d => d.value);
  const arcs   = pieGen(data);
  const arcGen = d3.arc().innerRadius(0).outerRadius(50);
  const colors = d3.scaleOrdinal(d3.schemeTableau10)
                   .domain(data.map(d => d.label));

  // clear old
  svg.selectAll('path').remove();
  legend.selectAll('li').remove();

  // draw slices
  svg.selectAll('path')
    .data(arcs)
    .join('path')
      .attr('d', arcGen)
      .attr('fill', (_,i) => colors(i))
      .classed('selected', (_,i) => i === selectedIndex)
      .on('click', (_,d,i) => {
        selectedIndex = (selectedIndex === i ? -1 : i);
        const year = data[i].label;
        const filtered = selectedIndex < 0
          ? projects
          : projects.filter(p => p.year === year);
        update(filtered);
      });

  // draw legend
  legend.selectAll('li')
    .data(data)
    .join('li')
      .attr('class','legend-item')
      .attr('style', (_,i) => `--color:${colors(i)}`)
      .classed('selected', (_,i) => i === selectedIndex)
      .html(d => `<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
      .on('click', (_,d,i) => {
        selectedIndex = (selectedIndex === i ? -1 : i);
        const year = data[i].label;
        const filtered = selectedIndex < 0
          ? projects
          : projects.filter(p => p.year === year);
        update(filtered);
      });
}
