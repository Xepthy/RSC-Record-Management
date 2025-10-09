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
admin.initializeApp();

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