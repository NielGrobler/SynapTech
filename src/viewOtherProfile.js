import pageAdder from './pageAdder.js';
import userInfo from './userInfo.js';

//would need major refactoring to use viewProfile.js's script instead of duplicate code

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
		//console.log(isSus);

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

	const username = document.getElementById("userName");
	const bio = document.getElementById("userBio");
	const university = document.getElementById("userUni");
	const department = document.getElementById("userDepartment");

	try {
		const params = new URLSearchParams(window.location.search);
		const userId = params.get('id');
		if (!userId) {
			return null;
		}
		
		const user = await userInfo.fetchOtherUserFromApi(userId);

		username.innerHTML = user.name ? user.name : "No name available";
		bio.innerHTML = user.bio ? user.bio : "No bio available";
		university.innerHTML = user.university ? user.university : "Unknown";
		department.innerHTML = user.department ? user.department : "Unknown";

	} catch (error) {
		console.error("User not authenticated:", error);
		username.innerHTML = "Could not display user.";
		bio.innerHTML = "No bio available";
		university.innerHTML = "Unknown";
		department.innerHTML = "Unknown";
	}

	
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
		console.error('Error', err);
	}
})();
