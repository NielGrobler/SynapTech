
import userInfo from './userInfo.js'

function populateCollaborators(project) {
	let list = document.getElementById('collaboratorList');
	list.innerHTML = '';

	if (!project.collaborators || project.collaborators.length === 0) {
		list.innerHTML = 'No collaborators.';
		return;
	}

	project.collaborators.forEach(collaborator => {
		const li = document.createElement('li');
		li.innerText = collaborator.name;
		list.appendChild(li);
	});
}

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

const isCollaborator = (userDetails, project) => {
	for (const collaborator of project.collaborators) {
		if (collaborator.account_id === userDetails.id) {
			return true;
		}
	}

	return userDetails.id === project.created_by_account_id;
}

const addRequestCollaboration = async (userDetails, project) => {
	if (isCollaborator(userDetails, project)) {
		return false;
	}

	let collaboratorSection = document.getElementById("collaborators");
	let button = document.createElement("button");
	button.innerText = "Request Collaboration";

	button.addEventListener('click', async () => {
		try {
			const response = await fetch('/api/collaboration/request', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ "projectId": project.id })
			});

			if (response.ok) {
				alert('Collaboration request sent successfully!');
			} else {
				const error = await response.text();
				alert(`Error: ${error}`);
			}
		} catch (error) {
			console.error('Error sending request:', error);
			alert('Failed to send collaboration request.');
		}
	});

	collaboratorSection.appendChild(button);

	return true;
}

const addCollaboratorButton = async (userDetails, project) => {
	if (project.created_by_account_id !== userDetails.id) {
		return false;
	}

	let collaboratorSection = document.getElementById("collaborators");
	let button = document.createElement("button");
	button.innerText = "Add Collaborator";
	collaboratorSection.appendChild(button);

	return true;
}

const populateElements = async () => {
	const project = await fetchProject();
	console.log(project);
	if (!project) {
		document.getElementById('projectName').innerText = "Could not display project.";
		return;
	}

	document.getElementById('projectName').innerHTML = project.name;
	document.getElementById('projectIsPublic').innerHTML = project.is_public ? 'Public' : 'Private';
	document.getElementById('projectCreatedBy').innerHTML = project.author_name;
	document.getElementById('projectDescription').innerHTML = project.description;

	const info = await userInfo.fetchFromApi();
	populateCollaborators(project);
	addCollaboratorButton(info, project);
	addRequestCollaboration(info, project)
}

export async function initPage() {
	const collabList = document.getElementById('collaboratorList');

	if (!collabList) {
		console.error('collaboratorList element not found');
		return;
	}

	await populateElements();
}
