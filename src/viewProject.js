
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

const isParticipant = (userId, project) => {
	console.log('ISPARTICIPANT');
	console.log(userId);
	console.log(project);
	if (userId === project.created_by_account_id) {
		console.log("WENT HERE :3");
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
	console.log("<<<< Hello from inviteCollaborator >>>>");
	console.log(accountId);
	console.log(projectId);
	console.log(role);
	console.log("<<<< Goodbye >>>>");
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
	console.log("#### Hello from createInviteForm ####");
	console.log(projectId);
	console.log("#### Goodbye ####");
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
				console.log(res);
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
				console.log(rawUser);
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
	// add stuff here
	collaboratorSection.appendChild(button);

	button.addEventListener('click', (e) => {
		console.log("Hello world!");
		collaboratorSection.removeChild(button);
		console.log("^^^^ Hello from addCollaboratorButton ^^^^");
		console.log(project);
		console.log("^^^^ Goodybe ^^^^");
		collaboratorSection.appendChild(createInviteForm(project));
		collaboratorSection.appendChild(createUserList());
	});

	return true;
}

const populateElements = async () => {
	const project = await fetchProject();
	console.log(project);
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

	document.addEventListener('DOMContentLoaded', () => {
		loadProjectReviews(project);
	});
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

// Display reviews in the reviews section
document.addEventListener('DOMContentLoaded', () => { //avoids this being run before loaded
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
});





