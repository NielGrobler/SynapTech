
import userInfo from './userInfo.js';

const setUsername = async () => {
	let userElement = document.getElementById("username");
	let info = await userInfo.fetchFromApi();

	userElement.innerHTML = info["name"].trim().split(/\s+/)[0];
}

(async () => {
	try {
		await setUsername();
	} catch (err) {
		console.error('Error loading user:', err);
	}
})();

export default {
	setUsername
}
