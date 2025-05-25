
import userInfo from './userInfo.js'
import pageAdder from './pageAdder.js';
import { failToast, successToast } from './toast.js';

export const populateCollaborators = (project) => {
	let list = document.getElementById('collaboratorList');
	list.innerHTML = '';

	if (!project.collaborators || project.collaborators.length === 0) {
		list.innerHTML = 'No collaborators.';
		return;
	}

	project.collaborators.forEach(collaborator => {
		const li = document.createElement('li');
		li.innerText = collaborator.name;
		list.appendChild(li);
	});
}

export const fetchProject = async () => {
	const params = new URLSearchParams(window.location.search);
	const projectId = params.get('id');
	if (!projectId) {
		return null;
	}

	const res = await fetch(`/api/project?id=${projectId}`);
	const project = await res.json();
	return project;
}

export const fetchProjectFiles = async (project) => {
	try {
		const res = await fetch(`/api/project/${project.id}/files`);

		if (!res.ok) {
			throw new Error(`Failed to fetch files. Status: ${res.status}`);
		}

		const files = await res.json();
		return files;
	} catch (err) {
		console.error("Error fetching project files:", err.message || err);
		return { error: err.message || "An error occurred while fetching project files" };
	}
}

export const downloadProjectFile = async (projectId, uuid, filename, ext) => {
	try {
		const res = await fetch(`/api/project/${projectId}/file/${uuid}/${ext}`);

		if (!res.ok) {
			throw new Error(`Failed to download file: ${res.statusText}`);
		}

		const blob = await res.blob();
		const contentType = res.headers.get('Content-Type');

		const url = URL.createObjectURL(blob);

		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		a.remove();

		URL.revokeObjectURL(url);
	} catch (err) {
		console.error("Error downloading file:", err.message || err);
		failToast("There was an error downloading the file.");
	}
};

export const fetchMilestones = async (projectId) => {
	try {
		const res = await fetch(`/api/project/${projectId}/milestones`);

		if (!res.ok) {
			throw new Error(`Failed to fetching milestones: ${res.statusText}`);
		}

		const data = await res.json();
		return data;
	} catch (err) {
		console.error("Error:", err.message || err);
		failToast(`${err.error || err}`);
	}
}

export const postMilestone = async (projectId, name, description) => {
	const resp = await fetch(`/api/post/project/${projectId}/milestone`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ "name": name, "description": description })
	});

	if (resp.ok) {
		successToast('Milestone successfully posted!');
	} else {
		const error = await resp.json();
		failToast(`Error: ${error.error}`);
	}
}

export const toggleMilestone = async (projectId, milestoneId) => {
	const resp = await fetch(`/api/toggle/project/${projectId}/milestone`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ "milestoneId": milestoneId })
	});

	if (!resp.ok) {
		const error = await resp.json();
		failToast(`Error: ${error.error}`);
	}
}

export function fadeOutAndHide(elem) {
	elem.classList.remove('fade-in');
	elem.classList.add('fade-out');

	elem.addEventListener('transitionend', function handler() {
		elem.classList.add('hidden');
		elem.classList.remove('fade-out');
		elem.removeEventListener('transitionend', handler);
	});
}

function fadeIn(elem) {
	elem.classList.remove('hidden');
	elem.classList.remove('fade-out');
	requestAnimationFrame(() => {
		elem.classList.remove('fade-out');
		elem.classList.add('fade-in');
	});
}


export const toggleMilestoneForm = (e) => {
	e.preventDefault();
	const formSection = document.getElementById('milestone-form-section');
	const listSection = document.getElementById('milestone-list');
	const icon = document.getElementById('milestone-list-icon');
	if (formSection.classList.contains('hidden')) {
		fadeIn(formSection);
		fadeOutAndHide(listSection);
		icon.classList.remove('bx-list-plus');
		icon.classList.add('bx-list-ol');
	} else {
		fadeIn(listSection);
		fadeOutAndHide(formSection);
		icon.classList.add('bx-list-plus');
		icon.classList.remove('bx-list-ol');
	}
}

export const setMilestoneIcon = (icon, wasChecked) => {
	if (wasChecked) {
		icon.classList.remove('bx-checkbox');
		icon.classList.add('bx-checkbox-checked');
	} else {
		icon.classList.remove('bx-checkbox-checked');
		icon.classList.add('bx-checkbox');
	}
}

