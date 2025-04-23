const review = {
    projectId: '12345', // Replace with actual project ID
    rating: 5,
    comment: 'This is a great project!',
};

fetch('http://localhost:3000/api/review', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify(review),
})
    .then(res => res.json())
    .then(data => {
        console.log('Server response:', data);
    })
    .catch(err => {
        console.error('Error:', err);
    });
