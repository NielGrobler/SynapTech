import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock db default export
vi.mock('./db/db.js', () => ({
	__esModule: true,
	default: {
		getUserByGUID: vi.fn(),
		createUser: vi.fn(),
		storeMessage: vi.fn(),
		retrieveMessagedUsers: vi.fn(),
		retrieveMessages: vi.fn(),
		permittedToAcceptCollaborator: vi.fn(),
		acceptCollaborator: vi.fn(),
		permittedToRejectCollaborator: vi.fn(),
		removeCollaborator: vi.fn(),
		fetchProjectById: vi.fn(),
		searchProjects: vi.fn(),
		fetchAssociatedProjects: vi.fn(),
		appendCollaborators: vi.fn(),
		fetchPendingCollaborators: vi.fn(),
		createProject: vi.fn(),
		insertPendingCollaborator: vi.fn(),
		deleteUser: vi.fn(),
		createReview: vi.fn(),
	},
}));

import express from 'express';
import request from 'supertest';
import router, { authenticateRequest } from './router.js';
import db from './db/db.js';
import path from 'path';

// Helper to setup app with auth simulation
const setupApp = () => {
	const app = express();
	app.use(express.json());
	app.use((req, res, next) => {
		req.isAuthenticated = () => req.headers['authenticated'] === 'true';
		req.logout = (cb) => cb();
		req.user = req.headers['user'] ? JSON.parse(req.headers['user']) : undefined;
		res.sendFile = (filePath) => res.send(`served ${path.basename(filePath)}`);
		next();
	});
	app.use(router);
	return app;
};

