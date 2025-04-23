import https from 'https';
import fs from 'fs';
import router from './router.js';

const sslOptions = {
	key: fs.readFileSync('server.key'),
	cert: fs.readFileSync('server.cert')
};

const port = process.env.PORT || 3000;

https.createServer(sslOptions, router).listen(port, () => {
	console.log(`HTTPS server running at https://localhost:${port}`);
});

