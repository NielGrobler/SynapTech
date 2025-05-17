
import pageAdder from './pageAdder.js';

const sendReply = (isAccept, projectId, role) => {
	fetch('/api/review', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: {"projectId": projectId, "role": role, "isAccept": isAccept }
	})
		.then(res => {
			if (!res.ok) {
				throw new Error(`Request failed with status: ${res.status}`);
			}
			return res.json();
		})
		.catch(err => {
			console.error('Error:', err);
			alert('Failed to submit review. Please try again.');
		});
};

const generateCollaboratorRequestHTML = (invite) => {
	const container = document.createElement('li'); 
	container.classList.add('highlight-hover'); 
	const nameParagraph = document.createElement('p'); 
	nameParagraph.innerHTML = `<strong>${invite.account_name}</strong> has sent an invite for you to colloborate on <strong>${invite.project_name}</strong> as a <strong>${invite.role}</strong>.`;
	container.appendChild(nameParagraph); 
	let buttonSection = document.createElement('section'); 
	buttonSection.classList.add('flex-row', 'gap', 'highlight-hover', 'width-25', 'split'); 
	const acceptButton = document.createElement('button'); 
	acceptButton.classList.add('flex-row', 'center-content-v', 'gap-small'); 
	acceptButton.innerHTML = `<i class='bx bx-check' ></i>Accept`;
	acceptButton.onclick = async () => { 
		await sendReply(true, invite.project_id, invite.role);
	};
	const rejectButton = document.createElement('button'); 
	rejectButton.classList.add('flex-row', 'center-content-v', 'gap-small'); 
	rejectButton.innerHTML = `<i class='bx bx-x'></i>Reject`; 
	rejectButton.onclick = async () => { 
		await sendReply(false, invite.project_id, invite.role);
	};
	buttonSection.appendChild(acceptButton); 
	buttonSection.appendChild(rejectButton); 
	container.appendChild(buttonSection); 
	return container;
}
const fetchInvites = async () => { let res = await fetch('/api/collaboration/invites'); let invites = await res.json(); pageAdder.assignListToElement('inviteList', invites, generateInviteRequestHTML); }
(async () => {
	await fetchCollaborators();
})();
export default { fetchInvites, handleAccept, handleReject, generateInviteRequestHTML }
