import {
    db,
    collection,
    addDoc,
    serverTimestamp,
    auth
} from '../../../firebase-config.js';

class AuditLogger {
    constructor() {
        this.batchedChanges = {
            actions: [],
            oldValues: {},
            newValues: {}
        };
    }

    // Helper to get user role
    async getUserRole() {
        if (!auth.currentUser) return 'Unknown';

        try {
            const { doc, getDoc } = await import('../../../firebase-config.js');
            const userDoc = await getDoc(doc(db, 'accounts', auth.currentUser.uid));
            const role = userDoc.exists() ? userDoc.data().role : 'Unknown';
            // Format role for display
            return role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
        } catch (error) {
            console.error('Error getting user role:', error);
            return 'Unknown';
        }
    }

    // Start batching changes for a single save operation
    startBatch(documentId, category, clientName) {
        this.batchedChanges = {
            documentId,
            category,
            clientName,
            actions: [],
            oldValues: {},
            newValues: {}
        };
    }

    // Add a change to the current batch
    addChange(actionType, oldValue, newValue) {
        this.batchedChanges.actions.push(actionType);
        this.batchedChanges.oldValues[actionType] = oldValue;
        this.batchedChanges.newValues[actionType] = newValue;
    }

    // Commit the batched changes as a single audit log entry
    async commitBatch() {
        if (this.batchedChanges.actions.length === 0) return;

        try {
            const role = await this.getUserRole();

            const auditEntry = {
                documentId: this.batchedChanges.documentId,
                category: this.batchedChanges.category,
                profileAffected: this.batchedChanges.clientName,
                actionType: this.batchedChanges.actions.join(', '),
                modifiedBy: auth.currentUser.email,
                modifiedByRole: role,
                oldValue: JSON.stringify(this.batchedChanges.oldValues),
                newValue: JSON.stringify(this.batchedChanges.newValues),
                timestamp: serverTimestamp()
            };

            await addDoc(collection(db, 'audit-logs'), auditEntry);
            console.log('Audit log created:', auditEntry);

            // Reset batch
            this.batchedChanges = {
                actions: [],
                oldValues: {},
                newValues: {}
            };

        } catch (error) {
            console.error('Error creating audit log:', error);
        }
    }

    // Simple log for single actions (like "Started editing")
    async logSimpleAction(documentId, category, clientName, actionType) {
        try {
            const role = await this.getUserRole();

            const auditEntry = {
                documentId,
                category,
                profileAffected: clientName,
                actionType,
                modifiedBy: auth.currentUser.email,
                modifiedByRole: role,
                oldValue: '--',
                newValue: '--',
                timestamp: serverTimestamp()
            };

            await addDoc(collection(db, 'audit-logs'), auditEntry);
            console.log('Audit log created:', auditEntry);

        } catch (error) {
            console.error('Error creating audit log:', error);
        }
    }

    // Helper to format services array for display
    formatServices(services) {
        if (!services || services.length === 0) return 'None';
        return services.join(', ');
    }

    // Helper to format payment status
    // Helper to format payment status
    formatPaymentStatus(isChecked) {
        return isChecked ? 'Paid' : 'Not Paid';
    }

    // Helper to format schedule status
    formatScheduleStatus(isDone) {
        return isDone ? 'Schedule Completed' : 'Schedule Pending';
    }
}

// Create singleton instance
const auditLogger = new AuditLogger();
export default auditLogger;