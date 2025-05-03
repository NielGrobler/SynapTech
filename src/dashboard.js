
import pageAdder from './pageAdder.js';
import stringSearch from './stringSearch.js'

let projects = [];

let searchBox = document.getElementById('searchBox');

document.getElementById('searchForm').addEventListener('submit', (event) => {
	event.preventDefault();

	const query = searchBox.value.toLowerCase();
	const matchingProjects = projects.sort(stringSearch.getComparator(query));
	console.log(matchingProjects);
	pageAdder.clearProjects('projectCardList');
	pageAdder.addProjectsToPage('projectCardList', matchingProjects);
});

(async () => {
	try {
		const res = await fetch('/api/user/project');
		projects = await res.json();
		pageAdder.addProjectsToPage('projectCardList', projects);
		console.log(projects);
	} catch (err) {
		console.error('Error loading user:', err);
	}
})();
