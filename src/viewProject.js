
import userInfo from './userInfo.js'
import pageAdder from './pageAdder.js';

function populateCollaborators(project) {
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

const fetchProject = async () => {
	const params = new URLSearchParams(window.location.search);
	const projectId = params.get('id');
	if (!projectId) {
		return null;
	}

	const res = await fetch(`/api/project?id=${projectId}`);
	const project = await res.json();
	return project;
}

const fetchProjectFiles = async (project) => {
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

const downloadProjectFile = async (projectId, uuid, filename, ext) => {
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
		alert("There was an error downloading the file.");
	}
};

const getFileExt = (fileName) => {
	const parts = fileName.split('.');
	return parts.length > 1 ? parts.pop() : '';
};

const projectFileToHTML = (projectFile) => {
	const li = document.createElement('li');
	const link = document.createElement('a');
	link.href = '#';
	//console.log(projectFile);
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
			alert("There was an error downloading the file.");
		}
	});
	li.appendChild(link);

	return li;
}

const isParticipant = (userId, project) => {
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

const addRequestCollaboration = async (userDetails, project) => {
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
				alert('Collaboration request sent successfully!');
			} else {
				const error = await response.text();
				alert(`Error: ${error}`);
			}
		} catch (error) {
			console.error('Error sending request:', error);
			alert('Failed to send collaboration request.');
		}
	});

	collaboratorSection.appendChild(button);

	return true;
}

const createUserList = () => {
	let result = document.createElement('ul');
	result.id = 'users';
	return result;
}

const inviteCollaborator = async (accountId, projectId, role) => {
	try {
		const response = await fetch('/api/collaboration/invite', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ "accountId": accountId, "projectId": projectId, "role": role })
		});

		if (response.ok) {
			alert('Collaboration invite sent successfully!');
		} else {
			const error = await response.text();
			alert(`Error: ${error}`);
		}
	} catch (error) {
		console.error('Error sending request:', error);
		alert('Failed to send collaboration request.');
	}
};

var inviteFormCreated = false;
var count = 0;
const createInviteForm = (project) => {
	const projectId = project.id;
	if (inviteFormCreated) {
		if (count > 5) {
			alert("Fine. You win.");
			document.body.innerHTML = '';
		} else if (count > 4) {
			alert("Seriously stop.");
		} else if (count > 3) {
			alert("Stop clicking her.");
		}
		count++;
		return;
	}
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
	form.appendChild(button);

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
				buttonSection.classList.add('flex-row', 'gap', 'width-30', 'split');

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

const addCollaboratorButton = async (userDetails, project) => {
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

const loadProjectFiles = (project) => {
	fetchProjectFiles(project)
		.then((files) => {
			filesList.innerHTML = '';
			pageAdder.assignListToElement("filesList", files, projectFileToHTML);
		})
		.catch((err) => {
			console.error('Error fetching files:', err);
		});
}

const addUploadButton = (userDetails, project) => {
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
				alert("No file selected.");
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
					alert('File uploaded successfully!');
					loadProjectFiles(project);
				} else {
					alert(`Error: ${data.error || 'Failed to upload file.'}`);
				}
			} catch (error) {
				console.error('Error uploading file:', error);
				alert('An error occurred while uploading the file.');
			} finally {
				loadingMessage.remove();
			}
		});

		fileInput.click();
	});

	return true;
}

const populateElements = async () => {
	const project = await fetchProject();
	if (!project) {
		document.getElementById('projectName').innerText = "Could not display project.";
		return;
	}

	document.getElementById('projectName').innerHTML = project.name;
	document.getElementById('projectIsPublic').innerHTML = project.is_public ? 'Public' : 'Private';
	document.getElementById('projectCreatedBy').innerHTML = project.author_name;
	document.getElementById('projectDescription').innerHTML = project.description;

	const info = await userInfo.fetchFromApi();
	populateCollaborators(project);
	addCollaboratorButton(info, project);
	addRequestCollaboration(info, project)
	addUploadButton(info, project);
	loadProjectReviews(project);
	loadProjectFiles(project);

	/*document.addEventListener('DOMContentLoaded', () => {
		console.log("dwqiudhwqiudhwqdihwqHELLO?");
	});*/
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
const fetchReviews = async (projectId, page = 1, limit = 10) => {
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

const formatDate = (dateString) => {
	const options = { year: 'numeric', month: 'short', day: 'numeric' };
	return new Date(dateString).toLocaleDateString(undefined, options);
};

// Create a star rating display
const createStarRating = (rating) => {
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

const displayReviews = (reviews, append = false) => {
	const reviewsList = document.getElementById('reviewsList');

	if (!append) {
		reviewsList.innerHTML = '';
	}

	if (reviews.length === 0) {
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
const loadProjectReviews = async (project) => {
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



