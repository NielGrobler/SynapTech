const express = require('express');
const path = require('path');
const app = express();

app.get('/homepage', (req, res) => {
  res.sendFile(path.join(__dirname, 'homepage.html'));
});

app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, 'profile.html'));
});

app.get('/search', (req, res) => {
  res.sendFile(path.join(__dirname, 'search.html'));
});

app.get('/projects', (req, res) => {
  res.sendFile(path.join(__dirname, 'projects.html'));

});

app.get('/collab', (req, res) => {
  res.sendFile(path.join(__dirname, 'collab.html'));
});

app.get('/settings', (req, res) => {
  res.sendFile(path.join(__dirname, 'settings.html'));
});

app.get('/settings.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'settings.js'));
});

app.get('/collab.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'collab.js'));
});

app.get('/projects.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'projects.js'));
});

app.get('/homepage.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'homepage.js'));
});

app.get('/profile.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'profile.js'));
});

app.get('/search.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'search.js'));
});

app.get('/logout', (req, res) => {
  res.redirect('/homepage');
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
