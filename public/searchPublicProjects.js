
import pageAdder from "./pageAdder.js";

const fetchProjects = async (name) => {
	try {
		const res = await fetch(`/api/search/project?projectName=${encodeURIComponent(name)}`);
		if (!res.ok) {
			throw new Error('Failed to fetch projects');
		}

		const projects = await res.json();
		console.log(projects);
		document.getElementById("projects").innerHTML = "";
		pageAdder.addProjectsToPage('projects', projects);
	} catch (error) {
		console.error('Error fetching projects:', error);
	}
}

document.getElementById("searchForm").addEventListener("submit", async function(event) {
	event.preventDefault();

	const query = document.getElementById("searchInput").value;
	console.log("HELLO WORLD");
	fetchProjects(query);
});

export default {
	fetchProjects
}
