function addReviewToPage(review) {
    let reviewList = document.getElementById("reviewList");

    const li = document.createElement("li");

    const rating = document.createElement("p");
    const stars = "★".repeat(review.rating) + "☆".repeat(5 - review.rating);
    rating.textContent = `Rating: ${stars}`;

    const comment = document.createElement("p");
    comment.textContent = review.comment;

    const date = document.createElement("time");
    const submittedDate = new Date(review.dateSubmitted);
    date.dateTime = submittedDate.toISOString();
    date.textContent = `Submitted on: ${submittedDate.toLocaleDateString()}`;

    li.appendChild(reviewer);
    li.appendChild(rating);
    li.appendChild(comment);
    li.appendChild(date);

    li.classList.add("highlight-hover");

    reviewList.appendChild(li);
}

function addReviewsToPage(reviews) {
    for (let review of reviews) {
        addReviewToPage(review);
    }
}

(async () => {
    try {
        const res = await fetch('/api/project/reviews');
        const reviews = await res.json();
        addReviewsToPage(reviews);
        console.log(reviews);
    } catch (err) {
        console.error('Error loading reviews:', err);
    }
})();