export const milestoneToHTML = (project, accountId, milestone) => {
	const name = milestone.name;
	const description = milestone.description;
	const id = milestone.project_milestone_id;

	const article = document.createElement('article');
	const header = document.createElement('h4');
	const span = document.createElement('span');
	const icon = document.createElement('i');
	let isChecked = milestone.completed_at !== null;

	icon.id = `icon-${id}`;
	icon.classList.add('bx');
	span.appendChild(icon);
	span.appendChild(header);
	span.classList.add('flex-row', 'center-content-v', 'no-pad-v', 'tight-stack');

	const para = document.createElement('p');
	header.innerText = name;
	header.classList.add('strike-animate');
	if (isChecked) {
		header.classList.add('strike-now');
		header.classList.add('green');
	}
	para.innerText = description;
	article.appendChild(span);
	article.appendChild(para);
	article.dataset.id = id;
	setMilestoneIcon(icon, isChecked);
	isChecked = !isChecked;
	const li = document.createElement('li');
	article.classList.add('no-pad-v', 'tight-stack', 'grey-left-border');
	li.appendChild(article);

	if (!isParticipant(accountId, project)) {
		return li;
	}

	article.classList.add('highlight-hover');
	article.addEventListener('click', async (e) => {
		e.preventDefault();
		await toggleMilestone(project.id, article.dataset.id);
		setMilestoneIcon(icon, isChecked);
		header.classList.remove('strike-now', 'strike-reverse');
		void header.offsetWidth;
		if (isChecked) {
			header.classList.add('green');
			header.classList.add('strike-now');
		} else {
			header.classList.remove('green');
			header.classList.add('strike-reverse');
		}
		isChecked = !isChecked;
	});

	return li;
}

export const getFileExt = (fileName) => {
	const parts = fileName.split('.');
	return parts.length > 1 ? parts.pop() : '';
};

export const projectFileToHTML = (projectFile) => {
	const li = document.createElement('li');
	const link = document.createElement('a');
	link.href = '#';
	link.textContent = `${projectFile.original_filename}`;
	link.dataset.projectId = projectFile.project_id;
	link.dataset.ext = getFileExt(projectFile.original_filename);
	link.dataset.uuid = projectFile.file_uuid;
	link.dataset.name = projectFile.original_filename;

	link.addEventListener('click', async (e) => {
		e.preventDefault();
		try {
			await downloadProjectFile(link.dataset.projectId, link.dataset.uuid, link.dataset.name, link.dataset.ext);
		} catch (err) {
			console.error("Error downloading the project file:", err);
			failToast("There was an error downloading the file.");
		}
	});
	li.appendChild(link);

	return li;
}

export const isParticipant = (userId, project) => {
	//console.log(project);
	if (userId === project.created_by_account_id) {
		return true;
	}

	for (const collaborator of project.collaborators) {
		if (collaborator.account_id === userId) {
			return true;
		}
	}

	return false;
}

export const postFundingRequest = async (opportunityId, projectId) => {
	//console.log(opportunityId, projectId);
	const resp = await fetch('/api/post/funding/request', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ "opportunityId": opportunityId, "projectId": projectId })
	});

	if (resp.ok) {
		successToast('Funding request sent successfully!');
	} else {
		const error = await resp.json();
		console.error(error);
		failToast(`Error: ${error.error}`);
	}

}

export const fundingOpportunityToHTML = (project, item) => {
	const title = item.organisation_name;
	const description = item.description;
	const currencyCode = item.currency_code;
	const grantAmount = item.grant_amount;

	const article = document.createElement('article');
	const header = document.createElement('h1');
	const para = document.createElement('p');
	const grantBlock = document.createElement('p');

	header.innerText = title;
	para.innerText = description;
	grantBlock.innerText = `${grantAmount} (${currencyCode})`;

	article.appendChild(header);
	article.appendChild(para);
	article.appendChild(grantBlock);
	article.classList.add('highlight-hover');

	article.addEventListener('click', (e) => {
		e.preventDefault();
		postFundingRequest(item.funding_opportunity_id, project.id);
	});

	return article;
}

export const addFundingButton = (userId, project) => {
	if (!isParticipant(userId, project)) {
		return;
	}

	let resultingButton = document.createElement('button');
	resultingButton.id = 'request-funding-button-id';
	resultingButton.innerText = 'Request Funding';

	resultingButton.addEventListener('click', async (e) => {
		e.preventDefault();
		const res = await fetch('/api/funding/opportunities');
		const data = await res.json();
		pageAdder.assignListToElement(`opportunities`, data, (item) => fundingOpportunityToHTML(project, item));
		resultingButton.remove();
	});

	document.getElementById('opportunity-section').appendChild(resultingButton);

	return resultingButton;
}

