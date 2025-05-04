import pageAdder from './pageAdder.js';
import stringSearch from './stringSearch.js';

let cachedProjects = [];

export async function executeApiCall() {
  try {
    const response = await fetch('/api/user/project');
    const data = await response.json();
    console.log(data);
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
    pageAdder.addProjectsToPage("project-list", projects);
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    const query = input.value;
    const comparator = stringSearch.getComparator(query);
    const queryLower = query.toLowerCase();
    const filteredProjects = cachedProjects.sort(comparator).filter(x => x.name.toLowerCase().includes(queryLower));
    console.log(filteredProjects);
    pageAdder.clearProjects("project-list");
    pageAdder.addProjectsToPage("project-list", filteredProjects);
  });
}
