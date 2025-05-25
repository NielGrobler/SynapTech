export const formatDate = (dateString) => {
	const options = { year: 'numeric', month: 'short', day: 'numeric' };
	return new Date(dateString).toLocaleDateString(undefined, options);
};

const projectToElement = (project) => {
	const id = !project.id ? project.project_id : project.id;

	const li = document.createElement("li");
	const title = document.createElement("span");
	const idSpan = document.createElement("span");
	const nameSpan = document.createElement("strong");
	const dateSpan = document.createElement("span");
	const infoSpan = document.createElement("span");
	idSpan.classList.add("green", "to-end");
	nameSpan.classList.add("to-start");
	title.classList.add("space-between", "flex-row");
	dateSpan.textContent = `, ${formatDate(project.created_at)}`;
	idSpan.textContent = `ID: #${id}`;
	infoSpan.append(idSpan);
	infoSpan.append(dateSpan);

	nameSpan.textContent = `${project.name} `;
	title.appendChild(nameSpan);
	title.appendChild(infoSpan);
	li.dataset.type = "project";
	const description = document.createElement("p");
	description.textContent = project.description;


	li.appendChild(title);
	li.appendChild(description);
	li.classList.add("highlight-hover");
	li.addEventListener('click', () => {
		window.location.href = `/view/project?id=${id}`;
	});

	return li;
}

const userToElement = (user) => {
	const li = document.createElement("li");
	const title = document.createElement("strong");
	li.dataset.type = "user";
	title.textContent = user.name;
	const description = document.createElement("p");
	description.textContent = user.bio;
	const id = user.account_id;


	li.appendChild(title);
	li.appendChild(description);
	li.classList.add("highlight-hover");
	li.addEventListener('click', () => {
		window.location.href = `/view/other/profile?id=${encodeURIComponent(id)}`;
	});

	return li;
}

const addProjectsToPage = (elementId, projects) => {
	assignListToElement(
		elementId,
		projects,
		projectToElement
	);
}

const clearProjects = (elementId) => {
	document.getElementById(elementId).innerHTML = "";
}

const addUsersToPage = (elementId, users) => {
	assignListToElement(
		elementId,
		users,
		userToElement
	);
}


/*
 * A function to add a list of elements specified by rawElements formatted by elementHTMLFormatter to the element elementId.
 */
const assignListToElement = (elementId, rawElements, elementHTMLFormatter, noDisplayText = "No results.") => {
	if (!rawElements) {
		console.error('rawElements is undefined');
		return;
	}

	if (rawElements.length === 0) {
		document.getElementById(elementId).innerHTML = `<p> ${noDisplayText}</p> `;
		return;
	}

	let containerElement = document.getElementById(elementId);

	for (const rawElement of rawElements) {
		containerElement.appendChild(elementHTMLFormatter(rawElement));
	}
}

export default {
	addProjectsToPage,
	clearProjects,
	assignListToElement,
	addUsersToPage,
	userToElement,
	projectToElement,
};

