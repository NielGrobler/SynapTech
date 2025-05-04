import userInfo from './userInfo.js';

const setUsername = async () => {
	const userElement = document.getElementById("username");
	const info = await userInfo.fetchFromApi();
	userElement.innerHTML = info["name"].trim().split(/\s+/)[0];
};

if (typeof window !== 'undefined' && import.meta.env?.MODE !== 'test') {
	(async () => {
		try {
			await setUsername();
		} catch (err) {
			console.error('Error loading user:', err);
		}
	})();
}

export default {
	setUsername
};
