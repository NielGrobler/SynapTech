const fetchFromApi = async () => {
		const res = await fetch('/api/user/info', { credentials: 'include' });

		if (!res.ok) {
			throw new Error('Not authenticated');
		}

		const content = await res.json();

		return content;
}

const fetchOtherUserFromApi = async (userId) => {
	const res = await fetch(`/api/user?id=${encodeURIComponent(userId)}`);
	
	if (!res.ok) {
		throw new Error('Not authenticated');
	}

	const content = await res.json();
	console.log(`[fetchFromApi] ${content}`);

	return content;
}

export default {
	fetchFromApi,
	fetchOtherUserFromApi
}