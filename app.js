import https from 'https';
import fs from 'fs';
import router from './router.js';

const port = process.env.PORT || 3000;

if (process.env.NODE_ENV === 'production') {
	router.listen(port, () => {
		console.log(`HTTPS server running in production mode`);
	});
} else { //only other option is running locally if it's not set, or rather when it is unspecified.
	const sslOptions = {
		key: fs.readFileSync('server.key'),
		cert: fs.readFileSync('server.cert')
	};

	https.createServer(sslOptions, router).listen(port, () => {
		console.log(`HTTPS server running locally at https://localhost:${port}`);
	});
}