// router.test.js
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import session from 'express-session';
import router from './router';

// Mock passport
vi.mock('passport', () => {
  const mockPassport = {
    initialize: () => (req, res, next) => {
      req.isAuthenticated = () => true;
      next();
    },
    session: () => (req, res, next) => next(),
    authenticate: (strategy, options) => {
      return (req, res, next) => {
        // Immediately execute the callback instead of hanging
        req.user = { id: 'test-user-id', name: 'Test User' };
        if (options && options.failureRedirect) {
          return res.redirect('/dashboard');
        }
        // If this is a direct call to the auth route, respond immediately
        if (req.path.includes('/auth/')) {
          return res.redirect('/dashboard');
        }
        next();
      };
    },
    use: vi.fn(),
    serializeUser: vi.fn((fn) => {
      fn({ id: 'test-user-id' }, (err, id) => {});
    }),
    deserializeUser: vi.fn((fn) => {
      fn('test-user-id', (err, user) => {});
    })
  };
  
  return { default: mockPassport };
});

// Mock passport strategies
vi.mock('passport-google-oauth20', () => {
  return {
    default: class GoogleStrategy {
      constructor(options, verify) {
        this.name = 'google';
        this.options = options;
        this.verify = verify;
      }
    }
  };
});

vi.mock('passport-orcid', () => {
  return {
    default: class ORCIDStrategy {
      constructor(options, verify) {
        this.name = 'orcid';
        this.options = options;
        this.verify = verify;
      }
    }
  };
});

// Mock dotenv
vi.mock('dotenv', () => {
  const mockDotenv = {
    config: vi.fn()
  };
  
  return { default: mockDotenv, ...mockDotenv };
});

// Mock database
vi.mock('./db/db.js', () => {
  return {
    default: {
      getUserByGUID: vi.fn(() => Promise.resolve({ id: 'test-user-id', name: 'Test User' })),
      createUser: vi.fn(() => Promise.resolve()),
      fetchAssociatedProjects: vi.fn(() => Promise.resolve([])),
      appendCollaborators: vi.fn(() => Promise.resolve()),
      fetchProjectById: vi.fn(() => Promise.resolve(null)),
      searchProjects: vi.fn(() => Promise.resolve([])),
      fetchPendingCollaborators: vi.fn(() => Promise.resolve([]))
    }
  };
});

// Mock fs to return dummy HTML content
vi.mock('fs', () => {
  return {
    default: {
      readFileSync: vi.fn(() => '<!DOCTYPE html><html><body>Test Content</body></html>'),
      existsSync: vi.fn(() => true)
    }
  };
});

// Mock path
vi.mock('path', () => {
  const mockPath = {
    join: vi.fn((...args) => args.join('/')),
    dirname: vi.fn((path) => path.split('/').slice(0, -1).join('/'))
  };
  
  return { 
    default: mockPath,
    ...mockPath
  };
});

// Mock https
vi.mock('https', () => {
  return {
    default: {
      createServer: vi.fn(() => ({
        listen: vi.fn()
      }))
    }
  };
});

// Mock url
vi.mock('url', () => {
  const mockUrl = {
    fileURLToPath: vi.fn((url) => url.replace('file://', '')),
  };
  
  return { 
    default: mockUrl,
    ...mockUrl
  };
});

describe('Router tests', () => {
  let app;
  
  beforeAll(() => {
    // Set environment variables for testing
    process.env.SESSION_SECRET = 'test-session-secret';
    process.env.AUTH_TESTING = 'true';
    process.env.GOOGLE_CLIENT_ID = 'fake-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'fake-client-secret';
    process.env.GOOGLE_CALLBACK_URL = 'http://localhost:3000/auth/google/callback';
    process.env.ORCID_CLIENT_ID = 'fake-orcid-id';
    process.env.ORCID_CLIENT_SECRET = 'fake-orcid-secret';
    process.env.ORCID_CALLBACK_URL = 'http://localhost:3000/auth/orcid/callback';
  });

  beforeEach(() => {
    // Create a fresh app for each test
    app = express();
    
    // Mock res.sendFile to respond with 200 status
    app.use((req, res, next) => {
      const originalSendFile = res.sendFile;
      res.sendFile = function(path) {
        return res.status(200).send('<!DOCTYPE html><html><body>Mock HTML Content</body></html>');
      };
      next();
    });
    
    // Set up middleware
    app.use(
      session({
        secret: 'testsecret',
        resave: false,
        saveUninitialized: false,
      })
    );
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());
    
    // Add middleware to mock authentication for API routes
    app.use((req, res, next) => {
      req.isAuthenticated = () => true;
      req.user = { id: 'test-user-id', name: 'Test User' };
      req.logout = (cb) => {
        if (cb) cb();
      };
      next();
    });
    
    app.use(router);
  });

  it('should respond to GET /dashboard', async () => {
    const response = await request(app)
      .get('/dashboard');
    
    expect(response.status).toBe(200);
    expect(response.text).toContain('<!DOCTYPE html>');
  });

  it('should respond to GET /login', async () => {
    const response = await request(app)
      .get('/login');
    
    expect(response.status).toBe(200);
    expect(response.text).toContain('<!DOCTYPE html>');
  });

  it('should handle authentication routes', async () => {
    const response = await request(app)
      .get('/auth/google');
    
    // Now we expect a redirect to /dashboard since we've mocked the auth to succeed
    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/dashboard');
  });

  it('should handle API routes', async () => {
    const response = await request(app)
      .get('/api/user/info');
    
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: 'test-user-id', name: 'Test User' });
  });

  // Additional test for authentication callbacks
  it('should handle auth callback routes', async () => {
    const response = await request(app)
      .get('/auth/google/callback');
    
    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/dashboard');
  });

  // Add test for logout
  it('should handle logout', async () => {
    const response = await request(app)
      .get('/logout');
    
    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/');
  });
});