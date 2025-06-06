import pageAdder from "./pageAdder.js";

const fetchUsers = async (name) => {
	try {
		const res = await fetch(`/api/search/user?userName=${encodeURIComponent(name)}`);

		if (!res.ok) {
			throw new Error('Failed to fetch users');
		}

		const users = await res.json();
		document.getElementById("users").innerHTML = "";
		pageAdder.addUsersToPage('users', users);
	} catch (error) {
		console.error('Error fetching users:', error);
	}
}

document.getElementById("searchForm").addEventListener("submit", async function(event) {
	event.preventDefault();

	const query = document.getElementById("searchInput").value;
	fetchUsers(query);
});

export default {
	fetchUsers
}