import pageAdder from './pageAdder.js';
import stringSearch from './stringSearch.js';

let cachedProjects = [];

export async function executeApiCall() {
  try {
    const response = await fetch('/api/projects');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error loading user:', error);
    return [];
  }
}

export function initDashboard() {
  const form = document.getElementById('project-search-form');
  const input = document.getElementById('project-search-input');

  if (!form || !input) {
    console.error('Required DOM elements not found');
    return;
  }

  executeApiCall().then(projects => {
    cachedProjects = projects;
    pageAdder.addProjectsToPage(projects);
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    const query = input.value;
    const comparator = stringSearch.getComparator(query);
    const filteredProjects = cachedProjects.filter(comparator);
    pageAdder.clearProjects();
    pageAdder.addProjectsToPage(filteredProjects);
  });
}
