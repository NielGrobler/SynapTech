import pageAdder from './pageAdder.js';
let projects = [];

let suspend;

const checkAdmin = async () => {
	const res = await fetch('/admin');
	const admin = await res.json();

	if (admin) {
		suspend = document.createElement('button');
		const params = new URLSearchParams(window.location.search);
		const userId = params.get('id');
		const status = await fetch(`/isSuspended?id=${encodeURIComponent(userId)}`);
		const isSus = await status.json();
		console.log(isSus);

		if (isSus) {
			suspend.innerText = 'Unsuspend User';
		} else {
			suspend.innerText = 'Suspend User';
		}
		suspend.id = 'suspendButton';
		document.body.appendChild(suspend);

		suspend.addEventListener('click', async () => {
			const params = new URLSearchParams(window.location.search);
			const userId = params.get('id');
			await fetch('/suspend/user', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ id: userId })
			});

			const newStatus = await fetch(`/isSuspended?id=${encodeURIComponent(userId)}`);
			const newisSus = await newStatus.json();

			if (newisSus) {
				suspend.innerText = 'Unsuspend User';
			} else {
				suspend.innerText = 'Suspend User';
			}
		});

	}
};

const populateElements = async () => {
	await checkAdmin();

	const params = new URLSearchParams(window.location.search);
	const userId = params.get('id');
	if (!userId) {
		return null;
	}
	const res = await fetch(`/api/user?id=${encodeURIComponent(userId)}`);
	const user = await res.json();
	if (!user) {
		document.getElementById('userName').innerText = "Could not display user.";
		return;
	}

	document.getElementById('userName').innerText = user[0].name;
	document.getElementById('userUni').innerHTML = user[0].university;
	document.getElementById('userDepartment').innerHTML = user[0].department;
	document.getElementById('userBio').innerHTML = user[0].bio;
};

document.addEventListener("DOMContentLoaded", () => {
	populateElements();
});

(async () => {
	const params = new URLSearchParams(window.location.search);
	const userId = params.get('id');
	if (!userId) return;

	try {
		const res = await fetch(`/api/other/project?id=${encodeURIComponent(userId)}`);
		if (!res.ok) {
			throw new Error(`Failed to fetch projects: ${res.statusText}`);
		}
		projects = await res.json();
		pageAdder.addProjectsToPage('projectCardList', projects);
	} catch (err) {
		console.error('Error loading Projects:', err);
	}
})();
