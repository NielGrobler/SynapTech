
import pageAdder from './pageAdder.js';
import { successToast, failToast } from './toast.js';

const sendReply = (isAccept, projectId, role) => {
	fetch('/api/collaboration/invite/reply', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ projectId, role, isAccept })
	})
		.then(res => {
			if (!res.ok) {
				throw new Error(`Request failed with status: ${res.status}`);
			}

			successToast('Successfully responded to invite!');

			return res.json();
		})
		.catch(err => {
			console.error('Error:', err);
			failToast('Failed to accepting/rejecting invite. Please try again.');
		});


};

const genInviteReqHTML = (invite) => {
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
	acceptButton.addEventListener('click', async (e) => {
		e.preventDefault();
		container.remove();
		sendReply(true, invite.project_id, invite.role);
		await wait(100);
		await fetchInvites();
	});
	const rejectButton = document.createElement('button');
	rejectButton.classList.add('flex-row', 'center-content-v', 'gap-small');
	rejectButton.innerHTML = `<i class='bx bx-x'></i>Reject`;
	rejectButton.addEventListener('click', async (e) => {
		e.preventDefault();
		container.remove();
		sendReply(false, invite.project_id, invite.role);
		await wait(100);
		await fetchInvites();
	});
	buttonSection.appendChild(acceptButton);
	buttonSection.appendChild(rejectButton);
	container.appendChild(buttonSection);
	return container;
}

const fetchInvites = async () => {
	let res = await fetch('/api/collaboration/invites');
	let invites = await res.json();
	console.log(invites);
	pageAdder.assignListToElement('invite-list', invites, genInviteReqHTML);
}

export {
	fetchInvites,
	sendReply,
	genInviteReqHTML
}