describe('Router Endpoints', () => {
	let app;
	beforeEach(() => {
		vi.resetAllMocks();
		app = setupApp();
	});
	afterEach(() => { });

	it('authenticateRequest returns correct boolean', () => {
		const req = { isAuthenticated: () => true };
		expect(authenticateRequest(req)).toBe(true);
		req.isAuthenticated = () => false;
		expect(authenticateRequest(req)).toBe(false);
	});

	it('redirects .html to /forbidden and serves .js from src', async () => {
		let res = await request(app).get('/file.html');
		expect(res.status).toBe(302);
		expect(res.headers.location).toBe('/forbidden');
		res = await request(app).get('/script.js');
		expect(res.status).toBe(200);
		expect(res.text).toBe('served script.js');
	});

	it('GET /forbidden', async () => {
		const res = await request(app).get('/forbidden');
		expect(res.status).toBe(403);
		expect(res.text).toBe('served forbidden.html');
	});

	it('GET /dashboard and /login/signup', async () => {
		let res = await request(app).get('/dashboard');
		expect(res.status).toBe(302);
		expect(res.headers.location).toBe('/forbidden');
		res = await request(app).get('/dashboard').set('authenticated', 'true');
		expect(res.text).toBe('served dashboard.html');
		res = await request(app).get('/login');
		expect(res.text).toBe('served login.html');
		res = await request(app).get('/signup');
		expect(res.text).toBe('served signup.html');
	});

	it('GET /settings and /invite status codes', async () => {
		let res = await request(app).get('/settings');
		expect(res.status).toBe(401);
		res = await request(app).get('/settings').set('authenticated', 'true');
		expect(res.text).toBe('served settings.html');
		res = await request(app).get('/invite');
		expect(res.status).toBe(401);
		res = await request(app).get('/invite').set('authenticated', 'true');
		expect(res.text).toBe('served invite.html');
	});

	it('GET /message unauthorized and authorized', async () => {
		let res = await request(app).get('/message');
		expect(res.status).toBe(302);
		expect(res.headers.location).toBe('/forbidden');
		res = await request(app).get('/message').set('authenticated', 'true');
		expect(res.text).toBe('served messages.html');
	});

	it('API: /api/user/info', async () => {
		let res = await request(app).get('/api/user/info');
		expect(res.status).toBe(401);
		const user = { id: 1, name: 'A' };
		res = await request(app).get('/api/user/info')
			.set('authenticated', 'true').set('user', JSON.stringify(user));
		expect(res.body).toEqual(user);
	});

	it('POST /api/message/send', async () => {
		let res = await request(app).post('/api/message/send').send({});
		expect(res.status).toBe(302);
		res = await request(app).post('/api/message/send')
			.set('authenticated', 'true').send({});
		expect(res.status).toBe(400);
		db.storeMessage.mockResolvedValue();
		res = await request(app).post('/api/message/send')
			.set('authenticated', 'true').set('user', JSON.stringify({ id: 5 }))
			.send({ messageBody: 'Hi', receivedRecipientId: '10' });
		expect(db.storeMessage).toHaveBeenCalledWith(5, 10, 'Hi');
		expect(res.status).toBe(200);
	});

	it('GET /api/message/allMessagedUsers', async () => {
		let res = await request(app).get('/api/message/allMessagedUsers');
		expect(res.status).toBe(302);
		db.retrieveMessagedUsers.mockResolvedValue([{ id: 2 }]);
		res = await request(app).get('/api/message/allMessagedUsers')
			.set('authenticated', 'true').set('user', JSON.stringify({ id: 3 }));
		expect(res.body).toEqual([{ id: 2 }]);
	});

	it('GET /api/message/:id', async () => {
		let res = await request(app).get('/api/message/junk')
			.set('authenticated', 'true').set('user', JSON.stringify({ id: 4 }));
		expect(res.status).toBe(400);
		db.retrieveMessages.mockResolvedValue(['m']);
		res = await request(app).get('/api/message/7')
			.set('authenticated', 'true').set('user', JSON.stringify({ id: 4 }));
		expect(res.body).toEqual(['m']);
	});

	it('PUT /api/accept/collaborator', async () => {
		let res = await request(app).put('/api/accept/collaborator').send({});
		expect(res.status).toBe(302);
		res = await request(app).put('/api/accept/collaborator')
			.set('authenticated', 'true').send({});
		expect(res.status).toBe(400);
		db.permittedToAcceptCollaborator.mockResolvedValue(false);
		res = await request(app).put('/api/accept/collaborator')
			.set('authenticated', 'true').send({ userId: 1, projectId: 1 });
		expect(res.status).toBe(400);
		db.permittedToAcceptCollaborator.mockResolvedValue(true);
		res = await request(app).put('/api/accept/collaborator')
			.set('authenticated', 'true').send({ userId: 1, projectId: 1 });
		expect(res.text).toBe('Successful');
	});

	it('DELETE /api/reject/collaborator', async () => {
		let res = await request(app).delete('/api/reject/collaborator').send({});
		expect(res.status).toBe(302);
		res = await request(app).delete('/api/reject/collaborator')
			.set('authenticated', 'true').send({});
		expect(res.status).toBe(400);
		db.permittedToRejectCollaborator.mockResolvedValue(false);
		res = await request(app).delete('/api/reject/collaborator')
			.set('authenticated', 'true').send({ userId: 1, projectId: 2 });
		expect(res.status).toBe(400);
		db.permittedToRejectCollaborator.mockResolvedValue(true);
		res = await request(app).delete('/api/reject/collaborator')
			.set('authenticated', 'true').send({ userId: 1, projectId: 2 });
		expect(res.text).toBe('Successful');
	});

	it('GET /api/project', async () => {
		let res = await request(app).get('/api/project');
		expect(res.status).toBe(401);
		res = await request(app).get('/api/project')
			.set('authenticated', 'true');
		expect(res.status).toBe(400);
		db.fetchProjectById.mockResolvedValue(null);
		res = await request(app).get('/api/project?id=5')
			.set('authenticated', 'true');
		expect(res.body).toBeNull();
		const proj = { is_public: false, created_by_account_id: 2, collaborators: [] };
		db.fetchProjectById.mockResolvedValue(proj);
		res = await request(app).get('/api/project?id=5')
			.set('authenticated', 'true').set('user', JSON.stringify({ id: 3 }));
		expect(res.status).toBe(400);
		proj.is_public = true;
		res = await request(app).get('/api/project?id=5')
			.set('authenticated', 'true');
		expect(res.body).toEqual(proj);
	});

	it('Misc GET flows: search, user/project, collaborator', async () => {
		let res = await request(app).get('/api/search/project')
			.set('authenticated', 'true');
		expect(res.status).toBe(400);
		db.searchProjects.mockResolvedValue(['p']);
		res = await request(app).get('/api/search/project?projectName=test')
			.set('authenticated', 'true');
		expect(res.body).toEqual(['p']);
		db.fetchAssociatedProjects.mockResolvedValue([]);
		db.appendCollaborators.mockResolvedValue();
		res = await request(app).get('/api/user/project')
			.set('authenticated', 'true');
		expect(res.status).toBe(200);
		db.fetchPendingCollaborators.mockResolvedValue(['c']);
		res = await request(app).get('/api/collaborator')
			.set('authenticated', 'true');
		expect(res.body).toEqual(['c']);
	});

	it('POST /submit/review and GET /successfulReviewPost', async () => {
		let res = await request(app).post('/submit/review').send({});
		expect(res.status).toBe(403);
		res = await request(app).post('/submit/review')
			.set('authenticated', 'true').set('user', JSON.stringify({ id: 1 }))
			.send({ projectId: 1 });
		expect(res.status).toBe(400);
		db.createReview.mockResolvedValue({});
		res = await request(app).post('/submit/review')
			.set('authenticated', 'true').set('user', JSON.stringify({ id: 1 }))
			.send({ projectId: 1, rating: 5, comment: 'c' });
		expect(res.status).toBe(201);
		expect(res.body.redirect).toBe('/successfulReviewPost');
		res = await request(app).get('/successfulReviewPost')
			.set('authenticated', 'true');
		expect(res.text).toBe('served successfulReviewPost.html');
	});
});

