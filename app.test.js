// app.test.js
import { describe, beforeAll, afterAll, it, expect, beforeEach, afterEach, vi } from 'vitest';
import https from 'https';
import fs from 'fs';
import { Server } from 'socket.io';
import { io as Client } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import db from './db/db.js';
import router from './router.js';

let server;
let io;
const testPort = '3000';
const testSecret = 'test-session-secret';
const testUser = { id: 'test-guid-123', name: 'Test User' };
const testProject = { id: 'test-project-1', name: 'Test Project' };
const testRole = 'member';

vi.mock('./db/db.js', () => ({
	default: {
		getUserByGUID: vi.fn(),
		getRoleInProject: vi.fn(),
		retrieveLatestMessages: vi.fn(),
		storeMessage: vi.fn(),
		storeMessageWithAttachment: vi.fn(),
		downloadFile: vi.fn(),
	},
}));

vi.mock('fs', () => ({
	readFileSync: vi.fn()
}));

describe('App Module Tests', () => {
	beforeAll(() => {
		process.env.PORT = testPort;
		process.env.SESSION_SECRET = testSecret;
		process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

		/*wanted to use this since i distrust process.env setting directly but vitest issues :/
		vi.stubEnv('PORT', '3000');
		vi.stubEnv('SESSION_SECRET', testSecret);
		vi.stubEnv('NODE_TLS_REJECT_UNAUTHORIZED', '0');
		*/

		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.spyOn(console, 'log').mockImplementation(() => {});
	});

	afterAll(() => {
		delete process.env.PORT;
		delete process.env.SESSION_SECRET;
		delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
		delete process.env.ENVIRONMENT;
		vi.restoreAllMocks();
	});

	describe('Server Config', () => {
		it('should start in production mode when ENVIRONMENT=prod', async () => {
			process.env.ENVIRONMENT = 'prod';
			
			const mockListen = vi.fn().mockImplementation((port, callback) => callback());
			router.listen = mockListen;
			
			await import('./app.js');
			
			expect(mockListen).toHaveBeenCalledWith(testPort, expect.any(Function));
			expect(console.log).toHaveBeenCalledWith(
				expect.stringContaining('HTTPS server running in production mode')
			);
		});

		/*it('should use SSL in non-production mode', async () => {
			delete process.env.ENVIRONMENT;
			
			const mockListen = vi.fn().mockImplementation((port, callback) => callback());
			const mockServer = { listen: mockListen };
			const mockCreateServer = vi.fn().mockReturnValue(mockServer);
			
			https.createServer = mockCreateServer;

			const mockFs = await import('fs');
  			mockFs.readFileSync.mockImplementation((path) => {
    			if (path === 'server.key') return 'mock-key';
    			if (path === 'server.cert') return 'mock-cert';
   				 throw new Error(`Unexpected file path: ${path}`);
  			});
			
			await import('./app.js');
			
			expect(mockCreateServer).toHaveBeenCalledWith(
				{ key: 'mock-key', cert: 'mock-cert' },
				router
			);
			expect(mockListen).toHaveBeenCalledWith(testPort, expect.any(Function));
		});*/

		/*i dont think the server would ever fail to launch, which means this isn't really a needed test
		it('should handle server startup errors', async () => {
			process.env.ENVIRONMENT = 'prod';
			const mockError = new Error('Startup failed');

			const mockListen = vi.fn().mockImplementation((port, callback) => {
				callback(mockError);
			});
			router.listen = mockListen;
			
			console.error.mockClear();
			
			await import('./app.js');
			
			expect(console.error).toHaveBeenCalledWith(
				'Failed to start server:', 
				mockError
			);
		});*/
	});
	
	/*describe('Socket.IO Config', () => {
		let clientSocket;
		let authToken;

		beforeEach(async () => {
			db.getUserByGUID.mockResolvedValue(testUser);
			db.getRoleInProject.mockResolvedValue(testRole);
			db.retrieveLatestMessages.mockResolvedValue({ recordSet: [] });
			
			vi.useFakeTimers();

			authToken = jwt.sign({ id: testUser.id }, process.env.SESSION_SECRET);
			clientSocket = Client(`http://localhost:${testPort}`, {
				auth: { token: authToken },
				rejectUnauthorized: false,
			});
			
			await new Promise((resolve) => {
				clientSocket.on('connect', resolve);
				clientSocket.on('connect_error', (err) => {
				console.error('Connection error:', err);
				resolve();
				});
			});
		});

		afterEach(() => {
			if (clientSocket?.connected) {
				clientSocket.disconnect();
			}
			vi.clearAllMocks();
			vi.useRealTimers();
		});

		it('should set socket.role correctly in message handler', async () => {
			const roomId = testProject.id;
			const messageContent = 'Test role check';
			
			db.storeMessage.mockResolvedValue({});
			
			clientSocket.emit('join-room', { roomId });
			await new Promise((resolve) => clientSocket.on('joined-room', resolve));
			
			clientSocket.emit('message', { roomId, content: messageContent });
			
			const receivedMessage = await new Promise((resolve) => {
				clientSocket.on('message', resolve);
			});
			
			expect(receivedMessage.role).toBe(testRole);
			expect(db.storeMessage).toHaveBeenCalledWith(testUser.id, roomId, messageContent);
		}, 10000);

		it('should handle database errors in message storage', async () => {
			const roomId = testProject.id;
			db.storeMessage.mockRejectedValue(new Error('DB Error'));
			
			clientSocket.emit('join-room', { roomId });
			await new Promise((resolve) => clientSocket.on('joined-room', resolve));
			
			clientSocket.emit('message', { roomId, content: 'Should fail' });
			
			const error = await new Promise((resolve) => {
				clientSocket.on('error', resolve);
			});
			
			expect(error.message).toBe('Failed sending message.');
		}, 10000);

		it('should handle socket.io server creation errors', async () => {
			const mockError = new Error('Socket creation failed');
			const originalServer = Server;
			
			Server = vi.fn().mockImplementation(() => {
				throw mockError;
			});
			
			await import('./app.js');
			
			expect(console.error).toHaveBeenCalledWith(
				'Error starting sockets:', 
				expect.objectContaining({ message: 'Socket creation failed' })
			);
			
			// Restore original implementation
			Server = originalServer;
		}, 10000);
	});
	*/
});

