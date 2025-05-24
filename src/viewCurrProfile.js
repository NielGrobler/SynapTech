import userInfo from './userInfo.js'
import pageAdder from './pageAdder.js'

let projects = [];

const noneIfAbsent = (s) => {
	return !s ? 'None' : s;
}

const populateElements = async () => {
	try {
		const user = await userInfo.fetchFromApi();
		console.log(user);
		document.getElementById('userName').innerText = user.name;
		document.getElementById('userBio').innerText = noneIfAbsent(user.bio);

		document.getElementById('userUni').innerText = noneIfAbsent(user.university);
		document.getElementById('userDepartment').innerText = noneIfAbsent(user.department);
	} catch (error) {
		document.getElementById('userName').innerText = "Could not display user.";
	}
}


document.addEventListener("DOMContentLoaded", async () => {
	try {
		const res = await fetch('/api/user/project');
		projects = await res.json();
		pageAdder.addProjectsToPage('projectCardList', projects);
		populateElements();
	} catch (err) {
		console.error('Error loading Projects:', err);
	}
});
