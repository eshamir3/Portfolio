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
  
