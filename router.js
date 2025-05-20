import express from 'express';
import passport from 'passport';
import GoogleStrategy from 'passport-google-oauth20';
import ORCIDStrategy from 'passport-orcid';
import session from 'express-session';
import * as path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { getDirname } from './dirname.js';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import db from './db/db.js';
import { FileStorageClient } from './db/connectionInterfaces.js';

// Configure .env
dotenv.config();
if (!process.env.SESSION_SECRET) {
	throw new Error('SESSION_SECRET is not set. Check your .env or CI environment variables.');
}

// For convenience, as these don't exist in ES modules.
let __dirname;
try {
  const __filename = fileURLToPath(import.meta.url);
  __dirname = path.dirname(__filename);
} catch (err) {
  try {
	__dirname = getDirname(import.meta);
  } catch (e) {
	__dirname = '/'; // fallback for test/browser envs
  }
}

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

router.use(express.json());

// Initialize passport.js and link to express.js
router.use(passport.initialize());
router.use(passport.session());

// Specify public directory for express.js
//router.use(express.static(path.join(__dirname, 'public')));

// Prevent direct access to html pages and move access to javascript pages to send from src
router.use((req, res, next) => {
	if (req.url.endsWith('.html')) {
		return res.redirect('/forbidden');
	}

	if (req.url.endsWith('.js')) {
		return res.sendFile(path.join(__dirname, "src", req.url));
	}

	next();
});


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
router.use(express.json());

/* Health Check */
router.get('/ping', (req, res) => res.send('pong'));

/* GET Request Routing */
router.get('/forbidden', (req, res) => {
	console.log("Redirecting to /forbidden");
	res.status(403).sendFile(path.join(__dirname, "public", "forbidden.html"));
});

router.get('/collaboration', (req, res) => {
	if (!authenticateRequest(req)) {
		return res.redirect('/forbidden');
	}
	console.log("Redirecting to /collaboration");
	res.sendFile(path.join(__dirname, "public", "viewCollaborationRequests.html"));
});

/* Authorization routes */
router.get('/auth/google', passport.authenticate('google', {
	scope: ['profile', 'email'],
}));

router.get('/auth/google/callback',
	passport.authenticate('google', { failureRedirect: '/' }),
	(req, res) => {
		const token = jwt.sign(
			{ id: req.user.id, name: req.user.name },
			process.env.SESSION_SECRET,
			{ expiresIn: '1h' }
		);

		console.log("Redirecting to /dashboard");
		res.redirect(`/dashboard`);
	}
);

export const authenticateRequest = (req) => {
	return typeof req.isAuthenticated === 'function' ? req.isAuthenticated() : false;
};
export const isSuspended = async (req) => {
	const result = await db.isSuspended(req.user.id);
	return result[0].is_suspended;
};

const requireAuthentication = (callback, opts = {}) => {
	return async (req, res) => {
		if (!authenticateRequest(req)) {
			if (opts.statusCode) { //should allow custom status codes, hopefully
				return res.sendStatus(opts.statusCode);
			}
			return res.redirect('/forbidden');
		}

		await callback(req, res);
	}
}

/* Normal Routes */
router.get('/dashboard', requireAuthentication((req, res) => {
	res.sendFile(path.join(__dirname, "public", "dashboard.html"));
}));

router.get('/styles.css', (req, res) => {
	res.sendFile(path.join(__dirname, 'public', 'styles.css'));
});

router.get('/message_style.css', (req, res) => {
	res.sendFile(path.join(__dirname, 'public', 'message_style.css'));
});

router.get('/auth/orcid', passport.authenticate('orcid'));

router.get('/auth/orcid/callback',
	passport.authenticate('orcid', { failureRedirect: '/' }),
	(req, res) => {
		const token = jwt.sign(
			{ id: req.user.id, name: req.user.name },
			process.env.SESSION_SECRET,
			{ expiresIn: '1h' }
		);

		res.redirect(`/dashboard?token=${token}`);

	}
);

router.get('/', (req, res) => {
	if (!authenticateRequest(req)) {
		return res.redirect('login');
	}

	console.log("Redirecting to /dashboard");
	res.redirect('/dashboard');
});

