router.post('/', async (req, res) => {
    const { projectId, rating, comment } = req.body;
    //const userId = req.session.userId;

    try {
        //const user = await db.users.findById(userId); // assuming you have this

        const newReview = await db.reviews.create({
            projectId,
            //reviewerName: user.name,
            rating: Number(rating),
            comment,
            dateSubmitted: new Date()
        });

        res.status(201).json({
            message: 'Review submitted!',
            review: newReview
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to submit review', details: error.message });
    }
});
