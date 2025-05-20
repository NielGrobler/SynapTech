import userInfo from './userInfo.js';

const populateElements = async () => {
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
}

export default {
	populateElements
};