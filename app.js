import https from 'https';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import fs from 'fs';

import db from './db/db.js';
import router from './router.js';

const sslOptions = {
	key: fs.readFileSync('server.key'),
	cert: fs.readFileSync('server.cert')
};

const port = process.env.PORT || 3000;

const server = https.createServer(sslOptions, router)
const io = new Server(server);

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

		socket.user = user;
		next();
	});
});

io.on('connection', (socket) => {
	console.log('User connected');

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
			console.log("Changed room to ", socket.currentRoom);

			const latestMessages = await db.retrieveLatestMessages(projectId);

			socket.emit('joined-room', { roomId, latestMessages: latestMessages.recordSet });

		} catch (err) {
			console.log("encoutered error in join-room");
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
		console.log("LOGGING");

		io.to(roomId).emit('message', {
			user: socket.user.name,
			role: socket.role,
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
			result.role = socket.role;
			io.to(roomId).emit('message', result);
		} catch (error) {
			console.log(error);
			socket.emit('error', { message: 'Failed sending message.' });
		}
	});

	socket.on('disconnect', () => {
		console.log('User disconnected');
	});
});

console.log("Preparing to start server...");
server.listen(port, () => {
	console.log(`Server is running on http://localhost:${port}`);
});
