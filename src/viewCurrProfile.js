import pageAdder from './pageAdder.js'
import viewProfile from './viewProfile.js';

document.addEventListener("DOMContentLoaded", () => {
	viewProfile.populateElements();
});

let projects = [];

(async () => {
	try {
		const res = await fetch('/api/user/project');
		projects = await res.json();
		pageAdder.addProjectsToPage('projectCardList', projects);
	} catch (err) {
		console.error('Error loading Projects:', err);
	}
})();