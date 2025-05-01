const fetchUsers = async (name) => {
	try {
		const res = await fetch(`/api/search/users?userName=${encodeURIComponent(name)}`);
		if (!res.ok) {
			throw new Error('Failed to fetch users');
		}

		const users = await res.json();
		console.log(users);
		document.getElementById("users").innerHTML = "";
		pageAdder.addProjectsToPage('users', users);
	} catch (error) {
		console.error('Error fetching projects:', error);
	}
}

document.getElementById("searchForm").addEventListener("submit", async function(event) {
	event.preventDefault();

	const query = document.getElementById("searchInput").value;
	fetchProjects(query);
});

export default {
	fetchUsers
}