router.get('/login', (req, res) => {
	console.log("Redirecting to /login");
	res.sendFile(path.join(__dirname, "public", "login.html"));
});

router.get('/signup', (req, res) => {
	console.log("Redirecting to /signup");
	res.sendFile(path.join(__dirname, "public", "signup.html"));
});

router.get('/logout', (req, res, next) => {
	req.logout(function(err) {
		if (err) { return next(err); }

		req.session.destroy((err) => {
			if (err) {
				console.err('Error destroying session during logout:', err);
			}
			console.log("Redirecting to /login");
			res.redirect('/');
		});
	});
});

router.get('/create/project', requireAuthentication((req, res) => {
	console.log("Redirecting to /create/project");
	res.sendFile(path.join(__dirname, "public", "addProject.html"));
}));

router.get('/view/search', requireAuthentication((req, res) => {
	console.log("Redirecting to /view/search");
	res.sendFile(path.join(__dirname, "public", "search.html"));
}));

router.get('/view/project', requireAuthentication((req, res) => {
	console.log("Redirecting to /view/project");
	res.sendFile(path.join(__dirname, "public", "viewProject.html"));
}));

router.get('/settings', requireAuthentication((req, res) => {
	if (!authenticateRequest(req)) {
		res.status(401).json({ error: 'Not authenticated' });
		return;
	}
	console.log("Redirecting to /settings");
	res.sendFile(path.join(__dirname, "public", "settings.html"));
}, { statusCode: 401 }));

router.get('/invite', requireAuthentication((req, res) => {
	if (!authenticateRequest(req)) {
		res.status(401).json({ error: 'Not authenticated' });
		return;
	}
	console.log("Redirecting to /invite");
	res.sendFile(path.join(__dirname, "public", "invite.html"));
}, { statusCode: 401 }));

router.get('/message', requireAuthentication((req, res) => {
	if (!authenticateRequest(req)) {
		res.status(401).json({ error: 'Not authenticated' });
		return;
	}
	console.log("Redirecting to /message");
	res.sendFile(path.join(__dirname, "public", "messages.html"));
}));

router.get('/reviewProject', (req, res) => {
	if (!authenticateRequest(req)) {
		return res.redirect('/forbidden');
	}
	console.log("Redirecting to /reviewProject");
	res.sendFile(path.join(__dirname, "public", "reviewProject.html"));
});

router.get('/analyticsDashboard', (req, res) => {
	if (!authenticateRequest(req)) {
		return res.redirect('/forbidden');
	}
	console.log("Redirecting to /analyticsDashboard");
	res.sendFile(path.join(__dirname, "public", "analyticsDashboard.html"));
});

router.get('/successfulReviewPost', requireAuthentication((req, res) => {
	console.log("Redirecting to /successfulReviewPost");
	res.sendFile(path.join(__dirname, "public", "successfulReviewPost.html"));
}));

router.get('/messages', requireAuthentication((req, res) => { //Messages redirects to index.html?
	console.log("Redirecting to /messages");
	res.sendFile(path.join(__dirname, "public", "index.html"));
}));

router.get('/view/users', requireAuthentication((req, res) => {
	res.sendFile(path.join(__dirname, "public", "searchUsers.html"));
}));

router.get('/view/other/profile', (req, res) => {
	if (!authenticateRequest(req)) {
		return res.redirect('/forbidden');
	}
	console.log("Redirecting to /view/other/profile");
	res.sendFile(path.join(__dirname, "public", "viewOtherProfile.html"));
});

router.get('/view/curr/profile', (req, res) => {
	if (!authenticateRequest(req)) {
		return res.redirect('/forbidden');
	}
	console.log("Redirecting to /view/curr/profile");
	res.sendFile(path.join(__dirname, "public", "viewCurrProfile.html"));
});

router.get('/suspended', (req, res) => {
	if (!authenticateRequest(req)) {
		return res.redirect('/forbidden');
	}
	console.log("Redirecting to /suspended");
	res.sendFile(path.join(__dirname, "public", "suspended.html"));
});

/* API Routing */
const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});
const fileStorageClient = new FileStorageClient();

