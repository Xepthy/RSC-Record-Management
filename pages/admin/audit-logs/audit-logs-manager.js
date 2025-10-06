import {
    db,
    collection,
    query,
    orderBy,
    onSnapshot,
    doc,
    getDoc
} from '../../../firebase-config.js';

class AuditLogsManager {
    constructor(parentInstance) {
        this.parent = parentInstance;
    }

    async setupAuditLogsListener() {
        try {
            console.log('Setting up audit logs listener...');
            this.parent.uiRenderer.showLoading();

            const auditQuery = query(
                collection(db, 'audit-logs'),
                orderBy('timestamp', 'desc')
            );

            this.parent.unsubscribeAuditLogs = onSnapshot(auditQuery, (snapshot) => {
                console.log('Audit logs snapshot received:', snapshot.size, 'documents');

                this.parent.auditLogs = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                console.log('Processed audit logs:', this.parent.auditLogs.length);

                if ($('#auditLogsNav').hasClass('active')) {
                    this.parent.uiRenderer.showAuditLogs();
                }

            }, (error) => {
                console.error('Error listening to audit logs:', error);
                this.parent.uiRenderer.showError('Failed to load audit logs: ' + error.message);
            });

        } catch (error) {
            console.error('Error setting up audit logs listener:', error);
            this.parent.uiRenderer.showError('Failed to initialize audit logs: ' + error.message);
        }
    }

    formatTimestamp(timestamp) {
        if (!timestamp) return { date: 'Unknown', time: '' };

        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

        const dateStr = date.toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
        });

        const timeStr = date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });

        return { date: dateStr, time: timeStr };
    }

    async showAuditLogModal(logId) {
        const log = this.parent.auditLogs.find(l => l.id === logId);
        if (!log) return;

        // Try to fetch the actual document
        let documentData = null;
        let documentExists = true;

        try {
            let docRef;
            if (log.category === 'Inquiries') {
                // Check inquiries first, then archive
                docRef = doc(db, 'inquiries', log.documentId);
                let docSnap = await getDoc(docRef);

                if (!docSnap.exists()) {
                    docRef = doc(db, 'inquiries_archive', log.documentId);
                    docSnap = await getDoc(docRef);
                }

                documentData = docSnap.exists() ? docSnap.data() : null;
            } else if (log.category === 'In Progress') {
                // Check inProgress first, then completed
                docRef = doc(db, 'inProgress', log.documentId);
                let docSnap = await getDoc(docRef);

                if (!docSnap.exists()) {
                    docRef = doc(db, 'completed', log.documentId);
                    docSnap = await getDoc(docRef);
                }

                documentData = docSnap.exists() ? docSnap.data() : null;
            } else if (log.category === 'Completed') {
                docRef = doc(db, 'completed', log.documentId);
                const docSnap = await getDoc(docRef);
                documentData = docSnap.exists() ? docSnap.data() : null;
            }

            documentExists = documentData !== null;

        } catch (error) {
            console.error('Error fetching document:', error);
            documentExists = false;
        }

        if (!documentExists) {
            this.parent.inquiryManager.showToast('This item has been moved or deleted', 'warning');
            return;
        }

        // Show modal based on category
        if (log.category === 'Inquiries') {
            if (documentData.processed) {
                this.parent.inquiryManager.showArchivedInquiryDetails(log.documentId);
            } else {
                this.parent.inquiryManager.showInquiryDetails(log.documentId);
            }
        } else if (log.category === 'In Progress') {
            this.parent.inProgressManager.showInProgressDetails(log.documentId);
        } else if (log.category === 'Completed') {
            this.parent.completedManager.showCompletedDetails(log.documentId);
        }
    }
}

export default AuditLogsManager;