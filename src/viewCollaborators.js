
import pageAdder from './pageAdder.js'
import { failToast, successToast } from './toast.js';

const generateCollaboratorRequestHTML = (collaborator) => {
	const container = document.createElement('li'); container.classList.add('highlight-hover'); const nameParagraph = document.createElement('p'); nameParagraph.innerHTML = `<strong>${collaborator.account_name}</strong> is requesting to collaborate on the <strong>${collaborator.project_name}</strong>`; container.appendChild(nameParagraph); const visibilityParagraph = document.createElement('p'); visibilityParagraph.innerText = `Project is ${collaborator.project_is_public ? 'public' : 'private'}.`; container.appendChild(visibilityParagraph); const roleParagraph = document.createElement('p'); roleParagraph.innerText = `Role: ${collaborator.role}`; container.appendChild(roleParagraph); let buttonSection = document.createElement('section'); buttonSection.classList.add('flex-row', 'gap', 'highlight-hover', 'width-25', 'split'); const acceptButton = document.createElement('button'); acceptButton.classList.add('flex-row', 'center-content-v', 'gap-small'); acceptButton.innerHTML = `<i class='bx bx-check' ></i>Accept`;
	acceptButton.onclick = async () => {
		await handleAccept(collaborator);
	}; const rejectButton = document.createElement('button'); rejectButton.classList.add('flex-row', 'center-content-v', 'gap-small'); rejectButton.innerHTML = `<i class='bx bx-x'></i>Reject`; rejectButton.onclick = async () => { await handleReject(collaborator); }; buttonSection.appendChild(acceptButton); buttonSection.appendChild(rejectButton); container.appendChild(buttonSection); return container;
}
const handleAccept = async (collaborator) => {
	try {
		const response = await fetch('/api/accept/collaborator', {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ "userId": collaborator.account_id, "projectId": collaborator.project_id })
		});

		if (response.ok) {
			await fetchCollaborators();
		} else {
			const error = await response.text();
			failToast(`Error: ${error}`);
		}
	} catch (error) {
		console.error('Error sending request:', error);
		failToast('Failed to send collaboration request.');
	}
}

const handleReject = async (collaborator) => {
	try {
		const response = await fetch('/api/reject/collaborator', {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ "userId": collaborator.account_id, "projectId": collaborator.project_id })
		});
		if (response.ok) {
			await fetchCollaborators();
		} else {
			const error = await response.text();
			failToast(`Error: ${error}`);
		}
	} catch (error) {
		console.error('Error sending request:', error);
		failToast('Failed to send collaboration request.');
	}
}
const fetchCollaborators = async () => {
	console.log("reijqoijw");
	try {
		const res = await fetch('/api/collaborator');
		if (!res.ok) {
			throw new Error(await res.json());
		}
		let collaboratorData = await res.json();
		console.log(collaboratorData);
		document.getElementById('collaboratorRequests').innerHTML = '';
		pageAdder.assignListToElement('collaboratorRequests', collaboratorData, generateCollaboratorRequestHTML);
	} catch (error) {
		failToast('Failed to fetch collaborators.');
	}
}

if (
	typeof process === 'undefined' ||
		typeof vi === 'undefined' ||
		process?.env?.VITEST !== 'true'
) {
	(async () => {
		await fetchCollaborators();
	})();
}

export default { fetchCollaborators, handleAccept, handleReject, generateCollaboratorRequestHTML }
