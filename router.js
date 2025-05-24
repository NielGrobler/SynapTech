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

router.get('/dashboard', requireAuthentication((req, res) => {
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
		//console.log(req.file);
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
}, { statusCode: 401 }));

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
}, { statusCode: 401 }));

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
}, { statusCode: 401 }));

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
}, { statusCode: 401 }));

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
}, { statusCode: 401 }));

router.get('/api/user/projectNames', requireAuthentication(async (req, res) => {
	let projects = await db.fetchAssociatedProjectsByLatest(req.user);
	res.json(projects);
}, { statusCode: 401 }));

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
}, { statusCode: 401 }));

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
}, { statusCode: 401 }));

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

}, { statusCode: 401 }));

router.get('/api/user/project', requireAuthentication(async (req, res) => {
	let projects = await db.fetchAssociatedProjects(req.user);
	await db.appendCollaborators(projects);

	res.json(projects);
}, { statusCode: 401 }));


//fetch other user project
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
}, { statusCode: 401 }));

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
}, { statusCode: 401 }));

router.get('/analyticsDashboard', (req, res) => {
	if (!authenticateRequest(req)) {
		return res.redirect('/forbidden');
	}
	res.sendFile(path.join(__dirname, "public", "analyticsDashboard.html"));
});

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

// Add this to your router.js where other API routes are defined
router.get('/api/reports/funding', requireAuthentication(async (req, res) => {
	try {
		const userId = req.user.id;

		// Get projects associated with this user
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

		// Extract project IDs
		const projectIds = userProjects.map(project => project.id);

		// Get funding data for these projects
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

			// Get milestones (use ProjectMilestone table)
			const milestonesQuery = await sender.getResult(new DatabaseQueryBuilder()
				.input('projectId', projectId)
				.query(`
          SELECT 
            project_milestone_id AS id,
            name,
            description,
            created_at,
            completed_at
          FROM ProjectMilestone
          WHERE project_id = {{projectId}}
          ORDER BY created_at
        `)
				.build()
			);

			// Calculate completion percentage based on completed milestones
			const milestones = milestonesQuery.recordSet;
			let completedMilestones = 0;
			if (milestones && milestones.length > 0) {
				completedMilestones = milestones.filter(m => m.completed_at).length;
			}

			const completionPercentage = milestones.length > 0
				? Math.round((completedMilestones / milestones.length) * 100)
				: 50; // Default to 50% if no milestones

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

		// Get project milestones
		const milestonesQuery = await sender.getResult(new DatabaseQueryBuilder()
			.input('projectId', projectId)
			.query(`
        SELECT 
          project_milestone_id AS id,
          name,
          description,
          created_at,
          completed_at
        FROM ProjectMilestone
        WHERE project_id = {{projectId}}
        ORDER BY created_at
      `)
			.build()
		);

		const milestones = milestonesQuery.recordSet;

		// Calculate completion percentage based on completed milestones
		let completedMilestones = 0;
		if (milestones && milestones.length > 0) {
			completedMilestones = milestones.filter(m => m.completed_at).length;
		}

		const completionPercentage = milestones.length > 0
			? Math.round((completedMilestones / milestones.length) * 100)
			: 50; // Default to 50% if no milestones

		// Add calculated fields to project
		project.progress = completionPercentage;
		project.milestones = milestones;

		// Get all user projects for comparison
		const userProjects = await db.fetchAssociatedProjects(req.user);

		// Calculate progress for each project (using milestone completion if available)
		for (const comparison_project of userProjects) {
			if (comparison_project.id === project.id) {
				comparison_project.progress = completionPercentage;
			} else {
				// For demo purposes assign random progress
				comparison_project.progress = Math.floor(Math.random() * 80) + 20; // 20-100%
			}
		}

		// Return the combined data
		res.json({
			project: project,
			similarProjects: userProjects.filter(p => p.id !== project.id),
			collaborators: project.collaborators || [],
			completionData: {
				tasksCompleted: completedMilestones,
				totalTasks: milestones.length,
				avgDaysToComplete: 5.6  // This would ideally be calculated from your actual data
			}
		});

	} catch (err) {
		console.error('Error generating completion status report data:', err);
		res.status(500).json({ error: 'Failed to generate completion status report data' });
	}
}, { statusCode: 401 }));

