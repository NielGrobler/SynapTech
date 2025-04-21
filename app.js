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


/* Database imports */
const db = require('./db/db.js');

/*
 * TODO:
 * - Add seperate functionality for signup and login, will rerequire specifying more redirect URI's
 * - Add ORCID support, redirect URI's for ORCID not yet setup.
 * - Use with mock Azure database. The database is setup, will just need to write queries, preferably in a seperate file.
 * - Don't forget to notify group of .env file and add all group members as test users.
 */

const app = express();
const port = process.env.PORT || 3000;

/* For HTML form */
app.use(express.urlencoded({ extended: true }));
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

/* passport.js Strategies */

// Specify strategy for how to handle Google Authentication
passport.use(new GoogleStrategy({
	clientID: process.env.GOOGLE_CLIENT_ID,
	clientSecret: process.env.GOOGLE_CLIENT_SECRET,
	callbackURL: process.env.GOOGLE_CALLBACK_URL,
}, async (token, tokenSecret, profile, done) => {
	try {
		const user = {
			id: profile.id,
			name: profile.displayName,
			source: 'Google',
		};

		const existingUser = await db.getUserByGUID(user.id);
		if (!existingUser) {
			// new user
			await db.createUser(user);
		}

		return done(null, user);
	} catch (err) {
		console.error("Error in GoogleStrategy: ", err);
		return done(err);
	}
}));

// Specify strategy for how to handle Orcid Authentication
passport.use(new ORCIDStrategy({
	clientID: process.env.ORCID_CLIENT_ID,
	clientSecret: process.env.ORCID_CLIENT_SECRET,
	callbackURL: process.env.ORCID_CALLBACK_URL,
	passReqToCallback: true
}, async (req, accessToken, refreshToken, profile, done) => {
	try {
		const user = {
			id: profile.orcid,
			name: profile.name,
			source: 'Orcid',
		};

		const existingUser = await db.getUserByGUID(user.id); // THIS LINE NEEDS TO BE MODIFIED
		if (!existingUser) {
			await db.createUser(user);
		}

		return done(null, user);
	} catch (err) {
		console.error("Error in OrcidStrategy: ", err);
		return done(err);
	}
}));

passport.serializeUser((user, done) => {
	done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
	try {
		const user = await db.getUserByGUID(id);
		if (!user) {
			return done(null, false);
		}
		done(null, user);
	} catch (err) {
		done(err, null);
	}
});

/* Routes */

/* Authorization routes */
app.get('/auth/google', passport.authenticate('google', {
	scope: ['profile', 'email'],
}));

app.get('/auth/google/callback',
	passport.authenticate('google', { failureRedirect: '/' }), (req, res) => {
		res.redirect('/home');
	}
);

/* Normal Routes */
app.get('/home', (req, res) => {
	if (req.isAuthenticated()) {
		res.sendFile(path.join(__dirname, "public", "dashboard.html"));
	} else {
		res.status(403).send(`<h1>Forbidden</h1>`);
	}
});

app.get('/dashboard', (req, res) => {
	if (req.isAuthenticated()) {
		res.sendFile(path.join(__dirname, "public", "dashboard.html"));
	} else {
		res.status(403).send(`<h1>Forbidden</h1>`);
	}
});

app.get('/auth/orcid', passport.authenticate('orcid'));

app.get('/auth/orcid/callback',
	passport.authenticate('orcid', { failureRedirect: '/' }), (req, res) => {
		res.redirect('/home');
	}
);

// Default route
app.get('/', (req, res) => {
	if (req.isAuthenticated()) {
		res.sendFile(path.join(__dirname, "public", "dashboard.html"));
	} else {
		res.sendFile(path.join(__dirname, "public", "signup.html"));
	}
});

// Logout
app.get('/logout', (req, res, next) => {
	req.logout(function(err) {
		if (err) { return next(err); }

		req.session.destroy((err) => {
			if (err) {
				console.log('Error destroying session during logout:', err);
			}
			res.redirect('/');
		});
	});
});

// Create project
app.get('/create/project', (req, res) => {
	if (req.isAuthenticated()) {
		res.sendFile(path.join(__dirname, "public", "addProject.html"));
	} else {
		res.status(403).send(`<h1>Forbidden</h1>`);
	}
});

// Search public projects
app.get('/view/public', (req, res) => {
	if (req.isAuthenticated()) {
		res.sendFile(path.join(__dirname, "public", "searchPublicProjects.html"));
	} else {
		res.status(403).send(`<h1>Forbidden</h1>`);
	}
});

app.get('/view/project', (req, res) => {
	if (!req.isAuthenticated()) {
		res.status(403).send(`<h1>Forbidden</h1>`);
		return;
	}

	res.sendFile(path.join(__dirname, "public", "viewProject.html"));
});

// Settings page
app.get('/settings', (req, res) => {
	if (req.isAuthenticated()) {
		res.sendFile(path.join(__dirname, "public", "settings.html"));
	} else {
		res.status(401).json({ error: 'Not authenticated' });
	}
});

app.get('/api/user/info', (req, res) => {
	if (req.isAuthenticated()) {
		res.json(req.user);
	} else {
		res.status(401).json({ error: 'Not authenticated' });
	}
});

app.get('/api/user/project', async (req, res) => {
	if (!req.isAuthenticated()) {
		res.status(401).json({ error: 'Not authenticated' });
		return;
	}

	let projects = await db.fetchAssociatedProjects(req.user);
	await db.appendCollaborators(projects);

	res.json(projects);
});

app.post('/create/project', async (req, res) => {
	if (!req.isAuthenticated()) {
		res.status(401).json({ error: 'Not authenticated' });
		return;
	}

	const { projectName, description, field, visibility } = req.body;

	const project = {
		name: projectName,
		description,
		field,
		isPublic: visibility === 'public',
	};

	try {
		await db.createProject(project, req.user);
		res.status(201).json({ message: 'Project posted!', project });
	} catch (err) {
		res.status(400).json({ error: err });
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
