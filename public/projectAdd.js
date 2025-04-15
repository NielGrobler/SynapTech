
function addProjectToPage(project) {
	let projectCardList = document.getElementById("projectCardList");
	const li = document.createElement("li");
	const title = document.createElement("strong");
	title.textContent = project.title;
	const description = document.createElement("p");
	description.textContent = project.description;

	li.appendChild(title);
	li.appendChild(description);

	projectCardList.appendChild(li);
}

function addProjectsToPage(projects) {
	for (let project of projects) {
		addProjectToPage(project);
	}
}

/* Temporary project data. To test display on dashboard */
const projects = [
  {
    title: 'Exploring the World of Web Development',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
  },
  {
    title: 'Understanding JavaScript Closures',
    description: 'Closures are one of the most important concepts in JavaScript...',
  },
  {
    title: 'CSS Grid: A Game Changer for Layouts',
   description: 'CSS Grid is a powerful layout system that enables complex designs...',
  }
];

addProjectsToPage(projects);
