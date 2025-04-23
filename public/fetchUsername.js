

const fetchUserInfo = async () => {
	const res = await fetch('/api/user/info', { credentials: 'include' });

	if (!res.ok) {
		throw new Error('Not authenticated');
	}

	const content = await res.json();

	return content;
}

const setUsername = async () => {
	let userElement = document.getElementById("username");
	let userInfo = await fetchUserInfo();



	userElement.innerHTML = userInfo["name"].trim().split(/\s+/)[0];
}

(async () => {
	try {
		await setUsername();
	} catch (err) {
		console.error('Error loading user:', err);
	}
})();

export default {
	fetchUserInfo,
	setUsername
}
