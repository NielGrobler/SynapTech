

async function fetchUserInfo() {
	const res = await fetch('/api/user/info', { credentials: 'include' });

	if (!res.ok) {
		throw new Error('Not authenticated');
	}

	const content = await res.json();
	console.log(`This is content: ${content}`);

	return content;
}

async function setUsername() {
	let userElement = document.getElementById("username");
	let userInfo = await fetchUserInfo();
	console.log(userInfo);
	userElement.innerHTML = userInfo["name"].trim().split(/\s+/)[0];
}


(async () => {
	try {
		await setUsername();
	} catch (err) {
		console.error('Error loading user:', err);
	}
})();

