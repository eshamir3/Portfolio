import { fetchJSON, renderProjects, fetchGitHubData } from './global.js';

// Fetch and display latest projects
const allProjects = await fetchJSON('./lib/projects.json');
const latestProjects = allProjects.slice(0, 3);

const projectsContainer = document.querySelector('.projects');
renderProjects(latestProjects, projectsContainer, 'h2');

// Fetch and display GitHub data
const githubData = await fetchGitHubData('eshamir3'); // ✅ Replace with your GitHub username

const profileStats = document.querySelector('#profile-stats');
if (profileStats) {
  profileStats.innerHTML = `
    <dl>
      <dt>Public Repos:</dt><dd>${githubData.public_repos}</dd>
      <dt>Public Gists:</dt><dd>${githubData.public_gists}</dd>
      <dt>Followers:</dt><dd>${githubData.followers}</dd>
      <dt>Following:</dt><dd>${githubData.following}</dd>
    </dl>
  `;
}
