const express = require('express');
const router = express.Router();

// Assuming db is a database handler that is already set up
const db = require('../db'); // You may need to adjust this based on your actual db setup

// Save a new review
router.post('/submit/review', async (req, res) => {
    const { projectId, rating, comment } = req.body;
    const userId = req.session.userId;  // Assuming userId is stored in the session

    if (!userId) {
        return res.status(400).json({ error: 'User is not authenticated' });
    }

    try {
        // Retrieve user details (e.g., name)
        const user = await db.users.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Save the review to the database
        await db.reviews.create({
            projectId,
            reviewerId: userId,
            reviewerName: user.name,
            rating: Number(rating),
            comment,
            dateSubmitted: new Date(),
        });

        // Respond with success
        res.status(201).json({ message: 'Review submitted successfully' });
    } catch (error) {
        console.error('Error submitting review:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
