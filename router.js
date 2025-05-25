import express from 'express';
import passport from 'passport';
import GoogleStrategy from 'passport-google-oauth20';
import ORCIDStrategy from 'passport-orcid';
import session from 'express-session';
import * as path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
//import { getDirname } from './dirname.js';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { ValidationError, AuthorizationError, DownloadError, UploadError, BadUploadTypeError } from './errors.js';

/* Database imports */
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
	__dirname = '/'; // fallback for test/browser envs
}

const router = express();

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
		res.redirect(`/dashboard?token=${token}`);
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
router.get('/', (req, res) => {
	if (!authenticateRequest(req)) {
		return res.redirect('/login');
	}
	res.redirect('/dashboard');
});


router.get('/styles.css', (req, res) => {
	res.sendFile(path.join(__dirname, 'public', 'styles.css'));
});

router.get('/message_style.css', (req, res) => {
	res.sendFile(path.join(__dirname, 'public', 'message_style.css'));
});

router.get('/collaboration', requireAuthentication((req, res) => {
	console.log("Redirecting to /collaboration");
	res.sendFile(path.join(__dirname, "public", "viewCollaborationRequests.html"));
}));

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

router.get('/dashboard', requireAuthentication(async (req, res) => {

	const result = await isSuspended(req);
	if (result) {
		return res.redirect('/suspended');
	}
	console.log("Redirecting to /dashboard");
	res.sendFile(path.join(__dirname, "public", "dashboard.html"));
}));

router.get('/login', (req, res) => {
	console.log("Redirecting to /login");
	res.sendFile(path.join(__dirname, "public", "login.html"));
});

router.get('/signup', (req, res) => {
	console.log("Redirecting to /signup");
	res.sendFile(path.join(__dirname, "public", "signup.html"));
});