// Customizable Report
router.get('/reports/custom', requireAuthentication(async (req, res) => {
	try {
		// Get parameters from the query string
		const { metrics, projectIds, timeframe, groupBy } = req.query;

		if (!metrics) {
			return res.status(400).json({ error: 'No metrics specified for custom report' });
		}

		// Parse the metrics and validate them
		const metricsList = metrics.split(',');
		const validMetrics = ['completion', 'resources', 'collaborators', 'reviews', 'uploads'];
		const filteredMetrics = metricsList.filter(m => validMetrics.includes(m));

		if (filteredMetrics.length === 0) {
			return res.status(400).json({ error: 'No valid metrics specified' });
		}

		// Generate custom report based on specified metrics
		const customReportData = await db.generateCustomReport({
			userId: req.user.id,
			metrics: filteredMetrics,
			projectIds: projectIds ? projectIds.split(',').map(id => parseInt(id)) : null,
			timeframe: timeframe || 'all',
			groupBy: groupBy || 'project'
		});

		res.json(customReportData);
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

router.post('/api/collaboration/request', requireAuthentication(async (req, res) => {
	const { projectId } = req.body;
	if (!projectId || typeof projectId !== 'number') {
		return res.status(400).send("Bad Request");
	}

	try {
		await db.insertPendingCollaborator(req.user.id, projectId);
		res.send('Successfully sent collaboration request.');
	} catch (err) {
		res.status(400).json({ error: 'Failed' });
	}
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
}, { statusCode: 401 }));

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
}, { statusCode: 401 }));

/*router.use((err, req, res, next) => {
  console.error('Express error:', err);
  res.status(500).send('Internal Server Error');
});
*/

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


router.post('/add/milestone', async(req, res) =>{
	try {
		const { project_id, name, description } = req.body;
		console.log(project_id);
		if(!project_id||!name||!description){
			res.status(400).json({error: 'element missing'});
			return;
		}
		console.log(name);
		console.log(description);
		await db.addMilestone({project_id, name, description});

		res.send('Successfully added milestone.');
	} catch (err) {
		res.status(400).json({ error: 'Failed' });
	}
});

router.put('/edit/milestone', async(req, res) =>{
	try {
		const {milestoneId, name, description} = req.body
		await db.editMilestone({milestoneId, name, description});
		res.send('Successfully edited milestone.');
	} catch (err) {
		res.status(400).json({ error: 'Failed' });
	}
});

router.put('/complete/milestone', async(req, res) =>{
	try {
		await db.completeMilestone(req.body.id);
		res.send('Milestone Completed!');
	} catch (err) {
		res.status(400).json({ error: 'Failed' });
	}
});

router.put('/uncomplete/milestone', async(req, res) =>{
	try {
		await db.uncompleteMilestone(req.body.id);
		res.send('Completion status revoked:(')
	} catch (err) {
		res.status(400).json({ error: 'Failed' });
	}
});

router.delete('/delete/milestone', async(req,res)=>{
	try {
		await db.deleteMilestone(req.body.id);
		res.send('Successfully deleted milestone.');
	} catch (err) {
		res.status(400).json({ error: 'Failed' });
	}
});

router.get('/redirect/view/funding', (req, res) =>{
	if (!authenticateRequest(req)) {
		return res.redirect('/forbidden');
	}

	res.sendFile(path.join(__dirname, "public", "viewFunding.html"));
});

router.post('/add/funding', async(req,res)=>{
	const { project_id, currency, funding_type, total_funding } = req.body;

	try {
		await db.addFunding({ project_id, currency, funding_type, total_funding });
		res.status(200).json({ message: 'Funding added successfully' });
	} catch (error) {
		console.error('Error adding funding:', error);
		res.status(500).json({ message: 'Failed to add funding', error });
	}
});

router.post('/add/expenditure', async(req,res)=>{
	const { funding_id, amount, description } = req.body;

	try {
		await db.addExpenditure({ funding_id, amount, description });
		res.status(200).json({ message: 'Expenditure added successfully' });
	} catch (error) {
		console.error('Error adding expenditure:', error);
		res.status(500).json({ message: 'Failed to add expenditure', error });
	}
});

router.get('/get/funding', async(req,res)=>{
	const projectId = req.query.id;
	try {
		const result = await db.getFunding(projectId);
		res.json(result);
	} catch (err) {
		res.status(400).json({ error: 'Failed' });
	}
});

router.get('/get/expenditure', async(req,res)=>{
	const fundingId = req.query.id;
	try {
		const result = await db.getExpenditure(fundingId);
		res.json(result);
	} catch (err) {
		res.status(400).json({ error: 'Failed' });
	}
});

export default router;