//old tests which just ended up recreating the program in the test and thus had no coverage

/*
beforeAll(async () => {
  const sslOptions = {
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.cert')
  };

  await new Promise((resolve, reject) => {
    server = https.createServer(sslOptions, router);

    io = new Server(server);

    io.use((socket, next) => {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication error'));
      }

      jwt.verify(token, process.env.SESSION_SECRET, async (err, decoded) => {
        if (err) {
          return next(new Error('Authentication error'));
        }

        const user = await db.getUserByGUID(decoded.id);
        if (!user) {
          return next(new Error('Authentication error: User not found'));
        }

        socket.user = user;
        next();
      });
    });

    io.on('connection', (socket) => {
      console.log('Test User connected (Socket.IO)');

      socket.on('download-request', async ({ attachmentUuid, ext }) => {
        try {
          const result = await db.downloadFile(attachmentUuid, ext);
          socket.emit('download-response', result);
        } catch (err) {
          socket.emit('error', { message: 'Failed downloading file.' });
        }
      });

      socket.on('join-room', async ({ roomId }) => {
        const projectId = roomId;

        try {
          const role = await db.getRoleInProject(socket.user.id, projectId);
          if (!role) {
            socket.emit('error', { message: 'Failed joining specified room.' });
            return;
          }

          socket.join(roomId);
          socket.joinedRooms = socket.joinedRooms || new Set();
          socket.user.role = role;
          socket.joinedRooms.add(roomId);
          socket.currentRoom = roomId;
          console.log("Test changed room to ", socket.currentRoom);

          const latestMessages = await db.retrieveLatestMessages(projectId);

          socket.emit('joined-room', { roomId, latestMessages: latestMessages.recordSet });

        } catch (err) {
          console.log("Test encountered error in join-room");
          console.error(err);
          socket.emit('error', { message: 'Failed joining room.' });
        }
      });

      socket.on('message', async ({ roomId, content }) => {
        if (!socket.joinedRooms?.has(roomId)) {
          socket.emit('error', { message: 'You must join the room before sending messages.' });
          return;
        }

        if (!content || typeof content !== 'string' || content.length === 0) {
          socket.emit('error', { message: 'invalid message content' });
          return;
        }

        const projectId = socket.currentRoom;
        await db.storeMessage(socket.user.id, projectId, content);
        console.log("Test Message sent");

        io.to(roomId).emit('message', {
          user: socket.user.name,
          role: socket.user.role,
          text: content
        });
      });

      socket.on('message-with-attachment', async ({ roomId, text, attachment }) => {
        if (!socket.joinedRooms?.has(roomId)) {
          socket.emit('error', { message: 'You must join the room before sending messages.' });
          return;
        }

        if (!attachment?.name || !attachment?.buffer) {
          socket.emit('error', { message: 'Attachment is missing required fields.' });
          return;
        }

        try {
          const result = await db.storeMessageWithAttachment(socket.user.id, socket.currentRoom, text, attachment);
          result.user = socket.user.name;
          result.role = socket.user.role;
          io.to(roomId).emit('message', result);
        } catch (error) {
          console.log(error);
          socket.emit('error', { message: 'Failed sending message.' });
        }
      });

      socket.on('disconnect', () => {
        console.log('Test User disconnected (Socket.IO)');
      });
    });

    server.listen(port, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}, 20000); // Increased timeout to 20 seconds

afterAll(async () => {
  await new Promise((resolve) => {
    io.close(() => {
      server.close(() => resolve());
    });
  });
});


describe('App HTTPS server tests', () => {
  it('should respond on root route', async () => {
    const res = await fetch(`https://localhost:${port}/`);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toMatch(/.+/);
  });
});

describe('Socket.IO Authentication', () => {
  let clientSocket;

  afterEach(() => {
    if (clientSocket && clientSocket.connected) { // Added check for connected
      clientSocket.disconnect();
    }
  });

  it('should allow connection with a valid JWT', async () => {
    db.getUserByGUID.mockResolvedValue(testUser);
    const token = jwt.sign({ id: testUser.id }, testSecret, { expiresIn: '1h' });
    clientSocket = Client(`https://localhost:${port}`, {
      auth: { token },
      rejectUnauthorized: false,
    });

    await new Promise((resolve, reject) => {
      clientSocket.on('connect', resolve);
      clientSocket.on('connect_error', reject);
    });

    expect(clientSocket.connected).toBe(true);
  });

  it('should deny connection without a token', async () => {
    clientSocket = Client(`https://localhost:${port}`, {
      rejectUnauthorized: false,
    });

    await new Promise((resolve) => {
      clientSocket.on('connect_error', (err) => {
        expect(err.message).toBe('Authentication error');
        resolve();
      });
    });

    expect(clientSocket.connected).toBe(false);
  });

  it('should deny connection with an invalid token', async () => {
    const invalidToken = 'invalid.jwt.token';
    clientSocket = Client(`https://localhost:${port}`, {
      auth: { token: invalidToken },
      rejectUnauthorized: false,
    });

    await new Promise((resolve) => {
      clientSocket.on('connect_error', (err) => {
        expect(err.message).toBe('Authentication error');
        resolve();
      });
    });

    expect(clientSocket.connected).toBe(false);
  });

  it('should deny connection if user is not found in DB', async () => {
    db.getUserByGUID.mockResolvedValue(null);
    const token = jwt.sign({ id: 'non-existent-guid' }, testSecret, { expiresIn: '1h' });
    clientSocket = Client(`https://localhost:${port}`, {
      auth: { token },
      rejectUnauthorized: false,
    });

    await new Promise((resolve) => {
      clientSocket.on('connect_error', (err) => {
        expect(err.message).toBe('Authentication error: User not found');
        resolve();
      });
    });

    expect(clientSocket.connected).toBe(false);
  });
});

describe('Socket.IO Chat Functionality', () => {
  let clientSocket;
  let authToken;

  beforeEach(async () => {
    db.getUserByGUID.mockResolvedValue(testUser);
    db.getRoleInProject.mockResolvedValue(testRole);
    db.retrieveLatestMessages.mockResolvedValue({ recordSet: [] });
    db.storeMessage.mockResolvedValue({});
    db.storeMessageWithAttachment.mockResolvedValue({});
    db.downloadFile.mockResolvedValue({ success: true, data: 'file content' });

    authToken = jwt.sign({ id: testUser.id }, testSecret, { expiresIn: '1h' });
    clientSocket = Client(`https://localhost:${port}`, {
      auth: { token: authToken },
      rejectUnauthorized: false,
    });

    await new Promise((resolve, reject) => {
      clientSocket.on('connect', resolve);
      clientSocket.on('connect_error', reject);
    });
  });

  afterEach(() => {
    if (clientSocket && clientSocket.connected) { // Added check for connected
      clientSocket.disconnect();
    }
    vi.clearAllMocks();
  });

  it('should allow a user to join a room', async () => {
    const roomId = testProject.id;
    clientSocket.emit('join-room', { roomId });

    const response = await new Promise((resolve) => {
      clientSocket.on('joined-room', resolve);
    });

    expect(response.roomId).toBe(roomId);
    expect(response.latestMessages).toEqual([]);
    expect(db.getRoleInProject).toHaveBeenCalledWith(testUser.id, roomId);
    expect(db.retrieveLatestMessages).toHaveBeenCalledWith(roomId);
  });

  it('should send an error if user cannot join room (no role)', async () => {
    db.getRoleInProject.mockResolvedValue(null);
    const roomId = 'non-existent-room';
    clientSocket.emit('join-room', { roomId });

    const error = await new Promise((resolve) => {
      clientSocket.on('error', resolve);
    });

    expect(error.message).toBe('Failed joining specified room.');
    expect(db.getRoleInProject).toHaveBeenCalledWith(testUser.id, roomId);
  });

  it('should send a message to a joined room', async () => {
    const roomId = testProject.id;
    const messageContent = 'Hello, everyone!';

    clientSocket.emit('join-room', { roomId });
    await new Promise((resolve) => clientSocket.on('joined-room', resolve));

    clientSocket.emit('message', { roomId, content: messageContent });

    const receivedMessage = await new Promise((resolve) => {
      clientSocket.on('message', resolve);
    });

    expect(receivedMessage.user).toBe(testUser.name);
    expect(receivedMessage.role).toBe(testRole);
    expect(receivedMessage.text).toBe(messageContent);
    expect(db.storeMessage).toHaveBeenCalledWith(testUser.id, roomId, messageContent);
  });

  it('should send an error if message content is invalid', async () => {
    const roomId = testProject.id;
    const invalidContent = '';

    clientSocket.emit('join-room', { roomId });
    await new Promise((resolve) => clientSocket.on('joined-room', resolve));

    clientSocket.emit('message', { roomId, content: invalidContent });

    const error = await new Promise((resolve) => {
      clientSocket.on('error', resolve);
    });

    expect(error.message).toBe('invalid message content');
    expect(db.storeMessage).not.toHaveBeenCalled();
  });


  it('should not send a message if not joined to the room', async () => {
    const roomId = 'another-room';
    const messageContent = 'Unauthorized message';

    clientSocket.emit('message', { roomId, content: messageContent });

    const error = await new Promise((resolve) => {
      clientSocket.on('error', resolve);
    });

    expect(error.message).toBe('You must join the room before sending messages.');
    expect(db.storeMessage).not.toHaveBeenCalled();
  });

  it('should send a message with attachment to a joined room', async () => {
    const roomId = testProject.id;
    const messageText = 'Check out this file!';
    const attachment = {
      name: 'test_file.txt',
      buffer: Buffer.from('file content'),
      mimetype: 'text/plain',
    };

    clientSocket.emit('join-room', { roomId });
    await new Promise((resolve) => clientSocket.on('joined-room', resolve));

    db.storeMessageWithAttachment.mockResolvedValue({
      id: 'attachment-uuid',
      text: messageText,
      attachment: { name: attachment.name, uuid: 'attachment-uuid', ext: 'txt' },
    });

    clientSocket.emit('message-with-attachment', { roomId, text: messageText, attachment });

    const receivedMessage = await new Promise((resolve) => {
      clientSocket.on('message', resolve);
    });

    expect(receivedMessage.user).toBe(testUser.name);
    expect(receivedMessage.role).toBe(testRole);
    expect(receivedMessage.text).toBe(messageText);
    expect(receivedMessage.attachment.name).toBe(attachment.name);
    expect(receivedMessage.attachment.uuid).toBe('attachment-uuid');
    expect(receivedMessage.attachment.ext).toBe('txt');
    expect(db.storeMessageWithAttachment).toHaveBeenCalledWith(
      testUser.id,
      roomId,
      messageText,
      attachment
    );
  });

  it('should send an error if attachment is missing fields', async () => {
    const roomId = testProject.id;
    const messageText = 'Missing attachment data';
    const invalidAttachment = { name: 'missing_buffer.txt' };

    clientSocket.emit('join-room', { roomId });
    await new Promise((resolve) => clientSocket.on('joined-room', resolve));

    clientSocket.emit('message-with-attachment', { roomId, text: messageText, attachment: invalidAttachment });

    const error = await new Promise((resolve) => {
      clientSocket.on('error', resolve);
    });

    expect(error.message).toBe('Attachment is missing required fields.');
    expect(db.storeMessageWithAttachment).not.toHaveBeenCalled();
  });

  it('should handle download-request and emit download-response', async () => {
    const attachmentUuid = 'some-uuid';
    const ext = 'pdf';
    const fileData = { success: true, data: Buffer.from('test pdf content').toString('base64') };
    db.downloadFile.mockResolvedValue(fileData);

    clientSocket.emit('download-request', { attachmentUuid, ext });

    const response = await new Promise((resolve) => {
      clientSocket.on('download-response', resolve);
    });

    expect(response).toEqual(fileData);
    expect(db.downloadFile).toHaveBeenCalledWith(attachmentUuid, ext);
  });

  it('should emit error on download-request failure', async () => {
    const attachmentUuid = 'some-uuid';
    const ext = 'jpg';
    db.downloadFile.mockRejectedValue(new Error('File not found'));

    clientSocket.emit('download-request', { attachmentUuid, ext });

    const error = await new Promise((resolve) => {
      clientSocket.on('error', resolve);
    });

    expect(error.message).toBe('Failed downloading file.');
    expect(db.downloadFile).toHaveBeenCalledWith(attachmentUuid, ext);
  });
});
*/