// File upload route
router.post('/api/project/:projectId/upload', upload.single('file'), requireAuthentication(async (req, res) => {
	if (!req.file) {
		return res.status(400).json({ error: 'No file uploaded.' });
	}

	try {
		console.log(req.file);
		const maxSize = 10 * 1024 * 1024;
		if (req.file.size > maxSize) {
			return res.status(400).json({ error: 'File size exceeds the 10MB limit.' });
		}

		const projectId = req.params.projectId;
		const mayUpload = await db.mayUploadToProject(projectId, req.user.id);
		if (!mayUpload) {
			return res.status(400).json({ error: 'Not authorized for upload to this project.' });
		}


		const fileBuffer = req.file.buffer;
		const filename = req.file.originalname;
		await db.uploadToProject(projectId, fileBuffer, filename);

		return res.status(200).json({ message: 'File uploaded successfully' });
	} catch (error) {
		console.error('Error uploading file:', error);
		return res.status(500).json({ error: error.message });
	}
}));

router.get('/api/project/:projectId/file/:fileId/:ext', requireAuthentication(async (req, res) => {
	try {
		const projectId = req.params.projectId;
		const fileId = req.params.fileId;
		const ext = req.params.ext;
		const mayAccess = await db.mayAccessProject(projectId, req.user.id);
		if (!mayAccess) {
			return res.status(403).json({ error: "cannot access project" });
		}

		const result = await db.downloadFile(fileId, ext);
		res.send(result.buffer);
	} catch (err) {
		res.json({ error: err.message || err.toString() });
	}
}));

router.get('/api/project/:projectId/files', requireAuthentication(async (req, res) => {
	try {
		const projectId = req.params.projectId;
		const mayAccess = await db.mayAccessProject(projectId, req.user.id);
		if (!mayAccess) {
			return res.status(403).json({ error: "cannot access project" });
		}

		const result = await db.getProjectFiles(projectId);
		res.json(result);
	} catch (err) {
		res.json({ error: err.message || err.toString() });
	}
}));

router.get('/api/user/info', requireAuthentication((req, res) => {
	if (!authenticateRequest(req)) {
		res.status(401).json({ error: 'Not authenticated' });
		return;
	}

	res.json(req.user);
}, { statusCode: 401 }));

router.post('/api/collaboration/invite', requireAuthentication(async (req, res) => {
	try {
		const { projectId, accountId, role } = req.body;
		if (!projectId || !accountId || !role) {
			return res.status(400).json({ error: 'missing required fields: projectId, accountId and role are required.' });
		}

		const validRoles = ['Reviewer', 'Researcher'];

		if (!validRoles.includes(role)) {
			return res.status(400).json({ error: `invalid role. Role must be one of the following: ${validRoles.join(', ')}.` });
		}

		if (isNaN(projectId)) {
			return res.status(400).json({ error: 'projectId must be a number.' });
		}

		if (isNaN(accountId)) {
			return res.status(400).json({ error: 'accountId must be a number.' });
		}

		const canInvite = await db.canInvite(accountId, projectId);
		if (!canInvite) {
			return res.status(400).json({ error: 'cannot invite this user.' });
		}

		const alreadyInvited = await db.alreadyInvited(accountId, projectId);
		if (!alreadyInvited) {
			return res.status(400).json({ error: 'Already invited this user.' });
		}

		await db.sendCollabInvite(accountId, projectId, role);

		return res.status(200).json({ message: 'Collaboration invite sent successfully' });
	} catch (err) {
		return res.status(500).json({ error: 'Internal Error' });
	}
}));

router.get('/api/collaboration/invites', requireAuthentication(async (req, res) => {
	try {
		const userId = req.user.id;
		const result = await db.getPendingCollabInvites(userId);
		return res.json(result);
	} catch (err) {
		console.error(err);
		return res.status(400).json({ error: 'bad request' });
	}
}));

router.post('/api/collaboration/invite/reply', requireAuthentication(async (req, res) => {
	try {
		const { projectId, role, isAccept } = req.body;
		if (!projectId || !role) {
			return res.status(400).json({ error: 'missing required fields: projectId, accountId and role are required.' });
		}

		const validRoles = ['Reviewer', 'Researcher'];

		if (!validRoles.includes(role)) {
			return res.status(400).json({ error: `invalid role. Role must be one of the following: ${validRoles.join(', ')}.` });
		}

		if (isNaN(projectId)) {
			return res.status(400).json({ error: 'projectId must be a number.' });
		}

		await db.replyToCollabInvite(isAccept, req.user.id, projectId, role);

		return res.status(200).json({ message: 'Collaboration invite sent successfully' });
	} catch (err) {
		console.log(err);
		return res.status(500).json({ error: 'Internal Error' });
	}
}));

