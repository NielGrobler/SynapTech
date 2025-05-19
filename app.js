import https from 'https';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import fs from 'fs';

import db from './db/db.js';
import router from './router.js';

const port = process.env.PORT || 3000;

router.listen(port, () => {
		console.log(`HTTPS server running in production mode`);
	});
