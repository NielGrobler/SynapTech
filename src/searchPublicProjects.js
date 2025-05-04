import pageAdder from './pageAdder.js'

export async function fetchProjects(projectName) {
	try {
		const response = await fetch(`/api/search/project?projectName=${projectName}`);
		if (!response.ok) {
			throw new Error('Encountered network error.');
		}

		const projects = await response.json();
		pageAdder.clearProjects('projects');
		pageAdder.addProjectsToPage('projects', projects);
	} catch (error) {
		console.error("Error fetching projects:", error);
	}
}

export function setupSearchForm() {
	const form = document.getElementById("searchForm");
	form.addEventListener("submit", async (e) => {
		e.preventDefault();
		const input = document.getElementById("searchInput").value;
		await fetchProjects(input);
	});
}

