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

/*const populateElements = async () => {
	const username = document.getElementById("userName");
	const bio = document.getElementById("userBio");
	const university = document.getElementById("userUni");
	const department = document.getElementById("userDepartment");

	try {
		const user = await userInfo.fetchFromApi();
		//console.log(user);
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
}*/

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

(async()=>{
	try{
		const res = await fetch('/admin');
		const admin = await res.json();
		if(admin){
			const viewSus = document.createElement('button');
			viewSus.textContent = "View Suspended Users";
			viewSus.addEventListener('click', () =>{
			window.location.href = `/redirect/view/suspended`;
			});
			document.body.appendChild(viewSus);
		}
	}catch(error){
		console.error('Error fetching admin status:', error);
	}
})();