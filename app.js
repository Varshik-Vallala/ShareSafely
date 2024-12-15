// const express = require("express")
// import multer from "multer";
// const upload = multer({ dest: "uploads/" });
// const app = express();

// app.use(express.static('public'))

// app.listen(3000, () => {
//     console.log('Server is running on http://localhost:3000');
//   });

//

// const express = require('express');
// const multer = require('multer');
// const path = require('path');

// const app = express();
// const port = process.env.PORT || 8080;

// // Configure multer for file uploads
// const upload = multer({ dest: 'uploads/' });

// // Serve static files
// app.use(express.static(path.join(__dirname, 'public')));

// // File upload endpoint
// app.post('/upload', upload.single('file'), (req, res) => {
//     if (!req.file) {
//         return res.status(400).send('No file uploaded.');
//     }
//     res.send(`File uploaded successfully: ${req.file.originalname}`);
// });

// // Start the server
// app.listen(port, () => {
//     console.log(`Server running on http://localhost:${port}`);
// });


require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const { BlobServiceClient, generateBlobSASQueryParameters, StorageSharedKeyCredential, SASProtocol } = require('@azure/storage-blob');
const { v4: uuidv4 } = require('uuid'); // For generating unique blob names
require('dotenv').config();


const app = express();
const port = process.env.PORT || 8080;

// Configure multer for temporary file storage
const upload = multer({ dest: 'uploads/' });

// Azure Storage Configuration
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);




// Serve static files
app.use(express.static(path.join(__dirname, 'public')));


// app.post('/upload', upload.single('file'), async (req, res) => {
//     if (!req.file) {
//         return res.status(400).send('No file uploaded.');
//     }

//     try {
//         // Get container client
//         const containerClient = blobServiceClient.getContainerClient('uploadedfiles');

//         // Generate blob client
//         const blobClient = containerClient.getBlockBlobClient(req.file.originalname);

//         // Upload file
//         await blobClient.uploadFile(req.file.path);

//         // Clean up local file (optional)
//         const fs = require('fs');
//         fs.unlinkSync(req.file.path);

//         res.send(`File uploaded successfully to Azure Blob Storage: ${req.file.originalname}`);
//     } catch (error) {
//         console.error('Upload failed:', error);
//         res.status(500).send('File upload failed.');
//     }
// });


app.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    try {
        // Get container client
        const containerName = 'uploadedfiles';
        const containerClient = blobServiceClient.getContainerClient(containerName);

        // Generate a unique file name
        const uniqueFileName = `${uuidv4()}-${req.file.originalname}`;
        const blobClient = containerClient.getBlockBlobClient(uniqueFileName);

        // Upload file to Azure Blob Storage
        await blobClient.uploadFile(req.file.path);

        // Generate SAS token for the uploaded file
        const expiryDate = new Date();
        expiryDate.setMinutes(expiryDate.getMinutes() + 30); // SAS valid for 30 minutes

        const sasToken = generateBlobSASQueryParameters(
            {
                containerName,
                blobName: uniqueFileName,
                permissions: 'r', // Read-only permission
                startsOn: new Date(),
                expiresOn: expiryDate,
                protocol: SASProtocol.Https,
            },
            sharedKeyCredential
        ).toString();

        // Generate the file's URL with SAS token
        const fileUrl = `${blobClient.url}?${sasToken}`;

        // Clean up local file (optional)
        const fs = require('fs');
        fs.unlinkSync(req.file.path);

        res.json({
            message: 'File uploaded successfully!',
            fileUrl,
        });
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).send('File upload failed.');
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
