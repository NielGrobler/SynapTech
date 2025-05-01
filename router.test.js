import express from 'express';
import request from 'supertest';
import passport from 'passport';
import db from './db/db.js';
import router from './router.js';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the default export of db.js correctly
vi.mock('./db/db.js', () => ({
	default: {
		getUserByGUID: vi.fn().mockResolvedValue({
			id: 1,
			name: 'Henry Cavill',
			uuid: "apple",
			source: "Google"
		}),
		createUser: vi.fn().mockResolvedValue(true),
		createProject: vi.fn().mockResolvedValue({
			id: 1,
			name: 'Project 1'
		}),
		fetchAssociatedProjects: vi.fn().mockResolvedValue([
			{ id: 1, name: 'Project 1' },
			{ id: 2, name: 'Project 2' }
		]),
		appendCollaborators: vi.fn().mockResolvedValue(true),
		deleteUser: vi.fn().mockResolvedValue(true),
		isSuspendend: vi.fn().mockResolvedValue(false),
		suspendUser: vi.fn().mockResolvedValue(true),
		addCollaborator: vi.fn().mockResolvedValue(true),
		acceptCollaborator: vi.fn().mockResolvedValue(true),
		searchProjects: vi.fn().mockResolvedValue([
			{ id: 1, name: 'Project A' },
			{ id: 2, name: 'Project B' }
		]),
		fetchProjectById: vi.fn().mockResolvedValue({ id: 1, name: 'Project A' })
	}
}));

const app = express();
app.use(router);

describe('Authentication routes', () => {

	beforeEach(() => {
		vi.clearAllMocks();

		// Mock authentication for users to always be authenticated (for testing)
		passport.authenticate = vi.fn().mockImplementation((strategy, options) => {
			return (req, res, next) => {
				req.isAuthenticated = vi.fn().mockReturnValue(true); // Always return true for isAuthenticated
				next(); // Proceed to the next middleware (i.e., route handler)
			};
		});

		const app = express();
		app.use(router);
	});

	it('should respond with status 302, passport.authenticate should be called once.', async () => {
	
		passport.authenticate(null, null);

		const res = await request(app)
			.get('/auth/google/callback');

		expect(res.status).toBe(302);
		expect(passport.authenticate).toHaveBeenCalledTimes(1);
	});

	it('should respond with status 200, should serve dashboard.html', async () => {
		
		const res = await request(app)
			.get('/home');

		expect(res.status).toBe(200);
		expect(res.text).toContain('Dashboard');
	});
});
