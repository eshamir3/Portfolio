import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');

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

// ✅ Append projects to the DOM
projects.forEach(project => {
  const el = renderProject(project);
  projectsContainer.appendChild(el);
});


// 📊 D3 Pie Chart Setup
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let data = [1, 2, 3, 4, 5, 5]; // dummy data for now
let svg = d3.select("#projects-pie-plot");

let arcGenerator = d3.arc()
  .innerRadius(0)
  .outerRadius(50);

let sliceGenerator = d3.pie();
let arcData = sliceGenerator(data);
let colors = d3.scaleOrdinal(d3.schemeTableau10);

arcData.forEach((d, i) => {
  svg.append("path")
    .attr("d", arcGenerator(d))
    .attr("fill", colors(i));
});