router.get('/api/user/projectNames', requireAuthentication(async (req, res) => {
	let projects = await db.fetchAssociatedProjectsByLatest(req.user);
	res.json(projects);
}));

const authenticatedForView = (project, user) => {
	if (project.is_public || user.id === project.created_by_account_id) {
		return true;
	}

	return project.collaborators.some(collaborator => collaborator.account_id === user.id);
}

// For when a user accepts a request to collaborate on a project
router.put('/api/accept/collaborator', requireAuthentication(async (req, res) => {
	const { userId, projectId } = req.body;
	if (!userId || !projectId) {
		return res.status(400).json({ error: 'Bad Request.' });
	}

	const permittedToAccept = await db.permittedToAcceptCollaborator(req.user, userId, projectId);

	if (!permittedToAccept) {
		return res.status(400).json({ error: 'Bad Request.' });
	}

	try {
		await db.acceptCollaborator(userId, projectId);
		res.send('Successful');
	} catch (err) {
		res.status(400).json({ error: 'Error.' });
	}
}));

router.delete('/api/reject/collaborator', requireAuthentication(async (req, res) => {
	const { userId, projectId } = req.body;
	if (!userId || !projectId) {
		return res.status(400).json({ error: 'Bad Request.' });
	}

	const permittedToReject = await db.permittedToRejectCollaborator(req.user, userId, projectId);

	if (!permittedToReject) {
		return res.status(400).json({ error: 'Bad Request.' });
	}

	try {
		await db.removeCollaborator(userId, projectId);
		res.send('Successful');
	} catch (err) {
		res.status(400).json({ error: 'Error.' });
	}
}));

