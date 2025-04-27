
const fetchFromApi = async () => {
	const res = await fetch('/api/user/info', { credentials: 'include' });

	if (!res.ok) {
		throw new Error('Not authenticated');
	}

	const content = await res.json();

	return content;
}

export default {
	fetchFromApi
}

