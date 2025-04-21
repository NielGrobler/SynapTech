
function addProjectToPage(project) {
	let projectCardList = document.getElementById("projectCardList");
	const li = document.createElement("li");
	const title = document.createElement("strong");
	title.textContent = project.name;
	const description = document.createElement("p");
	description.textContent = project.description;


	li.appendChild(title);
	li.appendChild(description);
	li.classList.add("highlight-hover");
	li.addEventListener('click', () => {
		localStorage.setItem('projectData', JSON.stringify(project));
		window.location.href = '/view/project';
	});

	projectCardList.appendChild(li);
}

function addProjectsToPage(projects) {
	for (let project of projects) {
		addProjectToPage(project);
	}
}

/* Temporary project data. To test display on dashboard */

(async () => {
	try {
		const res = await fetch('/api/user/project');
		const projects = await res.json();
		addProjectsToPage(projects);
		console.log(projects);
	} catch (err) {
		console.error('Error loading user:', err);
	}
})();



//addProjectsToPage(projects);
