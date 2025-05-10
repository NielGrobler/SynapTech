import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

class Message {
	constructor(user, content) {
		this.user = user;
		this.content = content;
	}

	toString() {
		return JSON.stringify(this);
	}
}

class ConnectedUser {
	constructor(name) {
		this.name = name;
	}
}

const userInfoMap = new Map();

io.on('connection', (socket) => {
	console.log(`New client connected: ${socket.id}`);
	userInfoMap[socket.id] = new ConnectedUser('Allen Grey');

	socket.on('message-chat', (message) => {
		console.log(`Message from ${socket.id}: ${message.content}`);
		socket.broadcast.emit('message-chat', new Message(socket.id, message.content));
	});

	socket.on('join-room', (room) => {
		// do validation and join this room
	});

	socket.on('disconnect', () => {
		console.log(`Client disconnected: ${socket.id}`);
	});
});

server.listen(3000, () => {
	console.log('Server listening on http://localhost:3000');
});

