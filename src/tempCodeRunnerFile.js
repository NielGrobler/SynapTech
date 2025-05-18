const fetchReviews = async (projectId, page = 1, limit = 10) => {
	try {
		const res = await fetch(`/api/reviews?projectId=${projectId}&page=${page}&limit=${limit}`);
		if (!res.ok) {
			throw new Error('Failed to fetch reviews');
		}
		return res.json();
	} catch (error) {
		console.error('Error fetching reviews:', error);
		return { reviews: [], totalCount: 0 };
	}
};

const formatDate = (dateString) => {
	const options = { year: 'numeric', month: 'short', day: 'numeric' };
	return new Date(dateString).toLocaleDateString(undefined, options);
};

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
		star.innerHTML = '☆';
		star.className = 'star empty';
		figure.appendChild(star);
	}

	return figure;
};

// Display reviews in the reviews section
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
		reviewItem.className = 'review-item border-solid-thin shadow margin-bottom-small padding-small';

		const reviewHeader = document.createElement('header');
		reviewHeader.className = 'flex-row space-between small-text';

		const reviewerInfo = document.createElement('p');
		reviewerInfo.textContent = `By: ${review.reviewer_name}`;

		const reviewDate = document.createElement('time');
		reviewDate.textContent = formatDate(review.created_at);
		reviewDate.dateTime = review.created_at;

		reviewHeader.appendChild(reviewerInfo);
		reviewHeader.appendChild(reviewDate);

		const ratingFigure = createStarRating(review.rating);

		const commentParagraph = document.createElement('p');
		commentParagraph.className = 'review-comment';
		commentParagraph.textContent = review.comment;

		reviewItem.appendChild(reviewHeader);
		reviewItem.appendChild(ratingFigure);
		reviewItem.appendChild(commentParagraph);

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


