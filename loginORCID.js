const express = require('express');
const axios = require('axios');
const app = express();
const port = 3000;

const CLIENT_ID = 'APP-3I8F4OWN73DJB46C';  
const CLIENT_SECRET = '007072fe-49dd-4410-ac42-bf7e71135c1b';  
const REDIRECT_URI = 'http:127.0.0.1:550/signedUp.html';

app.use(express.static('public'));

// 1. Redirect user to ORCID login
app.get('/login', (req, res) => {
  const authUrl = `https://orcid.org/oauth/authorize?client_id=${CLIENT_ID}&response_type=code&scope=/authenticate&redirect_uri=${REDIRECT_URI}`;
  res.redirect(authUrl);
});

// 2. ORCID redirects here after login
app.get('/callback', async (req, res) => {
  const code = req.query.code;

  try {
    const response = await axios.post('https://orcid.org/oauth/token', null, {
      params: {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI
      },
      headers: {
        'Accept': 'application/json'
      }
    });

    const accessToken = response.data.access_token;
    const orcid = response.data.orcid;

    res.send(`Logged in as ORCID iD: ${orcid}`);
  } catch (error) {
    console.error(error.response.data);
    res.send('Error during OAuth');
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});













