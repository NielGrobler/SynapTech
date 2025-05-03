import userInfo from './userInfo.js'
import fetchUsername from './fetchUsername.js'

let projects = [];

const populateElements = async () => {
    try {
        const user = await userInfo.fetchFromApi();
        document.getElementById("username").innerHTML = fetchUsername.setUsername();
        document.getElementById('userName').innerHTML = user.name;
        document.getElementById('userUni').innerHTML = user.university;
        document.getElementById('userDepartment').innerHTML = user.department;
    } catch (error) {
        console.error("User not authenticated:", error);
        document.getElementById('userName').innerText = "Could not display user.";
    }
  }
  

  document.addEventListener("DOMContentLoaded", () => {
    populateElements();
  });

(async () => {
	try {
		const res = await fetch('/api/user/project');
		projects = await res.json();
		pageAdder.addProjectsToPage('projectCardList', projects)
		console.log(projects);
	} catch (err) {
		console.error('Error loading Projects:', err);
	}
})();