router.get('/logout', (req, res, next) => {
	req.logout(function (err) {
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
	res.sendFile(path.join(__dirname, "public", "messages.html"));
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

const isValidNumId = (id) => {
	const parsedId = Number(id);
	return Number.isInteger(parsedId) && parsedId >= 0;
};

const isValidUUID = (uuid) => {
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	return uuidRegex.test(uuid);
}

const expectValidNumId = (id, msg = 'Expected a valid numerical id.') => {
	if (!isValidNumId(id)) {
		throw new ValidationError(msg);
	}
}

const expectValidUuid = (id, msg = 'Expected a valid UUID') => {
	if (!isValidUUID(id)) {
		throw new ValidationError(msg);
	}
}

const makeSafeHandler = (handler) => {
	return async (req, res) => {
		if (!authenticateRequest(req)) {
			return res.status(401).json({ error: 'Authentication required' });
		}
		try {
			await handler(req, res)
		} catch (err) {
			if (process.env.DEBUG) {
				console.error("Stack trace:", err.stack);
				console.error("Error message:", err.message);
			}

			if (err instanceof ValidationError) {
				return res.status(400).json({ error: err.message, details: err.details });
			}

			if (err instanceof AuthorizationError) {
				return res.status(403).json({ error: err.message, details: err.details });
			}

			if (err instanceof BadUploadTypeError) {
				return res.status(415).json({ error: err.message, details: err.details });
			}

			if (err instanceof UploadError || err instanceof DownloadError) {
				console.error(err.statusCode);
				return res.status(err.statusCode).json({ error: err.message, details: err.details });
			}

			return res.status(500).json({ error: "Internal server error" });
		}
	}
}

const expectForValid = (isValidCondition, msgOnFalse) => {
	if (!isValidCondition) {
		throw new ValidationError(msgOnFalse);
	}
}

const expectForAuth = (isAuthCondition, msgOnFalse = "Not authorized for this action.") => {
	if (!isAuthCondition) {
		throw new AuthorizationError(msgOnFalse);
	}
}

const transformOrThrow = (str, name, maxLength = 512) => {
	if (typeof str !== 'string') {
		throw new ValidationError(`Expected argument ${name} to be a string.`);
	}
	str = str.trim();
	if (str.length > maxLength) {
		throw new ValidationError(`Argument ${name} is too long.`);

	}

	if (str.length === 0) {
		throw new ValidationError(`Argument ${name} was blank or empty.`);
	}

	return str;
}

router.get('/api/funding/opportunities', makeSafeHandler(async (req, res) => {
	const result = await db.getFundingOpportunities();
	return res.status(200).json(result);
}));

router.post('/api/post/funding/request', makeSafeHandler(async (req, res) => {
	const { opportunityId, projectId } = req.body;
	expectValidNumId(opportunityId, 'Expected valid funding opportunity id.');
	expectValidNumId(projectId, 'Expected valid project id.');
	const mayRequest = await db.mayRequestProjectFunding(projectId, req.user.id);
	expectForValid(mayRequest, 'Not authorized to request funding for this project.');
	const hasRequestedAlready = await db.alreadyRequestedFunding(opportunityId, projectId);
	expectForValid(hasRequestedAlready, 'A request for funding from this source is still pending.');
	await db.insertFundingRequest(opportunityId, projectId);
	return res.status(200).json({ message: 'Funding request posted successfully.' });
}));

router.get('/api/project/:projectId/milestones', makeSafeHandler(async (req, res) => {
	console.log("[milestones] Wasting my time");
	const projectId = req.params.projectId;
	expectValidNumId(projectId, 'Expected a valid project id.');

	const mayView = await db.mayViewProject(projectId, req.user.id);
	expectForAuth(mayView);

	const milestones = await db.getMilestones(projectId);
	return res.status(200).json(milestones);
}));

router.post('/api/post/project/:projectId/milestone', makeSafeHandler(async (req, res) => {
	var { name, description } = req.body;
	name = transformOrThrow(name, 'name');
	description = transformOrThrow(description, 'description', 2048);
	const projectId = req.params.projectId;
	expectValidNumId(projectId, 'Expected a valid project id.');

	const mayEdit = await db.mayEditProject(projectId, req.user.id);
	expectForAuth(mayEdit);

	await db.insertMilestone(projectId, name, description);
	return res.status(200).json({ message: 'Milestone posted successfully.' });
}));

router.post('/api/toggle/project/:projectId/milestone', makeSafeHandler(async (req, res) => {
	const projectId = req.params.projectId;
	expectValidNumId(projectId);
	const { milestoneId } = req.body;
	expectValidNumId(milestoneId, 'Expected a valid milestone id.');

	const mayEdit = await db.mayEditProject(projectId, req.user.id);
	expectForAuth(mayEdit);

	await db.toggleMilestone(milestoneId);
	return res.status(200).json({ message: 'Milestone toggled successfully.' });
}));

router.post('/api/funding/:projectId/spend', makeSafeHandler(async (req, res) => {
	const projectId = req.params.projectId;
	expectValidNumId(projectId, "Expected valid project id.")
	const { name, amount } = req.body;
	expectForValid(typeof amount === 'number' && !isNaN(amount) && amount > 0);
	const processedName = transformOrThrow(name);

	const mayEdit = await db.mayEditProject(projectId, req.user.id);
	expectForAuth(mayEdit);

	await db.deductFunding(projectId, amount, processedName);

	return res.status(200).json({ message: 'Funding expenditure made succesfully' });
}));

router.get('/api/funding/:projectId', makeSafeHandler(async (req, res) => {
	const projectId = req.params.projectId;
	expectValidNumId(projectId, "Expected valid project id.")

	const mayView = await db.mayAccessProject(projectId, req.user.id);
	expectForAuth(mayView);

	const result = await db.getProjectFunding(projectId);

	return res.status(200).json(result);
}));

// File upload route
router.post('/api/project/:projectId/upload', upload.single('file'), makeSafeHandler(async (req, res) => {
	expectForValid(req.file, 'No file uploaded.')
	const maxSize = 10 * 1024 * 1024;
	expectForValid(req.file.size <= maxSize, 'File size exceeds the 10MB limit');
	const projectId = req.params.projectId;
	expectValidNumId(projectId);

	const mayUpload = await db.mayUploadToProject(projectId, req.user.id);
	expectForAuth(mayUpload, 'Not authorized for upload to this project.')

	const fileBuffer = req.file.buffer;
	const filename = req.file.originalname;
	await db.uploadToProject(projectId, fileBuffer, filename);

	return res.status(200).json({ message: 'File uploaded successfully' });
}));


router.get('/api/project/:projectId/file/:fileId/:ext', makeSafeHandler(async (req, res) => {
	const projectId = req.params.projectId;
	const fileId = req.params.fileId;
	expectValidNumId(projectId);
	expectValidUuid(fileId);

	const ext = req.params.ext;
	const mayAccess = await db.mayAccessProject(projectId, req.user.id);
	expectForAuth(mayAccess, "Cannot access project.");

	const result = await db.downloadFile(fileId, ext);
	res.send(result.buffer);
}));

router.get('/api/project/:projectId/files', makeSafeHandler(async (req, res) => {
	const projectId = req.params.projectId;
	expectValidNumId(projectId);
	const mayAccess = await db.mayAccessProject(projectId, req.user.id);
	expectForAuth(mayAccess, "May not access project.");
	const result = await db.getProjectFiles(projectId);
	return res.json(result);
}));

router.get('/api/user/info', makeSafeHandler(async (req, res) => {
	const userId = req.user.id;
	expectValidNumId(userId, 'Expected valid account id.')

	const user = await db.fetchUserById(userId);

	return res.json(user);
}));

const expectValidRole = (role) => {
	expectForValid(role, 'Missing role.');
	const validRoles = ['Reviewer', 'Researcher'];
	const invalidRoleMsg = `Invalid role. Role must be one of the following ${validRoles.join(', ')}.`;
	expectForValid(validRoles.includes(role), invalidRoleMsg);
}

router.post('/api/collaboration/invite', makeSafeHandler(async (req, res) => {
	const { projectId, accountId, role } = req.body;

	expectValidRole(role);
	expectValidNumId(projectId, 'Expected valid project id.');
	expectValidNumId(accountId, 'Expected valid account id.');
	expectValidRole(role);

	const canInvite = await db.canInvite(accountId, projectId);
	expectForValid(canInvite, 'Cannot invite this user.');
	const alreadyInvited = await db.alreadyInvited(accountId, projectId);
	expectForValid(alreadyInvited, 'Already invited this user.');
	await db.sendCollabInvite(accountId, projectId, role);
	return res.status(200).json({ message: 'Collaboration invite sent successfully' });
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
}, { statusCode: 401 }));

router.post('/api/collaboration/invite/reply', makeSafeHandler(async (req, res) => {
	const { projectId, role, isAccept } = req.body;
	expectValidNumId(projectId, 'Expected valid project id.');
	expectValidRole(role);

	await db.replyToCollabInvite(isAccept, req.user.id, projectId, role);

	return res.status(200).json({ message: 'Collaboration invite sent successfully' });
}));

router.get('/api/user/projectNames', makeSafeHandler(async (req, res) => {
	let projects = await db.fetchAssociatedProjectsByLatest(req.user.id);
	res.json(projects);
}, { statusCode: 401 }));

const authenticatedForView = (project, user) => {
	if (project.is_public || user.id === project.created_by_account_id) {
		return true;
	}

	return project.collaborators.some(collaborator => collaborator.account_id === user.id);
}

// For when a user accepts a request to collaborate on a project
router.put('/api/accept/collaborator', makeSafeHandler(async (req, res) => {
	const { userId, projectId } = req.body;
	expectValidNumId(userId);
	expectValidNumId(projectId);
	const permittedToAccept = await db.permittedToAcceptCollaborator(req.user, userId, projectId);
	expectForValid(permittedToAccept, 'Not permitted to accept this collaborator.');
	await db.acceptCollaborator(userId, projectId);
	return res.status(200).json({ message: 'Successfully accepted collaborator' });
}));

router.delete('/api/reject/collaborator', makeSafeHandler(async (req, res) => {
	const { userId, projectId } = req.body;
	expectValidNumId(userId, 'Expected valid user id.');
	expectValidNumId(projectId, 'Expected valid project id.');
	const permittedToReject = await db.permittedToRejectCollaborator(req.user, userId, projectId);
	expectForValid(permittedToReject, 'Not permitted to reject this collaborator.');

	await db.removeCollaborator(userId, projectId);
	return res.status(200).json({ message: 'Successfully rejected collaborator' });
}));

// Route for when users want to fetch a specific project (based on id)
//this gives an internal server error
router.get('/api/project', makeSafeHandler(async (req, res) => {
	const { id } = req.query;
	expectValidNumId(id);
	const project = await db.fetchProjectById(id);

	expectForValid(authenticatedForView(project, req.user), "Not authorized to view this project.");

	return res.json(project);
}));

router.get('/api/user/info/:id', makeSafeHandler(async (req, res) => {
	const id = req.params.id;
	expectValidNumId(id, 'Expected valid account id.')

	const user = await db.fetchUserById(id);

	return res.json(user);
}));

router.get('/api/search/project', makeSafeHandler(async (req, res) => {
	const { projectName } = req.query;
	expectForValid(projectName && typeof projectName === "string", "Expected valid project name");
	return res.json(await db.searchProjects(projectName));
}));

router.get('/api/user/project', makeSafeHandler(async (req, res) => {
	let projects = await db.fetchAssociatedProjects(req.user);
	await db.appendCollaborators(projects);

	return res.json(projects);
}, { statusCode: 401 }));

router.get(`/api/projects/by/user/:userId`, makeSafeHandler(async (req, res) => {
	const id = req.params.userId;
	expectValidNumId(id, 'Expected valid account id');
	const projects = await db.fetchPublicAssociatedProjects(id);
	return res.json(projects);
}));

//fetch other user project
router.get('/api/other/project', makeSafeHandler(async (req, res) => {
	let { id } = req.query;
	expectValidNumId(id, 'Expected valid account id');
	let projects = await db.fetchPublicAssociatedProjects(id);
	return res.json(projects);
}));


router.get('/api/collaborator', makeSafeHandler(async (req, res) => {
	let pending_collaborators = await db.fetchPendingCollaborators(req.user);
	return res.json(pending_collaborators);
}));

router.get('/reviewProject', requireAuthentication((req, res) => {
	res.sendFile(path.join(__dirname, "public", "reviewProject.html"));
}, { statusCode: 401 }));

router.get('/api/reviews', makeSafeHandler(async (req, res) => {
	const projectId = req.query.projectId;
	expectValidNumId(projectId);
	const page = parseInt(req.query.page) || 1;
	const limit = parseInt(req.query.limit) || 10;
	const offset = (page - 1) * limit;

	const reviews = await db.getProjectReviews(projectId, limit, offset);
	const totalCount = await db.getReviewCount(projectId);

	return res.json({
		reviews: reviews,
		totalCount: totalCount
	});
}, { statusCode: 401 }));

router.get('/analyticsDashboard', requireAuthentication((req, res) => {
	res.sendFile(path.join(__dirname, "public", "analyticsDashboard.html"));
}));

// Funding Report
// Route to display the fundingReports page
router.get('/reports/funding', requireAuthentication((req, res) => {
	try {
		if (!authenticateRequest(req)) {
			res.status(401).json({ error: 'Not authenticated' });
			return;
		}

		res.sendFile(path.join(__dirname, "public", "fundingReport.html"));
	} catch (err) {
		console.error('Error displaying funding reports page:', err);
		res.status(500).json({ error: 'Failed to display funding reports page' });
	}
}, { statusCode: 401 }));

//api route for funding report
router.get('/api/reports/funding', requireAuthentication(async (req, res) => {
	try {
		const userId = req.user.id;
		const userProjects = await db.fetchAssociatedProjects(req.user);
		if (userProjects.length === 0) {
			return res.json({
				totalFunding: 0,
				amountUsed: 0,
				amountLeft: 0,
				usageCategories: [],
				grants: [],
				projectFunding: []
			});
		}
		const projectIds = userProjects.map(project => project.id);
		const fundingData = await db.getFundingReportData(projectIds);
		res.json(fundingData);
	} catch (err) {
		console.error('Error generating funding report:', err);
		res.status(500).json({ error: 'Failed to generate funding report' });
	}
}));

// Completion Status Report
router.get('/reports/completion-status', requireAuthentication(async (req, res) => {
	try {
		const { projectId } = req.query;

		// If a specific project ID is provided, get details for that project
		let projectData = null;
		if (projectId) {
			const project = await db.fetchProjectById(projectId);
			if (!project) {
				return res.status(404).json({ error: 'Project not found' });
			}

			// Check if user has access to this project
			if (!authenticatedForView(project, req.user)) {
				return res.status(403).json({ error: 'Not authorized to view this project' });
			}

			// Get completion data using db function instead of direct query
			const completionData = await db.getCompletionStatusData([projectId]);

			// Get milestones from the completion data instead of direct query
			const milestones = completionData.milestones.filter(m =>
				m.project_name === project.name
			);

			// Calculate completion percentage
			const completionPercentage = completionData.projectProgress;

			// Add calculated fields to project
			project.progress = completionPercentage;
			project.milestones = milestones;

			projectData = project;
		}

		// Get all user projects for comparison
		const userProjects = await db.fetchAssociatedProjects(req.user);
		await db.appendCollaborators(userProjects);

		// Calculate progress for each project (random for demo purposes)
		userProjects.forEach(project => {
			project.progress = Math.floor(Math.random() * 80) + 20; // Random progress between 20-100%
		});

		res.sendFile(path.join(__dirname, "public", "completionStatusReport.html"));
	} catch (err) {
		console.error('Error generating completion status report:', err);
		res.status(500).json({ error: 'Failed to generate completion status report' });
	}
}, { statusCode: 401 }));

// API endpoint to get the report data for the client-side JS
router.get('/api/reports/completion-status', requireAuthentication(async (req, res) => {
	try {
		const { projectId } = req.query;

		if (!projectId) {
			return res.status(400).json({ error: 'Project ID is required' });
		}

		// Get project details
		const project = await db.fetchProjectById(projectId);
		if (!project) {
			return res.status(404).json({ error: 'Project not found' });
		}

		// Check if user has access to this project
		if (!authenticatedForView(project, req.user)) {
			return res.status(403).json({ error: 'Not authorized to view this project' });
		}

		// Get completion data using the db function
		const completionData = await db.getCompletionStatusData([projectId]);

		// Get all user projects for comparison
		const userProjects = await db.fetchAssociatedProjects(req.user);

		// Calculate progress for each project using milestone data or fall back to random
		for (const comparisonProject of userProjects) {
			if (comparisonProject.id === parseInt(projectId)) {
				comparisonProject.progress = completionData.projectProgress;
			} else {
				// For demo purposes assign random progress
				comparisonProject.progress = Math.floor(Math.random() * 80) + 20; // 20-100%
			}
		}

		// Return the combined data
		res.json({
			totalContributors: completionData.totalContributors,
			avgDaysToComplete: completionData.avgDaysToComplete,
			projectProgress: completionData.projectProgress,
			contributorsTrend: completionData.contributorsTrend,
			progressComparison: completionData.progressComparison,
			milestones: completionData.milestones,
			project: project,
			similarProjects: userProjects.filter(p => p.id !== parseInt(projectId)),
			collaborators: project.collaborators || []
		});
	} catch (err) {
		console.error('Error generating completion status report data:', err);
		res.status(500).json({ error: 'Failed to generate completion status report data' });
	}
}, { statusCode: 401 }));

// Customizable Report
router.get('/reports/custom', requireAuthentication(async (req, res) => {
	try {
		// This route should just return the HTML page
		res.sendFile(path.join(__dirname, "public", "customViewReport.html"));
	} catch (err) {
		console.error('Error serving custom report page:', err);
		res.status(500).send('Error loading custom report page');
	}
}, { statusCode: 401 }));

// API endpoint for custom report data
router.get('/api/reports/custom', requireAuthentication(async (req, res) => {
	try {
		const { metrics, projectIds, timeframe, groupBy } = req.query;

		if (!metrics) {
			return res.status(400).json({ error: 'No metrics specified for custom report' });
		}

		const metricsList = metrics.split(',');
		const validMetrics = ['completion', 'resources', 'collaborators', 'reviews', 'uploads'];
		const filteredMetrics = metricsList.filter(m => validMetrics.includes(m));

		if (filteredMetrics.length === 0) {
			return res.status(400).json({ error: 'No valid metrics specified' });
		}

		const reportData = await db.generateCustomReport({
			userId: req.user.id,
			metrics: filteredMetrics,
			projectIds: projectIds ? projectIds.split(',').map(id => parseInt(id)) : null,
			timeframe: timeframe || 'all',
			groupBy: groupBy || 'project'
		});
		const activityData = await db.getUserActivityReportData(req.user.id);
		const combinedData = {
			...activityData,
			reportData: reportData
		};

		res.json(combinedData);
	} catch (err) {
		console.error('Error generating custom report:', err);
		res.status(500).json({ error: 'Failed to generate custom report', details: err.message });
	}
}, { statusCode: 401 }));

/* POST Request Routing */
router.post('/create/project', requireAuthentication(async (req, res) => {
	try {
		const { projectName, description, field, visibility } = req.body;

		const project = {
			name: projectName,
			description: description,
			field: field,
			isPublic: visibility === 'true',
		};

		await db.createProject(project, req.user);
		res.sendFile(path.join(__dirname, "public", "successfulProjectPost.html"));
	} catch (err) {
		res.sendFile(path.join(__dirname, "public", "failureProjectPost.html"));
		console.error(err)
	}
}, { statusCode: 401 }));

router.post('/api/collaboration/request', makeSafeHandler(async (req, res) => {
	const { projectId } = req.body;
	expectValidNumId(projectId);
	await db.insertPendingCollaborator(req.user.id, projectId);
	return res.status(200).json({ message: 'Successfully sent collaboration request.' });
}, { statusCode: 401 }));

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
}, { statusCode: 401 }));

const expectAllPresentForValid = (...values) => {
	const missing = values.filter(value => value == null);
	if (missing.length > 0) {
		throw new ValidationError("Missing required fields", { missing });
	}
};

//Reviews Page
router.post('/api/review', makeSafeHandler(async (req, res) => {
	expectAllPresentForValid(req.body, req.body.projectId, req.body.rating, req.body.comment);
	const { projectId, rating, comment } = req.body;
	expectValidNumId(projectId);
	expectAllPresentForValid(projectId, rating, comment);
	const ratingPattern = /^[1-5]$/;
	expectForValid(ratingPattern.test(String(rating)), "Expected valid rating.");
	// 4. Validate comment (length 10-500)
	const trimmedComment = comment.trim();
	expectForValid(trimmedComment && trimmedComment.length >= 10 && trimmedComment.length <= 500, "Expected valid comment.");

	await db.createReview({
		project_id: parseInt(projectId),
		reviewer_id: req.user.id,
		rating: parseInt(rating),
		comment
	});

	return res.status(201).json({
		message: 'Review submitted!',
		redirect: '/successfulReviewPost'
	});
}));


//do these not exist already
router.get('/successfulReviewPost', requireAuthentication((req, res) => {
	res.sendFile(path.join(__dirname, "public", "successfulReviewPost.html"));
}));

router.get('/messages', requireAuthentication((req, res) => {
	res.sendFile(path.join(__dirname, "public", "messages.html"));
}));

//Move to search for users page
router.get('/view/users', requireAuthentication((req, res) => {
	res.sendFile(path.join(__dirname, "public", "searchUsers.html"));
}));

//Searching for users 
router.get('/api/search/user', makeSafeHandler(async (req, res) => {
	const { userName } = req.query;
	expectForValid(userName && typeof userName === 'string');
	res.json(await db.searchUsers(userName));
}));

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
router.get('/admin', requireAuthentication(async (req, res) => {
	let user = req.user.id;
	let admin = await db.is_Admin(user);
	return res.json(admin);
}, { statusCode: 401 }));

router.get('/isSuspended', requireAuthentication(async (req, res) => {
	try {
		const { id } = req.query
		const result = await db.isSuspended(id);
		return res.json(result[0].is_suspended);
	} catch (err) {
		console.error('Error checking if user suspended:', err);
	}
}, { statusCode: 401 }));

//Put request to update profile
router.put('/update/profile', requireAuthentication(async (req, res) => {
	const params = req.body;

	res.json(await db.updateProfile(params));
}, { statusCode: 401 }));

/* PUT Request Routing */
router.put('user/details', requireAuthentication(async (req, res) => {
	const { name, bio } = req.body;
}, { statusCode: 401 }));

router.get('/redirect/view/funding', (req, res) => {
	if (!authenticateRequest(req)) {
		return res.redirect('/forbidden');
	}

	res.sendFile(path.join(__dirname, "public", "viewFunding.html"));
});

router.post('/add/funding', async (req, res) => {
	const { project_id, currency, funding_type, total_funding } = req.body;

	try {
		await db.addFunding({ project_id, currency, funding_type, total_funding });
		res.status(200).json({ message: 'Funding added successfully' });
	} catch (error) {
		console.error('Error adding funding:', error);
		res.status(500).json({ message: 'Failed to add funding', error });
	}
});

router.post('/add/expenditure', async (req, res) => {
	const { funding_id, amount, description } = req.body;

	try {
		await db.addExpenditure({ funding_id, amount, description });
		res.status(200).json({ message: 'Expenditure added successfully' });
	} catch (error) {
		console.error('Error adding expenditure:', error);
		res.status(500).json({ message: 'Failed to add expenditure', error });
	}
});

router.get('/get/funding', async (req, res) => {
	const projectId = req.query.id;
	try {
		const result = await db.getFunding(projectId);
		res.json(result);
	} catch (err) {
		res.status(400).json({ error: 'Failed' });
	}
});

router.get('/get/expenditure', async (req, res) => {
	const fundingId = req.query.id;
	try {
		const result = await db.getExpenditure(fundingId);
		res.json(result);
	} catch (err) {
		res.status(400).json({ error: 'Failed' });
	}
});

router.get(`/redirect/view/suspended`, (req, res) => {
	if (!authenticateRequest(req)) {
		return res.redirect('/forbidden');
	}

	res.sendFile(path.join(__dirname, "public", "viewSuspended.html"));
});

router.get(`/suspended/user`, async (req, res) => {
	try {
		const result = await db.getSuspendedUser();
		res.json(result);
	} catch (err) {
		res.status(400).json({ error: 'Failed' });
	}
});

//below has no requireAuthentication nor status Code 401?

router.get('/redirect/edit/milestone', (req, res) => {
	if (!authenticateRequest(req)) {
		return res.redirect('/forbidden');
	}

	res.sendFile(path.join(__dirname, "public", "editMilestone.html"));
});

router.get('/redirect/add/milestone', (req, res) => {
	if (!authenticateRequest(req)) {
		return res.redirect('/forbidden');
	}

	res.sendFile(path.join(__dirname, "public", "addMilestone.html"));
});

router.get('/get/milestones/by-project', async (req, res) => {
	const projectId = req.query.id;
	console.log(projectId);
	try {
		const result = await db.getMilestones(projectId);
		res.json(result);
	} catch (err) {
		res.status(400).json({ error: 'Failed' });
	}
});

router.get('/get/milestone/by-id', async (req, res) => {
	const milestoneId = req.query.id;
	try {
		const result = await db.getMilestone(milestoneId);
		res.json(result);
	} catch (err) {
		res.status(400).json({ error: 'Failed' });
	}
});


router.post('/add/milestone', async (req, res) => {
	try {
		const { project_id, name, description } = req.body;
		console.log(project_id);
		if (!project_id || !name || !description) {
			res.status(400).json({ error: 'element missing' });
			return;
		}
		console.log(name);
		console.log(description);
		await db.addMilestone({ project_id, name, description });

		res.send('Successfully added milestone.');
	} catch (err) {
		res.status(400).json({ error: 'Failed' });
	}
});

router.put('/edit/milestone', async (req, res) => {
	try {
		const { milestoneId, name, description } = req.body
		await db.editMilestone({ milestoneId, name, description });
		res.send('Successfully edited milestone.');
	} catch (err) {
		res.status(400).json({ error: 'Failed' });
	}
});

router.put('/complete/milestone', async (req, res) => {
	try {
		await db.completeMilestone(req.body.id);
		res.send('Milestone Completed!');
	} catch (err) {
		res.status(400).json({ error: 'Failed' });
	}
});

router.put('/uncomplete/milestone', async (req, res) => {
	try {
		await db.uncompleteMilestone(req.body.id);
		res.send('Completion status revoked:(')
	} catch (err) {
		res.status(400).json({ error: 'Failed' });
	}
});

router.delete('/delete/milestone', async (req, res) => {
	try {
		await db.deleteMilestone(req.body.id);
		res.send('Successfully deleted milestone.');
	} catch (err) {
		res.status(400).json({ error: 'Failed' });
	}
});

router.get('/redirect/view/funding', (req, res) => {
	if (!authenticateRequest(req)) {
		return res.redirect('/forbidden');
	}

	res.sendFile(path.join(__dirname, "public", "viewFunding.html"));
});

router.post('/add/funding', async (req, res) => {
	const { project_id, currency, funding_type, total_funding } = req.body;

	try {
		await db.addFunding({ project_id, currency, funding_type, total_funding });
		res.status(200).json({ message: 'Funding added successfully' });
	} catch (error) {
		console.error('Error adding funding:', error);
		res.status(500).json({ message: 'Failed to add funding', error });
	}
});

router.post('/add/expenditure', async (req, res) => {
	const { funding_id, amount, description } = req.body;

	try {
		await db.addExpenditure({ funding_id, amount, description });
		res.status(200).json({ message: 'Expenditure added successfully' });
	} catch (error) {
		console.error('Error adding expenditure:', error);
		res.status(500).json({ message: 'Failed to add expenditure', error });
	}
});

router.get('/get/funding', async (req, res) => {
	const projectId = req.query.id;
	try {
		const result = await db.getFunding(projectId);
		res.json(result);
	} catch (err) {
		res.status(400).json({ error: 'Failed' });
	}
});

router.get('/get/expenditure', async (req, res) => {
	const fundingId = req.query.id;
	try {
		const result = await db.getExpenditure(fundingId);
		res.json(result);
	} catch (err) {
		res.status(400).json({ error: 'Failed' });
	}
});

export default router;
