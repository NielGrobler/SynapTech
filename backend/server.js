const express = require('express');
const publishing = require('./routes/publishing');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/publishingResearchPrivet', publishing);

// Serve static files from the frontend directory
const frontendDirectoryPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendDirectoryPath));

app.get('/pageToGoToWhenUploadingResearchDetail', (req, res) => {
  res.sendFile(path.join(frontendDirectoryPath, 'pageToGoToWhenUploadingResearchDetails.html'));
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});