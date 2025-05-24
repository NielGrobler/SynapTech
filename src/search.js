
import pageAdder from './pageAdder.js';
import stringSearch from './stringSearch.js';
import { failToast, successToast } from './toast.js';

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
		failToast("Failed fetching projects.");
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
		failToast("Failed fetching users.");
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

const getSelectedSearchType = () => {
	const selected = document.querySelector('input[name="visibility"]:checked');
	return selected ? selected.value : 'Projects'; // Default to Projects if none selected
}

const queryListener = async (e) => {
	const input = document.getElementById("search-bar");
	const query = input.value.trim();

	if (!query) {
		pageAdder.assignListToElement('search-results', [], null);
		return;
	}

	const searchType = getSelectedSearchType();
	let users = [];
	let projects = [];

	if (searchType === 'User') {
		users = await fetchUsers(query);
	} else if (searchType === 'Projects') {
		projects = await fetchProjects(query);
	}

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

	const radioButtons = document.querySelectorAll('input[name="visibility"]');

	form.addEventListener("input", queryListener);
	radioButtons.forEach(radio => {
		radio.addEventListener("change", queryListener);
	});
}

export {
	fetchProjects,
	fetchUsers,
	markType,
	merge,
	getSelectedSearchType,
	queryListener,
	setupForm
};

export default {
	fetchProjects,
	fetchUsers,
	markType,
	merge,
	getSelectedSearchType,
	queryListener,
	setupForm
};
