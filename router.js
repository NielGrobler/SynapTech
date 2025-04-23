import express from 'express';
import passport from 'passport';
import GoogleStrategy from 'passport-google-oauth20';
import ORCIDStrategy from 'passport-orcid';
import session from 'express-session';
import path from 'path';
import fs from 'fs';
import https from 'https';
import dotenv from 'dotenv';
import url from 'url';

/* Database imports */
import db from './db/db.js';

// Configure .env
dotenv.config();

// For convenience, as these don't exist in ES modules.
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express();
const port = process.env.PORT || 3000;

/* For HTML form */
router.use(express.urlencoded({ extended: true }));
// Start router session
router.use(
	session({
		secret: process.env.SESSION_SECRET,
		resave: false,
		saveUninitialized: true
	})
);

// Initialize passport.js and link to express.js
router.use(passport.initialize());
router.use(passport.session());

// Specify public directory for express.js
router.use(express.static(path.join(__dirname, 'public')));

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
router.get('/auth/google', passport.authenticate('google', {
	scope: ['profile', 'email'],
}));

router.get('/auth/google/callback',
	passport.authenticate('google', { failureRedirect: '/' }),
	(req, res) => {
		res.redirect('/home');
	}
);

const authenticateRequest = (req) => {
	if (process.env.AUTH_TESTING === true) {
		return true;
	}

	return req.isAuthenticated();
}

/* Normal Routes */
router.get('/home', (req, res) => {
	if (!authenticateRequest(req)) {
		res.status(403).send(`<h1>Forbidden</h1>`);
		return;
	}

	res.redirect('/dashboard');
});

router.get('/dashboard', (req, res) => {
	if (!authenticateRequest(req)) {
		res.status(403).send(`<h1>Forbidden</h1>`);
		return;
	}

	res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

router.get('/auth/orcid', passport.authenticate('orcid'));

router.get('/auth/orcid/callback',
	passport.authenticate('orcid', { failureRedirect: '/' }), (req, res) => {
		res.redirect('/home');
	}
);

// Default route
router.get('/', (req, res) => {
	if (!authenticateRequest(req)) {
		res.redirect('/login');
		return;
	}

	res.redirect('/dashboard');
});

router.get('/login', (req, res) => {
	res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Logout
router.get('/logout', (req, res, next) => {
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
router.get('/create/project', (req, res) => {
	if (authenticateRequest(req)) {
		res.sendFile(path.join(__dirname, "public", "addProject.html"));
	} else {
		res.status(403).send(`<h1>Forbidden</h1>`);
	}
});

// Search public projects
router.get('/view/public', (req, res) => {
	if (authenticateRequest(req)) {
		res.sendFile(path.join(__dirname, "public", "searchPublicProjects.html"));
	} else {
		res.status(403).send(`<h1>Forbidden</h1>`);
	}
});

router.get('/view/project', (req, res) => {
	if (!authenticateRequest(req)) {
		res.status(403).send(`<h1>Forbidden</h1>`);
		return;
	}

	res.sendFile(path.join(__dirname, "public", "viewProject.html"));
});

// Settings page
router.get('/settings', (req, res) => {
	if (authenticateRequest(req)) {
		res.sendFile(path.join(__dirname, "public", "settings.html"));
	} else {
		res.status(401).json({ error: 'Not authenticated' });
	}
});

/* API Routing */
router.get('/api/user/info', (req, res) => {
	if (authenticateRequest(req)) {
		res.json(req.user);
	} else {
		res.status(401).json({ error: 'Not authenticated' });
	}
});

const authenticatedForView = (project, user) => {
	if (project.is_public || user.id === project.created_by_account_id) {
		return true;
	}

	return project.collaborators.some(collaborator => collaborator.account_id === user.id);
}

// Route for when users want to fetch a specific project (based on id)
router.get('/api/project', async (req, res) => {
	if (!authenticateRequest(req)) {
		res.status(401).json({ error: 'Bad Request.' });
		return;
	}

	const { id } = req.query;
	if (!id) {
		res.status(400).json({ error: "Bad Request." });
		return;
	}

	const project = await db.fetchProjectById(id);

	if (!project) {
		res.json(null);
		return;
	}

	if (!authenticatedForView(project, req.user)) {
		res.status(400).json({ error: "Cannot view project." });
		return;
	}

	res.json(project);
});

router.get('/api/search/project', async (req, res) => {
	if (!authenticateRequest(req)) {
		res.status(401).json({ error: 'Not authenticated' });
		return;
	}

	const { projectName } = req.query;
	if (!projectName || typeof projectName !== "string") {
		res.status(400).json({ error: "Bad Request." });
		return;
	}

	res.json(await db.searchProjects(projectName));
});

router.get('/api/user/project', async (req, res) => {
	if (!authenticateRequest(req)) {
		res.status(401).json({ error: 'Not authenticated' });
		return;
	}

	let projects = await db.fetchAssociatedProjects(req.user);
	await db.appendCollaborators(projects);

	res.json(projects);
});

/* Posts */
router.post('/create/project', async (req, res) => {
	if (!authenticateRequest(req)) {
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

router.post('/remove/user', async (req, res) => {
	if (!authenticateRequest(req)) {
		res.status(401).json({ error: 'Not authenticated' });
		return;
	}

	if (!req.body) {
		let reqToDeleteId = req.user.id;
		console.log(req.user.id);
		if (!req.user.is_admin && req.user.id !== reqToDeleteId) {
			res.status(400).send("Fwuhhh Error deleting account.");
			return;
		}

		try {
			await db.deleteUser(reqToDeleteId);
			res.send("Account deletion succesful");
		} catch (err) {
			console.log('zxczcxzqwdiuqhdihwq');
			console.log(err);
			res.status(400).json({ error: err });
		}
		return;
	}

	console.log(req.body);
	const { reqToDeleteId } = req.body;

	if (!req.user.is_admin && req.user.id !== reqToDeleteId) {
		res.status(400).send("Error deleting account.");
		return;
	}

	try {
		await db.deleteUser(reqToDeleteId);
		res.send("Account deletion succesful");
	} catch (err) {
		res.status(400).json({ error: err });
	}
});

router.post('suspend/user', async (req, res) => {

});

export default router;
