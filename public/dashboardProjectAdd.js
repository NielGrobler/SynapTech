
import pageAdder from './pageAdder.js';

(async () => {
	try {
		const res = await fetch('/api/user/project');
		const projects = await res.json();
		pageAdder.addProjectsToPage('projectCardList', projects)
		console.log(projects);
	} catch (err) {
		console.error('Error loading user:', err);
	}
})();
