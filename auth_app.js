const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const ORCIDStrategy = require('passport-orcid').Strategy;
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
require('dotenv').config();

/*
 * TODO:
 * - Add seperate functionality for signup and login, will rerequire specifying more redirect URI's
 * - Add ORCID support, redirect URI's for ORCID not yet setup.
 * - Use with mock Azure database. The database is setup, will just need to write queries, preferably in a seperate file.
 * - Don't forget to notify group of .env file and add all group members as test users.
 */

const app = express();
const port = process.env.PORT || 3000;

// Start app session
app.use(
	session({ 
		secret: process.env.SESSION_SECRET, 
		resave: false, 
		saveUninitialized: true 
	})
);

// Initialize passport.js and link to express.js
app.use(passport.initialize());
app.use(passport.session());

// Specify public directory for express.js
app.use(express.static(path.join(__dirname, 'public')));



// Specify strategy for how to handle Google Authentication
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL,
}, async (token, tokenSecret, profile, done) => {
  const user = { id: profile.id, name: profile.displayName, email: profile.emails[0].value };
  return done(null, user);
}));

// Specify strategy for how to handle Orcid Authentication
passport.use(new ORCIDStrategy({
  clientID: process.env.ORCID_CLIENT_ID,
  clientSecret: process.env.ORCID_CLIENT_SECRET,
  callbackURL: process.env.ORCID_CALLBACK_URL,
  passReqToCallback: true
}, async (req, accessToken, refreshToken, profile, done) => {
  const user = { id: profile.orcid, name: profile.name, email: profile.email };
  return done(null, user);
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  done(null, { id });
});

/* Routes */
app.get('/auth/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
}));

app.get('/auth/google/callback', 
	passport.authenticate('google', { failureRedirect: '/' }), (req, res) => {
		res.redirect('/home');
	}
);

app.get('/home', (req, res) => {
	if (req.isAuthenticated()) {
		res.sendFile(path.join(__dirname, "public", "dashboard.html"));
	} else {
		res.send(`<h1>Forbidden</h1>`);
	}
});

app.get('/auth/orcid', passport.authenticate('orcid'));

app.get('/auth/orcid/callback', passport.authenticate('orcid', { failureRedirect: '/' }), (req, res) => {
	res.redirect('/home');
});

// Default route
app.get('/', (req, res) => {
	if (req.isAuthenticated()) {
		console.log("This is fine!");
		res.sendFile(path.join(__dirname, "public", "dashboard.html"));
	} else {
		res.sendFile(path.join(__dirname, "public", "signup.html"));
	}
});

/* Create and start HTTPS server */

// Set ssl options
const sslOptions = {
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.cert')
};

// Create HTTPS server
https.createServer(sslOptions, app).listen(port, () => {
  console.log(`HTTPS server running at https://localhost:${port}`);
});
