const express = require('express');
const path = require('path');

// Create an instance of the Express app
const app = express();
app.use(express.static(path.join(__dirname, 'public')));

// Set up a route to serve your HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Define the port the server will run on
const PORT = process.env.PORT || 3000;

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

