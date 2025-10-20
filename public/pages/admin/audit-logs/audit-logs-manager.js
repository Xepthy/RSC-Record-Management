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

        // Format as mm/dd/yyyy
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        const dateStr = `${day}/${month}/${year}`;

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

        try {
            let documentData = null;
            let isArchived = false;
            let actualCategory = log.category;

            if (log.category === 'Inquiries') {
                const [archiveSnap, inquirySnap] = await Promise.all([
                    getDoc(doc(db, 'inquiries_archive', log.documentId)),
                    getDoc(doc(db, 'inquiries', log.documentId))
                ]);

                if (archiveSnap.exists()) {
                    documentData = { id: log.documentId, ...archiveSnap.data() };
                    isArchived = true;
                } else if (inquirySnap.exists()) {
                    documentData = { id: log.documentId, ...inquirySnap.data() };
                    isArchived = false;
                }

            } else if (log.category === 'Account Management') {
                const accountSnap = await getDoc(doc(db, 'accounts', log.documentId));
                if (accountSnap.exists()) {
                    documentData = { id: log.documentId, ...accountSnap.data() };
                }

            } else if (log.category === 'In Progress') {
                const inProgressSnap = await getDoc(doc(db, 'inProgress', log.documentId));

                if (inProgressSnap.exists()) {
                    documentData = { id: log.documentId, ...inProgressSnap.data() };
                    actualCategory = 'In Progress';
                } else {
                    const { getDocs, query: firestoreQuery, where, collection } = await import('../../../firebase-config.js');
                    const completedQuery = firestoreQuery(
                        collection(db, 'completed'),
                        where('originalInProgressId', '==', log.documentId)
                    );
                    const completedSnapshot = await getDocs(completedQuery);

                    if (!completedSnapshot.empty) {
                        const completedDoc = completedSnapshot.docs[0];
                        documentData = { id: completedDoc.id, ...completedDoc.data() };
                        actualCategory = 'Completed';
                    }
                }

            } else if (log.category === 'Completed') {
                const docSnap = await getDoc(doc(db, 'completed', log.documentId));
                documentData = docSnap.exists() ? { id: log.documentId, ...docSnap.data() } : null;
            }

            if (!documentData) {
                this.parent.inquiryManager.showToast('This item has been moved or deleted', 'warning');
                return;
            }

            // Show modal based on ACTUAL category
            if (actualCategory === 'Inquiries') {
                if (isArchived || documentData.processed) {
                    const existingIndex = this.parent.archivedInquiries.findIndex(i => i.id === documentData.id);
                    if (existingIndex === -1) {
                        this.parent.archivedInquiries.unshift(documentData);
                    }
                    this.parent.inquiryManager.showArchivedInquiryDetails(documentData.id);
                } else {
                    const existingIndex = this.parent.inquiries.findIndex(i => i.id === documentData.id);
                    if (existingIndex === -1) {
                        this.parent.inquiries.unshift(documentData);
                    }
                    // Check if the AUDIT LOG is about "Update Documents" status - make it read-only
                    const isUpdateDocumentsLog = log.actionType.includes('Update Documents') ||
                        (log.oldValue && log.oldValue.includes('Update Documents')) ||
                        (log.newValue && log.newValue.includes('Update Documents'));

                    this.parent.inquiryManager.showInquiryDetails(documentData.id, isUpdateDocumentsLog);
                }
            } else if (actualCategory === 'Account Management') {
                const account = documentData;
                this.parent.inquiryManager.showToast(
                    `Account: ${account.firstName} ${account.lastName} (${account.email})`,
                    'info'
                );
            } else if (actualCategory === 'In Progress') {
                const existingIndex = this.parent.inProgressItems.findIndex(i => i.id === documentData.id);
                if (existingIndex === -1) {
                    this.parent.inProgressItems.unshift(documentData);
                }
                this.parent.inProgressManager.showInProgressDetails(documentData.id);
                setTimeout(() => {
                    $('#moveToCompletedBtn, #editBtn').hide();
                }, 100);
            } else if (actualCategory === 'Completed') {
                const existingIndex = this.parent.completedItems.findIndex(i => i.id === documentData.id);
                if (existingIndex === -1) {
                    this.parent.completedItems.unshift(documentData);
                }
                this.parent.completedManager.showCompletedDetails(documentData.id);
            }

        } catch (error) {
            console.error('Error fetching document:', error);
            this.parent.inquiryManager.showToast('Failed to load document', 'error');
        }
    }
}

export default AuditLogsManager;