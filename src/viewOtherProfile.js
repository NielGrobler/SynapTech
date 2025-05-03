import pageAdder from './pageAdder.js'
let projects = [];

const populateElements = async () => {
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
}


document.addEventListener("DOMContentLoaded", () => {
	populateElements();
});

(async () => {
	const params = new URLSearchParams(window.location.search);
	const userId = params.get('id');
	if (!userId) {
		return null;
	}
	try {
		const res = await fetch(`/api/other/project?id=${encodeURIComponent(userId)}`);
		if (!res.ok) {
			throw new Error(`Failed to fetch projects: ${res.statusText}`);
		}
		projects = await res.json();
		console.log(projects);
		pageAdder.addProjectsToPage('projectCardList', projects);
	} catch (err) {
		console.error('Error loading Projects:', err);
	}
})();