import pageAdder from './pageAdder.js';
import stringSearch from './stringSearch.js';

let cachedProjects = [];

export async function executeApiCall() {
	try {
		const response = await fetch('/api/user/project');
		const data = await response.json();
		//console.log(data);
		return data;
	} catch (error) {
		console.error('Error loading user:', error);
		alert('Failed to load projects. Please try again later.');
		return [];
	}
}

export function initThemeToggle() {
	const toggle = document.getElementById('theme-toggle');
	const root = document.documentElement;

	const saved = localStorage.getItem('theme');
	if (saved) {
		toggle.innerText = (saved === 'dark') ? `🌕Dark` : `☀️Light`;
		root.setAttribute('data-theme', saved);
	} else {
		const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false;
		root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
		toggle.innerText = prefersDark ? `🌕Dark` : `☀️Light`;
	}

	toggle.addEventListener('click', () => {
		const current = root.getAttribute('data-theme');
		const next = (current === 'light') ? 'dark' : 'light';
		toggle.innerText = (next === 'dark') ? `🌕Dark` : `☀️Light`;
		root.setAttribute('data-theme', next);
		localStorage.setItem('theme', next);
	});
}

export function storeJWT() {
	const token = new URLSearchParams(window.location.search).get('token');
	if (token) {
		localStorage.setItem('jwt', token);
	}
}

export function initDashboard() {
	const form = document.getElementById('project-search-form');
	const input = document.getElementById('project-search-input');

	storeJWT();
	initThemeToggle();

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
		//console.log(filteredProjects);
		pageAdder.clearProjects("project-list");
		pageAdder.addProjectsToPage("project-list", filteredProjects);
	});
}