export const addRequestCollaboration = async (userDetails, project) => {
	if (isParticipant(userDetails.id, project)) {
		return false;
	}

	let collaboratorSection = document.getElementById("collaborators");
	let button = document.createElement("button");
	button.innerText = "Request Collaboration";

	button.addEventListener('click', async () => {
		try {
			const response = await fetch('/api/collaboration/request', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ "projectId": project.id })
			});

			if (response.ok) {
				successToast('Collaboration request sent successfully!');
			} else {
				const error = await response.json();
				failToast(`Error: ${error.error}`);
			}
		} catch (error) {
			console.error('Error sending request:', error);
			failToast('Failed to send collaboration request.');
		}
	});

	collaboratorSection.appendChild(button);

	return true;
}

export const createUserList = () => {
	let result = document.createElement('ul');
	result.id = 'users';
	return result;
}

export const inviteCollaborator = async (accountId, projectId, role) => {
	try {
		const response = await fetch('/api/collaboration/invite', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ "accountId": accountId, "projectId": projectId, "role": role })
		});

		if (response.ok) {
			successToast('Collaboration invite sent successfully!');
		} else {
			const error = await response.json();
			failToast(`Error: ${error.error}`);
		}
	} catch (error) {
		console.error('Error sending request:', error);
		failToast('Failed to send collaboration request.');
	}
};

export const milestoneFormListener = (project) => {
	return async (e) => {
		e.preventDefault();
		const nameInput = document.getElementById('milestoneName');
		const descriptionInput = document.getElementById('milestoneDescription')
		const name = nameInput.value.trim();
		const description = descriptionInput.value.trim();
		nameInput.value = '';
		descriptionInput.value = '';
		if (!name || !description) {
			failToast('Please fill out both fields.');
			return;
		}
		const projectId = project.id;
		const info = await userInfo.fetchFromApi();
		await postMilestone(projectId, name, description);
		await populateMilestones(project, info.id);
	}
}

var inviteFormCreated = false;
export const createInviteForm = (project) => {
	const projectId = project.id;
	inviteFormCreated = true;
	let form = document.createElement('form');
	form.id = "user-search-form";
	let input = document.createElement('input');
	input.id = 'user-search-input';
	input.placeholder = 'Search for users...';
	let button = document.createElement('button');
	button.classList.add('nav-item', 'flex-row', 'gap-small', 'center-content-v');
	let icon = document.createElement('i');
	icon.classList.add('bx', 'bx-search');
	button.innerText = 'Submit';
	button.appendChild(icon);

	form.appendChild(input);
	form.addEventListener('submit', (e) => e.preventDefault());
	//form.appendChild(button);

	form.addEventListener('input', async (e) => {
		e.preventDefault();
		var name = input.value;

		try {
			const res = await fetch(`/api/search/user?userName=${encodeURIComponent(name)}`);

			if (!res.ok) {
				throw new Error('Failed to fetch users.');
			}

			const data = await res.json();
			const userElement = document.getElementById("users");
			const users = data.filter(x => !isParticipant(x.account_id, project));
			userElement.classList.add("gap-medium", "no-list-style");
			userElement.innerHTML = "";

			pageAdder.assignListToElement(`users`, users, (rawUser) => {
				const li = document.createElement('li');
				const title = document.createElement('strong');
				title.textContent = rawUser.name;
				const description = document.createElement("p");
				description.textContent = rawUser.bio;
				const id = rawUser.account_id;
				let buttonSection = document.createElement('section');
				buttonSection.classList.add('flex-col', 'gap', 'to-start');

				const buttonAddAsResearcher = document.createElement('button');
				const buttonAddAsReviewer = document.createElement('button');
				buttonAddAsResearcher.innerText = 'Invite as Researcher';
				buttonAddAsReviewer.innerText = 'Invite as Reviewer';
				buttonSection.appendChild(buttonAddAsResearcher);
				buttonSection.appendChild(buttonAddAsReviewer);

				li.dataset.accountId = id;

				li.appendChild(title);
				li.appendChild(description);
				li.appendChild(buttonSection);

				li.classList.add('highlight-hover');

				buttonAddAsResearcher.addEventListener('click', async (e) => {
					e.preventDefault();
					await inviteCollaborator(li.dataset.accountId, projectId, "Researcher");
				});

				buttonAddAsReviewer.addEventListener('click', async (e) => {
					e.preventDefault();
					await inviteCollaborator(li.dataset.accountId, projectId, "Reviewer");
				});

				return li;
			});
		} catch (error) {
			console.error(`Error fetching users: ${error}`);
		}
	});

	return form;
}

