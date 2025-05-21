document.addEventListener('DOMContentLoaded', function() {
    function getProjectId() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }

    document.getElementById('submitReviewBtn').addEventListener('click', function() {
        const review = {
            projectId: getProjectId(),
            rating: document.getElementById('rating').value,
            comment: document.getElementById('comment').value
        };

        if (!review.rating || !review.comment) {
            alert('Please fill all required fields');
            return;
        }

        fetch('/api/review', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(review),
        })
            .then(res => {
                if (!res.ok) {
                    throw new Error(`Request failed with status: ${res.status}`);
                }
                return res.json();
            })
            .then(data => {
                //console.log('Server response:', data);
                if (data.message === 'Review submitted!') {
                    window.location.href = data.redirect || '/successfulReviewPost';
                } else if (data.error) {
                    alert('Error: ' + data.error);
                }
            })
            .catch(err => {
                console.error('Error:', err);
                alert('Failed to submit review. Please try again.');
            });
    });
});

