// restore.js - Firestore Backup Restore Script
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json'); // You'll need to download this

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'rsc-2025.firebasestorage.app'
});

const db = admin.firestore();

// Function to restore Firestore data
async function restoreFirestore(backupFilePath) {
    try {
        console.log('Reading backup file...');
        const backupData = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));

        console.log('Starting restore...');

        // Iterate through each collection
        for (const [collectionName, documents] of Object.entries(backupData)) {
            console.log(`\nRestoring collection: ${collectionName}`);
            console.log(`Total documents: ${documents.length}`);

            const collectionRef = db.collection(collectionName);

            // Restore each document
            for (const doc of documents) {
                try {
                    await collectionRef.doc(doc.id).set(doc.data, { merge: true });
                    console.log(`  ✓ Restored document: ${doc.id}`);
                } catch (error) {
                    console.error(`  ✗ Failed to restore document ${doc.id}:`, error.message);
                }
            }

            console.log(`✓ Collection ${collectionName} restored!`);
        }

        console.log('\n🎉 Restore completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Restore failed:', error);
        process.exit(1);
    }
}

// Get backup file path from command line argument
const backupFilePath = process.argv[2];

if (!backupFilePath) {
    console.error('❌ Please provide the backup file path!');
    console.log('\nUsage: node restore.js <path-to-backup-file>');
    console.log('Example: node restore.js ./backup-2025-10-11T12-15-01.456Z.json');
    process.exit(1);
}

if (!fs.existsSync(backupFilePath)) {
    console.error(`❌ Backup file not found: ${backupFilePath}`);
    process.exit(1);
}

// Start restore
console.log('=================================');
console.log('FIRESTORE RESTORE SCRIPT');
console.log('=================================');
console.log(`Backup file: ${backupFilePath}`);
console.log('=================================\n');

restoreFirestore(backupFilePath);