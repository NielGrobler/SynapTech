const fetchProject = async () => {
	const params = new URLSearchParams(window.location.search);
	const projectId = params.get('id');
	if (!projectId) {
		return null;
	}

	const res = await fetch(`/api/project?id=${projectId}`);
	const project = res.json();
	return project;
}

const populateCollaborators = (project) => {
	let list = document.getElementById('collaboratorList');

	if (project.collaborators.length === 0) {
		let paragraphMessage = document.createElement("p");
		paragraphMessage.innerText = "No collaborators.";
		list.appendChild(paragraphMessage);
		return;

	}

	for (let collaborator of project.collaborators) {
		const li = document.createElement("li");
		li.innerText = collaborator.name;
		list.appendChild(li);
	}
}

const populateElements = async () => {
	const project = await fetchProject();
	if (!project) {
		document.getElementById('projectName').innerText = "Could not display project.";
		return;
	}

	document.getElementById('projectName').innerHTML = project.name;
	document.getElementById('projectIsPublic').innerHTML = project.is_public ? 'Public' : 'Private';
	document.getElementById('projectCreatedBy').innerHTML = project.author_name;
	document.getElementById('projectDescription').innerHTML = project.description;

	populateCollaborators(project);

	console.log(project);
}


(async () => {
	populateElements();
})();




