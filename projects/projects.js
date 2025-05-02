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
  
  import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

  // STEP 1.1: Create an SVG element (should already be in index.html with id="projects-pie-plot")
  
  // STEP 1.3–1.5: Pie chart logic
  let data = [1, 2, 3, 4, 5, 5]; // Step 1.5
  
  let svg = d3.select("#projects-pie-plot");
  
  // Define arc generator
  let arcGenerator = d3.arc()
    .innerRadius(0)
    .outerRadius(50);
  
  // Use d3.pie() to compute angles
  let sliceGenerator = d3.pie();
  let arcData = sliceGenerator(data);
  
  // Use a color scale
  let colors = d3.scaleOrdinal(d3.schemeTableau10);
  
  // Draw each arc
  arcData.forEach((d, i) => {
    svg.append("path")
      .attr("d", arcGenerator(d))
      .attr("fill", colors(i));
  });
  