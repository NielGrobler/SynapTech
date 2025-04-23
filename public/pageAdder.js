const addProjectToPage = (elementId, project) => {
	let projectCardList = document.getElementById(elementId);
	const li = document.createElement("li");
	const title = document.createElement("strong");
	title.textContent = project.name;
	const description = document.createElement("p");
	description.textContent = project.description;


	li.appendChild(title);
	li.appendChild(description);
	li.classList.add("highlight-hover");
	li.addEventListener('click', () => {
		window.location.href = `/view/project?id=${project.id}`;
	});

	projectCardList.appendChild(li);
}

const addProjectsToPage = (elementId, projects) => {
	if (projects.length === 0) {
		document.getElementById(elementId).innerHTML = "<p>No projects to display.</p>";
		return;
	}

	for (let project of projects) {
		addProjectToPage(elementId, project);
	}
}

export default {
	addProjectsToPage
};

