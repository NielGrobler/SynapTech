import { decodeBase64 } from './db/connectionInterfaces.js';
import https from 'https';
import axios from 'axios';
import { QueryResult } from './db/query.js';
import dotenv from 'dotenv';

dotenv.config();

const agent = new https.Agent({
	rejectUnauthorized: false
});

const showTables = async () => {
	const url = `https://${process.env.DB_HOST}:${process.env.DB_PORT}/show`;
	const apiKey = process.env.DB_API_KEY;

	try {
		const res = await axios.get(url, {
			headers: {
				'X-API-Key': apiKey
			},
			httpsAgent: agent
		});
		const result = new QueryResult(decodeBase64(res.data));
		console.log(result);
	} catch (err) {
		console.error(err);
	}
}

const describeTable = async (name) => {
	const url = `https://${process.env.DB_HOST}:${process.env.DB_PORT}/describe/${name}`;
	const apiKey = process.env.DB_API_KEY;

	try {
		const res = await axios.get(url, {
			headers: {
				'X-API-Key': apiKey
			},
			httpsAgent: agent
		});
		const result = new QueryResult(decodeBase64(res.data));
		console.log(result);
	} catch (err) {
		console.error(err);
	}
}

/* Here */
await describeTable("Account");
await showTables();

