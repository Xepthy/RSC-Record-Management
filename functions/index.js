/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { setGlobalOptions } = require("firebase-functions");
const { onRequest } = require("firebase-functions/https");
const logger = require("firebase-functions/logger");
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { Storage } = require('@google-cloud/storage');
const storage = new Storage();
// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });


const { onCall } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

// Initialize Admin SDK (do this ONCE at the top)
admin.initializeApp({
    storageBucket: 'rsc-2025.firebasestorage.app'
});

// Function 1: Toggle Disable Account
exports.toggleDisableAccount = onCall(
    { region: 'asia-southeast1' },
    async (request) => {
        // Check if user is authenticated and is super_admin
        if (!request.auth) {
            throw new Error('User must be logged in');
        }

        const callerUid = request.auth.uid;
        const callerDoc = await admin.firestore().collection('accounts').doc(callerUid).get();

        if (!callerDoc.exists || callerDoc.data().role !== 'super_admin') {
            throw new Error('Only super admin can disable accounts');
        }

        const { uid, disable } = request.data;

        try {
            // Update auth status
            await admin.auth().updateUser(uid, {
                disabled: disable
            });

            // Update Firestore
            await admin.firestore().collection('accounts').doc(uid).update({
                isDisabled: disable,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedBy: callerUid
            });

            return { success: true, message: `Account ${disable ? 'disabled' : 'enabled'} successfully` };
        } catch (error) {
            throw new Error(error.message);
        }
    }
);

// Function 2: Delete Account
exports.deleteUserAccount = onCall(
    { region: 'asia-southeast1' },
    async (request) => {
        // Check if user is authenticated and is super_admin
        if (!request.auth) {
            throw new Error('User must be logged in');
        }

        const callerUid = request.auth.uid;
        const callerDoc = await admin.firestore().collection('accounts').doc(callerUid).get();

        if (!callerDoc.exists || callerDoc.data().role !== 'super_admin') {
            throw new Error('Only super admin can delete accounts');
        }

        const { uid } = request.data;

        // Prevent deleting own account
        if (uid === callerUid) {
            throw new Error('Cannot delete your own account');
        }

        try {
            // Delete from Auth
            await admin.auth().deleteUser(uid);

            // Delete from Firestore
            await admin.firestore().collection('accounts').doc(uid).delete();

            return { success: true, message: 'Account deleted successfully' };
        } catch (error) {
            throw new Error(error.message);
        }
    }
);



// ========== BACKUP FUNCTIONS ==========

// Backup Firestore Database using official export
exports.backupDatabase = onSchedule({
    schedule: '*/5 * * * *', // Every 5 minutes for testing
    // schedule: '0 0 1 * *', // Uncomment for monthly
    timeZone: 'Asia/Manila',
    region: 'asia-southeast1',
    memory: '512MiB',
    timeoutSeconds: 300
}, async (event) => {
    const projectId = 'rsc-2025';
    const bucketName = 'rsc-2025-backups';
    const timestamp = new Date().toISOString().replace(/:/g, '-');

    try {
        const { google } = require('googleapis');
        const auth = new google.auth.GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/datastore']
        });

        const client = await auth.getClient();
        const firestore = google.firestore('v1');

        const databasePath = `projects/${projectId}/databases/(default)`;
        const outputUriPrefix = `gs://${bucketName}/firestore-exports/${timestamp}`;

        const response = await firestore.projects.databases.exportDocuments({
            name: databasePath,
            auth: client,
            requestBody: {
                outputUriPrefix: outputUriPrefix,
                collectionIds: []
            }
        });

        console.log(`Firestore export started: ${outputUriPrefix}`);
        console.log(`Operation: ${response.data.name}`);

        return null;
    } catch (error) {
        console.error('Firestore export failed:', error);
        throw error;
    }
});


// Backup Cloud Storage (Files)
exports.backupStorage = onSchedule({
    schedule: '*/5 * * * *', // Every 5 minutes for testing
    // schedule: '0 0 1 * *', // Uncomment for monthly
    timeZone: 'Asia/Manila',
    region: 'asia-southeast1'
}, async (event) => {
    const sourceBucket = 'rsc-2025.firebasestorage.app';
    const backupBucket = 'rsc-2025-backups';
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const backupFolder = `storage-backups/backup-${timestamp}/`;

    try {
        const source = storage.bucket(sourceBucket);
        const destination = storage.bucket(backupBucket);

        const [files] = await source.getFiles();

        const copyPromises = files.map(async (file) => {
            const destFileName = `${backupFolder}${file.name}`;
            await file.copy(destination.file(destFileName));
            console.log(`Copied: ${file.name} to ${destFileName}`);
        });

        await Promise.all(copyPromises);
        console.log(`Storage backup successful: ${files.length} files backed up`);
        return null;
    } catch (error) {
        console.error('Storage backup failed:', error);
        throw error;
    }
});

// Cleanup old backups (keep only last 10 backups)
exports.cleanupOldBackups = onSchedule({
    schedule: '0 2 * * *', // Daily at 2 AM
    timeZone: 'Asia/Manila',
    region: 'asia-southeast1'
}, async (event) => {
    const bucketName = 'rsc-2025-backups';
    const bucket = storage.bucket(bucketName);

    try {
        const [dbFiles] = await bucket.getFiles({ prefix: 'firestore-exports/' });
        if (dbFiles.length > 10) {
            const filesToDelete = dbFiles
                .sort((a, b) => new Date(b.metadata.timeCreated) - new Date(a.metadata.timeCreated))
                .slice(10);

            await Promise.all(filesToDelete.map(file => file.delete()));
            console.log(`Deleted ${filesToDelete.length} old database backups`);
        }

        const [storageFolders] = await bucket.getFiles({ prefix: 'storage-backups/' });
        const folders = [...new Set(storageFolders.map(f =>
            f.name.split('/').slice(0, 2).join('/')
        ))];

        if (folders.length > 10) {
            const foldersToDelete = folders.slice(10);
            for (const folder of foldersToDelete) {
                const [files] = await bucket.getFiles({ prefix: folder });
                await Promise.all(files.map(file => file.delete()));
            }
            console.log(`Deleted ${foldersToDelete.length} old storage backup folders`);
        }

        return null;
    } catch (error) {
        console.error('Cleanup failed:', error);
        throw error;
    }
});