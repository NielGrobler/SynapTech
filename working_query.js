
import https from 'https';
import fs from 'fs';

import { DatabaseQueryBuilder, DatabaseQuery } from './db/query.js';

const agent = new https.Agent({
	ca: fs.readFileSync('./db/server.crt'),
	rejectUnauthorized: true
});

let query = new DatabaseQueryBuilder(`
	SELECT *
	FROM users
	WHERE id = {{id}};
`)
	.addParam('id', 1)
	.build();


query.sendUsing(agent)
	.then(response => {
		//console.log(response.data);
	}).catch(error => {
		console.error('Request failed:', error.message);
	});
