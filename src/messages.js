import { io } from 'socket.io-client';

let selectedRoomId;
let hasJoinedRoom = false;
export const socket = io({ auth: { token: localStorage.getItem('jwt') } });
//io function is being called from what? added import; this might break in prod doe.

const uploadBtn = document.getElementById("uploadBtn");
const trueUploadBtn = document.getElementById("file");

uploadBtn.addEventListener("click", () => {
	trueUploadBtn.click();
});

trueUploadBtn.addEventListener("change", () => {
	const txt = document.getElementById("attachment-name");
	const file = trueUploadBtn.files[0];
	if (file) {
		txt.innerHTML = `Selected file '${file.name}' for upload`;
	} else {
		txt.innerHTML = "No file chosen";
	}
});

function scrollToBottomIfNeeded() {
	const messages = document.getElementById('messages');
	const delta = 100;

	requestAnimationFrame(() => {
		const isAtBottom =
			messages.scrollTop + messages.clientHeight >= messages.scrollHeight - delta;

		if (isAtBottom) {
			messages.scrollTop = messages.scrollHeight;
		}
	});
}

async function fetchProjects() {
	try {
		const response = await fetch('/api/user/projectNames', {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
			},
		});

		if (!response.ok) {
			throw new Error(`Error: ${response.status} - ${response.statusText}`);
		}

		const data = await response.json();

		const projectsList = document.getElementById('projects');
		projectsList.innerHTML = '';

		if (data.length === 0) {
			projectsList.innerHTML = 'Nothing to display.';
			document.getElementById('messages').innerHTML = 'Create a new project to start chatting.';
			document.getElementById('inputs').style.display = 'none';
			return [];
		}

		data.forEach(project => {
			const li = document.createElement('li');
			li.textContent = project.name;
			li.dataset.projectId = project.id;
			li.classList.add('highlight-hover');
			li.addEventListener('click', () => {
				selectedRoomId = li.dataset.projectId;
				socket.emit('join-room', { roomId: li.dataset.projectId });
			});
			projectsList.appendChild(li);
		});

		return data;
	} catch (error) {
		console.error('Failed to fetch projects:', error);
		alert('There was an error fetching your projects. Please try again later.');
		return [];
	}
}

function addMessageToDOM(msg) {
	const li = document.createElement('li');
	const name = document.createElement('strong');
	const messageBody = document.createElement('p');

	name.innerHTML = `${msg.user}`;
	messageBody.innerHTML = `${msg.text || '(no text)'}`;

	li.appendChild(name);
	li.appendChild(messageBody);

	if (msg.uuid && msg.name) {
		const link = document.createElement('a');
		if (!msg.text) messageBody.innerHTML = '';
		link.href = '#';
		link.textContent = `${msg.name}`;
		link.onclick = async (e) => {
			e.preventDefault();
			const ext = msg.name.split('.').pop();
			socket.emit('download-request', {
				attachmentUuid: msg.uuid,
				ext: ext,
			});
		};
		li.appendChild(link);
	}

	li.classList.add('small-line-height');
	document.getElementById('messages').appendChild(li);
	scrollToBottomIfNeeded();
}

document.addEventListener('DOMContentLoaded', async () => {
	const projects = await fetchProjects();
	if (!projects.length) return;
	selectedRoomId = projects[0].id;

	if (messages) messages.scrollTop = messages.scrollHeight;

	socket.emit('join-room', { roomId: selectedRoomId });
});

socket.on('connect', () => {
	console.log('Connected to server');
});

socket.on('joined-room', ({ roomId, latestMessages }) => {
	console.log(`Joined room: ${roomId}`);
	hasJoinedRoom = true;

	const messagesContainer = document.getElementById('messages');
	messagesContainer.innerHTML = '';
	latestMessages.forEach(addMessageToDOM);
});

socket.on('message', addMessageToDOM);

socket.on('error', (err) => {
	const msg = typeof err === 'string' ? err : err.message;
	console.error('Server error:', msg);
	alert(msg);
});

socket.on('download-response', (file) => {
	const blob = new Blob([new Uint8Array(file.buffer)], { type: file.contentType });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = file.filename || 'downloaded-file';
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
});

document.getElementById('sendBtn').onclick = async () => {
	if (!hasJoinedRoom) {
		alert('A room must be joined before chatting.');
		return;
	}

	const text = document.getElementById('text').value;
	const fileInput = document.getElementById('file');
	const file = fileInput.files[0];

	if (!file) {
		socket.emit('message', { roomId: selectedRoomId, content: text });
	} else {
		const arrayBuffer = await file.arrayBuffer();

		socket.emit('message-with-attachment', {
			roomId: selectedRoomId,
			text,
			attachment: {
				name: file.name,
				type: file.type,
				buffer: Array.from(new Uint8Array(arrayBuffer)),
			},
		});
	}

	document.getElementById('attachment-name').innerHTML = "No file chosen";
	document.getElementById('text').value = '';
	fileInput.value = '';
};

export {
	scrollToBottomIfNeeded,
	fetchProjects,
	addMessageToDOM
}

export default{
	scrollToBottomIfNeeded,
	fetchProjects,
	addMessageToDOM
}
