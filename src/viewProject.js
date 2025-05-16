
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

const createUserList = () => {
	let result = document.createElement('ul');
	result.id = 'users';
	return result;
}

const createInviteForm = () => {
	let form = document.createElement('form');
	form.id = "user-search-form";
	let input = document.createElement('input');
	input.id = 'user-search-input';
	input.placeholder = 'Search for users...';
	let button = document.createElement('button');
	button.classList.add('nav-item', 'flex-row', 'gap-small', 'center-content-v');
	let icon = document.createElement('i');
	icon.classList.add('bx', 'bx-search');
	button.innerText = 'Submit';
	button.appendChild(icon);

	form.appendChild(input);
	form.appendChild(button);

	form.addEventListener('submit', async (e) => {
		e.preventDefault();

		try {
			const res = await fetch(`/api/search/user?userName=${encodeURIComponent(name)}`);

			if (!res.ok) {
				throw new Error('Failed to fetch users.');
			}

			const users = await res.json();
			document.getElementById("users").innerHTML = "";
			pageAdder.assignListToElement(`users`, users, (rawUser) => {
				const li = document.createElement('li');
				const title = document.createElement('strong');
				title = document.createElement('strong');
				title.textContent = user.name;
				const description = document.createElement("p");
				description.textContent = user.bio;
				const id = user.account_id;

				li.appendChild(title);
				li.appendChild(description);
				li.classList.add('highlight-hover');
				li.addEventListener('click', () => {
					// add fetching here


				});
			});
		} catch (error) {
			console.error(`Error fetching users: ${error}`);
		}
		alert("Hello world!");
	});

	return form;
}

const addCollaboratorButton = async (userDetails, project) => {
	if (project.created_by_account_id !== userDetails.id) {
		return false;
	}

	let collaboratorSection = document.getElementById("collaborators");
	let button = document.createElement("button");
	button.innerText = "Add Collaborator";
	// add stuff here
	collaboratorSection.appendChild(button);

	button.addEventListener('click', (e) => {
		console.log("Hello world!");
		collaboratorSection.appendChild(createInviteForm());
		collaboratorSection.appendChild(createUserList());
	});

	return true;
}


const addFundingButton = async (userDetails, project) => {
	// Check ownership
	if (!project || project.created_by_account_id !== userDetails.id) {
		console.log("Not owner or project not loaded");
		return false;
	}

	const fundingSection = document.getElementById("funding");
	if (!fundingSection) {
		console.error("No #funding section in the DOM");
		return false;
	}

	// Prevent multiple buttons
	if (document.getElementById("addFundingBtn")) return;

	// Create button
	const button = document.createElement("button");
	button.innerText = "Add Funding";
	button.id = "addFundingBtn";
	button.type = "button"; // don't submit any form accidentally
	button.classList.add("btn", "btn-primary");

	button.addEventListener('click', () => {
		// Don't duplicate form
		if (!document.getElementById("fundingForm")) {

			console.log("Adding funding form for project:", project);

			console.log("Project object:", project);
			console.log("project.id:", project.id);
			console.log("project.project_id:", project.project_id);



			fundingSection.appendChild(createFundingForm(project.id));
			//fundingSection.appendChild(form);
		}
	});

	fundingSection.appendChild(button);
	return true;
}



function createFundingForm(projectId) {
	console.log("Recieved projectId:", projectId);
	const form = document.createElement("form");
	form.id = "fundingForm";
	form.innerHTML = `
		<label for="fundingDate">Date:</label>
		<input type="date" name="funding_date" id="fundingDate" required><br>

		<label for="currency">Currency:</label>
		<input type="text" name="currency" id="currency" value="ZAR" required><br>

		<label for="fundingType">Funding Type:</label>
		<input type="text" name="funding_type" id="fundingType" required><br>

		<label for="totalFunding">Total Funding:</label>
		<input type="number" name="total_funding" id="totalFunding" step="0.01" required><br>

		<button type="submit">Submit Funding</button>
	`;

	form.addEventListener("submit", async (e) => {
		e.preventDefault();

		const data = {
			project_id: parseInt(projectId),
			funding_date: form.funding_date.value,
			currency: form.currency.value,
			funding_type: form.funding_type.value,
			total_funding: parseFloat(form.total_funding.value),
		};

		console.log("Sending funding data:", data);


		try {
			const response = await fetch('/add-funding', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(data)
			});

			const result = await response.json();
			if (response.ok) {
				alert("Funding added successfully!");
				location.reload(); // reload to show updated funding
			} else {
				alert("Error: " + result.message);
			}
		} catch (error) {
			console.error("Funding submission failed:", error);
			alert("Something went wrong.");
		}
	});

	return form;
}



const submitFunding = async (event) => {
  event.preventDefault();

  const total_funding = parseFloat(document.getElementById('fundingAmount').value);
  const funding_date = document.getElementById('fundingDate').value;
  const currency = document.getElementById('currency').value || 'ZAR';  // or default
  const funding_type = document.getElementById('fundingType').value || 'Unknown';  // or default

  if (!projectId) {
    alert("Project ID not found!");
    return;
  }

  const response = await fetch('/add-funding', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ project_id: projectId, funding_date, currency, funding_type, total_funding })
  });

  if (!response.ok) {
    console.error("Failed to submit funding:", await response.text());
    alert("Something went wrong while submitting funding.");
    return;
  }

  alert("Funding submitted successfully!");
  location.reload();  // optionally reload to reflect changes
};





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
	addRequestCollaboration(info, project);
	addFundingButton(info, project)
}

export async function initPage() {
	const collabList = document.getElementById('collaboratorList');

	if (!collabList) {
		console.error('collaboratorList element not found');
		return;
	}

	await populateElements();
}