export const addCollaboratorButton = async (userDetails, project) => {
	if (project.created_by_account_id !== userDetails.id) {
		return false;
	}

	let collaboratorSection = document.getElementById("collaborators");
	let button = document.createElement("button");
	button.id = 'collaboration-section-button';
	button.innerText = "Add Collaborator";
	collaboratorSection.appendChild(button);

	button.addEventListener('click', (e) => {
		collaboratorSection.removeChild(button);
		collaboratorSection.appendChild(createInviteForm(project));
		collaboratorSection.appendChild(createUserList());
	});

	return true;
}

export const loadProjectFiles = (project) => {
	fetchProjectFiles(project)
		.then((files) => {
			const filesList = document.getElementById("filesList");
			filesList.innerHTML = '';
			pageAdder.assignListToElement("filesList", files, projectFileToHTML);
		})
		.catch((err) => {
			console.error('Error fetching files:', err);
		});
}

export const addUploadButton = (userDetails, project) => {
	if (project.created_by_account_id !== userDetails.id) {
		return false;
	}

	const button = document.getElementById("uploadButton");
	button.style.display = '';
	const filesSection = document.getElementById('files');

	button.addEventListener('click', (e) => {
		e.preventDefault();
		const fileInput = document.createElement('input');
		fileInput.type = 'file';
		fileInput.accept = '*';

		fileInput.addEventListener('change', async (event) => {
			const file = event.target.files[0];
			if (!file) {
				failToast("No file selected.");
				return;
			}

			const loadingMessage = document.createElement('p');
			loadingMessage.innerText = "Uploading file...";
			filesSection.appendChild(loadingMessage);

			const formData = new FormData();
			formData.append('file', file);

			const projectId = project.id;
			try {
				const response = await fetch(`/api/project/${projectId}/upload`, {
					method: 'POST',
					body: formData,
				});

				const data = await response.json();

				if (response.ok) {
					successToast('File uploaded successfully!');
					loadProjectFiles(project);
				} else {
					failToast(`Error: ${data.error || 'Failed to upload file.'}`);
				}
			} catch (error) {
				console.error('Error uploading file:', error);
				failToast('An error occurred while uploading the file.');
			} finally {
				loadingMessage.remove();
			}
		});

		fileInput.click();
	});

	return true;
}

export const populateMilestones = async (project, accountId) => {
	const data = await fetchMilestones(project.id);
	document.getElementById('milestone-list').innerHTML = '';
	pageAdder.assignListToElement(`milestone-list`, data, (item) => milestoneToHTML(project, accountId, item));
}

export const populateElements = async () => {
	const project = await fetchProject();
	if (!project) {
		document.getElementById('projectName').innerText = "Could not display project.";
		return;
	}

	document.getElementById('projectName').innerHTML = project.name;
	document.getElementById('projectIsPublic').innerHTML = project.is_public ? 'Public' : 'Private';
	document.getElementById('projectCreatedBy').innerHTML = project.author_name;
	document.getElementById('projectDescription').innerHTML = project.description;
	document.getElementById('projectDisplayId').innerHTML = `#${project.id}`;
	document.getElementById('projectDateCreated').innerHTML = formatDate(project.created_at);

	const info = await userInfo.fetchFromApi();
	populateCollaborators(project);
	addCollaboratorButton(info, project);
	addRequestCollaboration(info, project)
	addUploadButton(info, project);
	addFundingButton(info.id, project);
	populateMilestones(project, info.id);
	if (isParticipant(info.id, project)) {
		document.getElementById('add-milestone-btn').addEventListener('click', toggleMilestoneForm);
		document.getElementById('milestone-form').addEventListener('submit', milestoneFormListener(project));
	} else {
		document.getElementById('add-milestone-btn').classList.add('visually-hidden');
	}

	const reviewListToggle = document.getElementById('review-list-drop-btn');
	var isExpanded = true;
	reviewListToggle.addEventListener('click', (e) => {
		e.preventDefault();
		const icon = document.getElementById('review-drop-icon');
		const list = document.getElementById('reviewsList');
		if (isExpanded) {
			icon.classList.remove('bx-chevron-up');
			icon.classList.add('bx', 'bx-chevron-down');
			list.classList.add('visually-hidden');
			list.style.maxHeight = list.scrollHeight + 'px';
			requestAnimationFrame(() => {
				list.style.transition = 'max-height 0.3s ease-out, opacity 0.3s ease-out';
				list.style.maxHeight = '0';
				list.style.opacity = '0';
			});
		} else {
			icon.classList.remove('bx-chevron-down');
			icon.classList.add('bx', 'bx-chevron-up');
			list.classList.remove('visually-hidden');

			requestAnimationFrame(() => {
				list.style.transition = 'max-height 0.3s ease-in, opacity 0.3s ease-in';
				list.style.maxHeight = list.scrollHeight + 'px';
				list.style.opacity = '1';
			});
		}
		isExpanded = !isExpanded;
	});

	loadProjectReviews(project);
	loadProjectFiles(project);
}

