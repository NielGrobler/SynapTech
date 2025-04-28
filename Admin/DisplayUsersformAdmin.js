
function addUserToPage(user) {
	let projectCardList = document.getElementById("userCardList");
	const li = document.createElement("li");
	const title = document.createElement("strong");
	title.textContent = user.name;
	const description = document.createElement("p");
	description.textContent = user.description;


	li.appendChild(title);
	li.appendChild(description);
	li.classList.add("highlight-hover");
	li.addEventListener('click', () => {
		localStorage.setItem('userData', JSON.stringify(user));
		window.location.href = '/view/user';
	});

	projectCardList.appendChild(li);
}

function addUsersToPage(users) {
	for (let user of users) {
		addUserToPage(project);
	}
}

/* Temporary project data. To test display on dashboard */

(async () => {
	try {
		const res = await fetch('/api/admin/getAllUsers');
		const users = await res.json();
		addUsersToPage(users);
		console.log(users);
	} catch (err) {
		console.error('Error loading user:', err);
	}
})();
