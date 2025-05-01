import {
	BlobServiceClient,
	StorageSharedKeyCredential,
	generateBlobSASQueryParameters,
	BlobSASPermissions
}
	from '@azure/storage-blob';

import dotenv from 'dotenv';

dotenv.config();

const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
const containerName = process.env.AZURE_CONTAINER_NAME;

const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

const blobServiceClient = BlobServiceClient.fromConnectionString(
	process.env.AZURE_STORAGE_CONNECTION_STRING
);

console.log("Connected to Azure Blob storage.");

const containerClient = blobServiceClient.getContainerClient(containerName);

async function upload(file) {
	const blobName = `${Date.now()}-${file.originalname}`;
	const blockBlobClient = containerClient.getBlockBlobClient(blobName);

	await blockBlobClient.uploadData(file.buffer, {
		blobHTTPHeaders: { blobContentType: file.mimetype },
	});

	return blobName;
}

function getSasUrl(blobName, expiresInHours = 1000) {
	const expiryDate = new Date(new Date().getTime() + expiresInHours * 60 * 60 * 1000);

	const sasToken = generateBlobSASQueryParameters({
		containerName,
		blobName,
		permissions: BlobSASPermissions.parse("r"),
		expiresOn: expiryDate
	}, sharedKeyCredential).toString();

	return `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}?${sasToken}`;
}

export default {
	upload,
	getSasUrl
}


