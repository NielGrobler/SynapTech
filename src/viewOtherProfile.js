import pageAdder from './pageAdder.js';
let projects = [];

let suspend;

const noneIfAbsent = (s) => {
	return !s ? 'None' : s;
}

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
	const res = await fetch(`/api/user/info/${encodeURIComponent(userId)}`);
	const user = await res.json();
	console.log(user);
	if (!user) {
		document.getElementById('userName').innerText = "Could not display user.";
		return;
	}

	document.getElementById('userName').innerText = user.name;
	document.getElementById('userUni').innerHTML = noneIfAbsent(user.university);
	document.getElementById('userDepartment').innerHTML = noneIfAbsent(user.department);
	document.getElementById('userBio').innerHTML = noneIfAbsent(user.bio);
};

document.addEventListener("DOMContentLoaded", () => {
	populateElements();
});

(async () => {
	const params = new URLSearchParams(window.location.search);
	const userId = params.get('id');
	if (!userId) return;

	try {
		const res = await fetch(`/api/projects/by/user/${userId}`);
		if (!res.ok) {
			throw new Error(`Failed to fetch projects: ${res.statusText}`);
		}
		projects = await res.json();
		pageAdder.addProjectsToPage('projectCardList', projects);
	} catch (err) {
		console.error('Error', err);
	}
})();
