import axios from 'axios';
import { Query } from './query.js';
import dotenv from 'dotenv';

dotenv.config();

const defaultConfig = {
	key: process.env.DB_API_KEY,
	host: process.env.DB_HOST,
	port: process.env.DB_PORT,
}

class DatabaseConnection {
	constructor(config) {
		this.url = `https://${config.host}:${config.port}/`;
		this.key = config.key;
	}
}

// Set up the API endpoint and the API key
const apiUrl = 'http://localhost:8089/';
const apiKey = 'your_api_key';  // Replace with the actual API key from your .env

/**
 * Executes a SQL query.
 * 
 * @param {Query} query - The query object containing the statement and params.
 * @returns {string} - A string representing the query and its parameters.
 */
const makeQuery = (query) => {
	axios.post(apiUrl, queryData, {
		headers: {
			'Content-Type': 'application/json',
			'X-API-Key': apiKey,
		},
	})
		.then(response => {
			// Handle the successful response
			console.log('Query result:', response.data);
		})
		.catch(error => {
			// Handle the error response
			if (error.response) {
				// Server responded with a status other than 2xx
				console.error('Error response:', error.response.data);
			} else if (error.request) {
				// No response was received
				console.error('No response received:', error.request);
			} else {
				// Error setting up the request
				console.error('Request error:', error.message);
			}
		});
}

// Prepare the query and params to send
const queryData = {
	query: 'SELECT * FROM your_table WHERE column_name = {{param}}',
	params: {
		param: 'some_value',  // Replace with your actual value
	},
};

// Send the request to the Go server

