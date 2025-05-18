
import pageAdder from './pageAdder.js';
import stringSearch from './stringSearch.js';

const fetchProjects = async (name) => {
	try {
		const response = await fetch(`/api/search/project?projectName=${name}`);
		if (!response.ok) {
			throw new Error('Encountered network error.');
		}

		const projects = await response.json();
		return projects;
	} catch (error) {
		console.error("Error fetching projects:", error);
		alert("Failed fetching projects.");
	}
}

const fetchUsers = async (name) => {
	try {
		const res = await fetch(`/api/search/user?userName=${encodeURIComponent(name)}`);

		if (!res.ok) {
			throw new Error('Failed to fetch users');
		}

		const users = await res.json();
		return users;
	} catch (error) {
		console.error('Error fetching users:', error);
		alert("Failed fetching users.");
	}
}

const markType = (container, type) => {
	for (let elem of container) {
		elem.type = type;
	}
}

const merge = (fst, snd, getterFst, getterSnd, comparator) => {
	let result = [];
	let i = 0;
	let j = 0;

	while (i < fst.length && j < snd.length) {
		const valFst = getterFst(fst[i]);
		const valSnd = getterSnd(snd[j]);

		if (comparator(valFst, valSnd) <= 0) {
			result.push(fst[i++]);
		} else {
			result.push(snd[j++]);
		}
	}

	if (i < fst.length) {
		result.push(...fst.slice(i));
	}

	if (j < snd.length) {
		result.push(...snd.slice(j));
	}

	return result;
}

const promiseOnToggle = (toggle, promise) => {
	if (toggle.checked) {
		return promise;
	}

	return Promise.resolve([]);
}

const queryListener = async (e) => {
	const input = document.getElementById("search-bar");
	const userToggle = document.getElementById("user-toggle");
	const projectToggle = document.getElementById("project-toggle");

	const query = input.value.trim();
	if (!query) {
		pageAdder.assignListToElement('search-results', [], null);
		return;
	}

	const promises = [];
	promises.push(promiseOnToggle(userToggle, fetchUsers(query)));
	promises.push(promiseOnToggle(projectToggle, fetchProjects(query)));

	const [users, projects] = await Promise.all(promises);

	if (!projects || !users) {
		return;
	}

	projects.sort((a, b) => a.name.localeCompare(b.name));
	users.sort((a, b) => a.name.localeCompare(b.name));

	markType(projects, "project");
	markType(users, "user");
	const merged = merge(projects, users, (p) => p.name, (u) => u.name, (x, y) => x.localeCompare(y));

	// further filtering and processing using the query.
	const comparator = stringSearch.getComparator(query);
	const queryLower = query.toLowerCase();
	const filtered = merged.sort(comparator).filter(x => x.name.toLowerCase().includes(queryLower));

	document.getElementById("search-results").innerHTML = "";
	const typeToHtml = { "user": pageAdder.userToElement, "project": pageAdder.projectToElement };

	pageAdder.assignListToElement('search-results', filtered, (x) => {
		return typeToHtml[x.type](x);
	});
};

const setupForm = () => {
	const form = document.getElementById("search-bar");
	pageAdder.assignListToElement('search-results', [], null);
	const userToggle = document.getElementById("user-toggle");
	const projectToggle = document.getElementById("project-toggle");
	form.addEventListener("input", (e) => {
		e.preventDefault();
		queryListener();
	});
	userToggle.addEventListener("change", queryListener);
	projectToggle.addEventListener("change", queryListener);
}

export default { fetchProjects, fetchUsers, markType, merge, setupForm };