export async function initPage() {
	const collabList = document.getElementById('collaboratorList');

	if (!collabList) {
		console.error('collaboratorList element not found');
		return;
	}

	await populateElements();
}

// Fetch reviews for a project
export const fetchReviews = async (projectId, page = 1, limit = 10) => {
	try {
		const res = await fetch(`/api/reviews?projectId=${projectId}&page=${page}&limit=${limit}`);
		if (!res.ok) {
			throw new Error('Failed to fetch reviews');
		}
		const result = await res.json();
		return result;
	} catch (error) {
		console.error('Error fetching reviews:', error);
		return { reviews: [], totalCount: 0 };
	}
};

export const formatDate = (dateString) => {
	const options = { year: 'numeric', month: 'short', day: 'numeric' };
	return new Date(dateString).toLocaleDateString(undefined, options);
};

// Create a star rating display
export const createStarRating = (rating) => {
	const figure = document.createElement('figure');
	figure.className = 'star-rating';

	for (let i = 0; i < rating; i++) {
		const star = document.createElement('span');
		star.innerHTML = '★';
		star.className = 'star filled';
		figure.appendChild(star);
	}

	for (let i = rating; i < 5; i++) {
		const star = document.createElement('span');
		star.innerHTML = '★';
		star.className = 'star';
		figure.appendChild(star);
	}

	return figure;
};

export const displayReviews = (reviews, append = false) => {
	const reviewsList = document.getElementById('reviewsList');

	if (!append) {
		reviewsList.innerHTML = '';
	}


	if (!reviews || reviews.length === 0) { //reviews is undefined if empty? Bizarre
		if (!append) {
			const emptyItem = document.createElement('li');
			emptyItem.textContent = 'No reviews yet for this project.';
			reviewsList.appendChild(emptyItem);
		}
		return;
	}

	reviews.forEach(review => {
		const reviewItem = document.createElement('li');
		reviewItem.className = 'review-item';

		const ratingFigure = createStarRating(review.rating);

		const commentParagraph = document.createElement('p');
		commentParagraph.textContent = review.comment;

		const reviewerInfo = document.createElement('p');
		reviewerInfo.className = 'reviewer-info';
		reviewerInfo.textContent = `${review.reviewer_name}, ${formatDate(review.created_at)}`;

		reviewItem.appendChild(ratingFigure);
		reviewItem.appendChild(commentParagraph);
		reviewItem.appendChild(reviewerInfo);
		reviewsList.appendChild(reviewItem);
	});
};

// Load and display project reviews
export const loadProjectReviews = async (project) => {
	const reviewsSection = document.getElementById('reviews');
	const paginationNav = document.getElementById('reviewsPagination');
	let currentPage = 1;

	const { reviews, totalCount } = await fetchReviews(project.id);
	displayReviews(reviews);

	if (totalCount > 10) {
		paginationNav.style.display = 'flex';

		const loadMoreBtn = document.getElementById('loadMoreReviews');
		loadMoreBtn.addEventListener('click', async () => {
			currentPage++;
			const moreReviews = await fetchReviews(project.id, currentPage);
			displayReviews(moreReviews.reviews, true);

			if (currentPage * 10 >= totalCount) {
				loadMoreBtn.style.display = 'none';
			}
		});
	}
};

/*export { //for testing
	populateCollaborators,
	fetchProject,
	fetchProjectFiles,
	downloadProjectFile,
	getFileExt,
	projectFileToHTML,
	isParticipant,
	addRequestCollaboration,
	createUserList,
	inviteCollaborator,
	createInviteForm,
	addCollaboratorButton,
	loadProjectFiles,
	addUploadButton,
	populateElements,
	fetchReviews,
	formatDate,
	createStarRating,
	displayReviews,
	loadProjectReviews,
};*/