// Route for when users want to fetch a specific project (based on id)
router.get('/api/project', requireAuthentication(async (req, res) => {
	if (!authenticateRequest(req)) {
		res.status(401).json({ error: 'Not authenticated' });
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
}, { statusCode: 401 }));


// Route for when users want to view a specific user (based on site id)
router.get('/api/user', async (req, res) => {
	if (!authenticateRequest(req)) {
		res.status(401).json({ error: 'Bad Request.' });
		return;
	}

	const { id } = req.query;
	if (!id) {
		res.status(400).json({ error: "Bad Request." });
		return;
	}

	const user = await db.fetchUserById(id);

	if (!user) {
		res.json(null);
		return;
	}

	res.json(user);
});


router.get('/api/search/project', requireAuthentication(async (req, res) => {
	const { projectName } = req.query;
	if (!projectName || typeof projectName !== "string") {
		res.status(400).json({ error: "Bad Request." });
		return;
	}

	res.json(await db.searchProjects(projectName));

}));

router.get('/api/user/project', requireAuthentication(async (req, res) => {
	let projects = await db.fetchAssociatedProjects(req.user);
	await db.appendCollaborators(projects);

	res.json(projects);
}));

router.get('/api/other/project', async (req, res) => {
	if (!authenticateRequest(req)) {
		return res.status(401).json({ error: 'Not authenticated' });
	}


	let { id } = req.query;
	if (!id) {
		return res.status(400).json({ error: 'Missing user id' });
	}
	let projects = await db.fetchPublicAssociatedProjects(id);

	res.json(projects);
});

router.get('/api/collaborator', requireAuthentication(async (req, res) => {
	let pending_collaborators = await db.fetchPendingCollaborators(req.user);
	res.json(pending_collaborators);
}));

router.get('/api/reviews', requireAuthentication(async (req, res) => {
	const projectId = req.query.projectId;
	const page = parseInt(req.query.page) || 1;
	const limit = parseInt(req.query.limit) || 10;
	const offset = (page - 1) * limit;

	try {
		const reviews = await db.getProjectReviews(projectId, limit, offset);
		const totalCount = await db.getReviewCount(projectId);

		res.json({
			reviews: reviews,
			totalCount: totalCount
		});
	} catch (err) {
		console.error('Error fetching reviews:', err);
		res.status(500).json({ error: 'Failed to fetch reviews' });
	}
}));

/* POST Request Routing */
router.post('/create/project', requireAuthentication(async (req, res) => {
	const { projectName, description, field, visibility } = req.body;

	const project = {
		name: projectName,
		description,
		field,
		isPublic: visibility === 'public',
	};

	try {
		await db.createProject(project, req.user);
		res.sendFile(path.join(__dirname, "public", "successfulProjectPost.html"));
	} catch (err) {
		res.sendFile(path.join(__dirname, "public", "failureProjectPost.html"));
	}
}));

router.post('/api/collaboration/request', requireAuthentication(async (req, res) => {
	const { projectId } = req.body;
	if (!projectId || typeof projectId !== 'number') {
		return res.status(400).send("Bad Request");
	}

	try {
		await db.insertPendingCollaborator(req.user.id, projectId);
		res.send('Successfully sent collobaroration request.');
	} catch (err) {
		res.status(400).json({ error: 'Failed' });
	}
}));

router.post('/remove/user', requireAuthentication(async (req, res) => {
	if (!req.body) {
		let reqToDeleteId = req.user.id;
		if (!req.user.is_admin && req.user.id !== reqToDeleteId) {
			res.status(400).send("Error deleting account.");
			return;
		}

		try {
			await db.deleteUser(reqToDeleteId);
			res.send("Account deletion succesful");
		} catch (err) {
			console.error(err);
			res.status(400).json({ error: err });
		}
		return;
	}

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
}));

//Reviews Page
router.post('/api/review', requireAuthentication(async (req, res) => {
	if (!req.body || !req.body.projectId || !req.body.rating || !req.body.comment) {
		return res.status(400).json({ error: "Missing required fields" });
	}

	const { projectId, rating, comment } = req.body;

	try {
		await db.createReview({
			project_id: parseInt(projectId),
			reviewer_id: req.user.id,
			rating: parseInt(rating),
			comment
		});

		res.status(201).json({
			message: 'Review submitted!',
			redirect: '/successfulReviewPost'
		});
	} catch (err) {
		console.error('Error creating review:', err);
		res.status(500).json({ error: 'Failed to submit review', details: err.message });
	}
}));

//Searching for users 
router.get('/api/search/user', async (req, res) => {
	if (!authenticateRequest(req)) {
		res.status(401).json({ error: 'Not authenticated' });
		return;
	}

	const { userName } = req.query;
	if (!userName || typeof userName !== "string") {
		res.status(400).json({ error: "Bad Request." });
		return;
	}

	res.json(await db.searchUsers(userName));
});

//Suspends an account
router.put('/suspend/user', async (req, res) => {
	if (!authenticateRequest(req)) {
		return res.redirect('/forbidden');
	}

	const userId = req.body.id;

	try {
		const suspend = await db.suspendUser(userId);

		res.status(201).json({
			message: "User's Status changed!",
		});
	} catch (err) {
		console.error('Error suspending user:', err);
		res.status(500).json({ error: 'Failed to suspend user', details: err.message });
	}
});

//Checks if user is an administrator
router.get('/admin', async (req, res) => {
	let user = req.user.id;
	let admin = await db.is_Admin(user);
	return res.json(admin);
});

router.get('/isSuspended', requireAuthentication(async (req, res) => {
	try {
		const { id } = req.query
		const result = await db.isSuspended(id);
		return res.json(result[0].is_suspended);
	} catch (err) {
		console.error('Error checking if user suspended:', err);
	}
}));

//Put request to update profile
router.put('/update/profile', async (req, res) => {
	if (!authenticateRequest(req)) {
		res.status(401).json({ error: 'Not authenticated' });
		return;
	}

	const params = req.body;

	res.json(await db.updateProfile(params));
});

/* PUT Request Routing */
router.put('user/details', requireAuthentication(async (req, res) => {
	const { name, bio } = req.body;
}));

/*router.use((err, req, res, next) => {
  console.error('Express error:', err);
  res.status(500).send('Internal Server Error');
});
*/

export default router;
