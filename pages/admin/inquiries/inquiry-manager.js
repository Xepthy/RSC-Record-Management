import {
    db,
    collection,
    query,
    orderBy,
    onSnapshot,
    doc,
    updateDoc
} from '../../../firebase-config.js';

class InquiryManager {
    constructor(parentInstance) {
        this.parent = parentInstance;
    }

    async handleRemarksApply() {
        const remarks = $('#remarksInput').val().trim();

        if (!remarks) {
            alert('Remarks is required');
            return;
        }

        // Prevent multiple clicks
        if ($('#applyRemarksBtn').prop('disabled')) {
            return;
        }

        try {
            // Disable button while updating
            $('#applyRemarksBtn').prop('disabled', true).text('Applying...');

            const inquiryDocRef = doc(db, 'inquiries', this.parent.currentInquiryId);

            if (inquiryDocRef.remarks === remarks) alert('The input are the same!');

            await updateDoc(inquiryDocRef, {
                remarks: remarks
            });

            // Also update the pending inquiry
            await this.updatePendingInquiry(remarks);

            console.log('Remarks updated successfully');
            alert('Remarks applied successfully!');

        } catch (error) {
            console.error('Error updating remarks:', error);
            alert('Failed to apply remarks. Please try again.');
        } finally {
            // Add a small delay before re-enabling
            setTimeout(() => {
                $('#applyRemarksBtn').prop('disabled', false).text('Apply');
            }, 500);
        }
    }

    async updatePendingInquiry(remarks) {
        const inquiry = this.parent.inquiries.find(inq => inq.id === this.parent.currentInquiryId);

        if (!inquiry) {
            console.log('Inquiry not found');
            return;
        }

        if (inquiry.pendingDocId && inquiry.accountInfo?.uid) {
            const pendingDocRef = doc(db, 'client', inquiry.accountInfo.uid, 'pending', inquiry.pendingDocId);
            await updateDoc(pendingDocRef, { remarks: remarks });
            console.log('Updated pending document');
        }
    }



    async setupInquiryListener() {
        try {
            console.log('Setting up inquiry listener...');
            this.parent.uiRenderer.showLoading();

            const inquiriesQuery = query(
                collection(db, 'inquiries'),
                orderBy('dateSubmitted', 'desc')
            );

            this.parent.unsubscribe = onSnapshot(inquiriesQuery, (snapshot) => {
                console.log('Firestore snapshot received:', snapshot.size, 'documents');

                // Store the current inquiry ID before updating
                const currentId = this.parent.currentInquiryId;

                this.parent.inquiries = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                console.log('Processed inquiries:', this.parent.inquiries.length);
                this.parent.updateNotificationCount();

                // Only show inquiries loaded if we're not viewing specific details
                if (!currentId) {
                    this.parent.uiRenderer.showInquiriesLoaded();
                } else {
                    // Restore the current inquiry ID
                    this.parent.currentInquiryId = currentId;
                }

            }, (error) => {
                console.error('Error listening to inquiries:', error);
                this.parent.uiRenderer.showError('Failed to load inquiries: ' + error.message);
            });

        } catch (error) {
            console.error('Error setting up inquiry listener:', error);
            this.parent.uiRenderer.showError('Failed to initialize inquiry system: ' + error.message);
        }
    }

    async markAsRead(inquiryId) {
        try {
            const inquiry = this.parent.inquiries.find(inq => inq.id === inquiryId);
            if (!inquiry || inquiry.read) {
                return;
            }

            const inquiryDocRef = doc(db, 'inquiries', inquiryId);
            await updateDoc(inquiryDocRef, {
                read: true,
            });

            console.log('Inquiry marked as read:', inquiryId);

        } catch (error) {
            console.error('Error marking inquiry as read:', error);
        }
    }

    showInquiryDetails(inquiryId) {
        const inquiry = this.parent.inquiries.find(inq => inq.id === inquiryId);
        if (!inquiry) return;

        this.parent.currentInquiryId = inquiryId;
        console.log('Current inquiry ID set to:', inquiryId);

        const clientName = inquiry.accountInfo ?
            `${inquiry.accountInfo.firstName || ''} ${inquiry.accountInfo.lastName || ''}`.trim() || inquiry.clientName :
            inquiry.clientName || 'Unknown Client';

        const services = inquiry.selectedServices ?
            inquiry.selectedServices.join(', ') : 'None specified';

        const dateStr = this.formatDate(inquiry.dateSubmitted);

        const documentsHTML = this.buildDocumentsHTML(inquiry.documents);

        const statusBadge = inquiry.read ?
            '<span class="status-badge read">Read</span>' :
            '<span class="status-badge unread">Unread</span>';

        const detailsHTML = `
            <div class="inquiry-details">
                <div class="details-header">
                    <div class="header-content">
                        <h3>Inquiry Details</h3>
                        ${statusBadge}
                    </div>
                    <button class="back-btn" onclick="window.inquiriesPage.showInquiriesSection()">← Back to List</button>
                </div>
                
                <div class="details-content">
                    <div class="details-grid">
                        <div class="detail-card">
                            <div class="card-header">
                                <h4>Account Information</h4>
                            </div>
                            <div class="card-body">

                                <div class="info-row">
                                    <span class="label">Classification:</span>
                                    <span class="value">${inquiry.accountInfo?.classification || 'N/A'}</span>
                                </div>

                                <div class="info-row">
                                    <span class="label">Name:</span>
                                    <span class="value">${clientName}</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">Email:</span>
                                    <span class="value">${inquiry.accountInfo?.email || 'Not provided'}</span>
                                </div>
                                
                                <div class="info-row">
                                    <span class="label">Mobile:</span>
                                    <span class="value">${inquiry.accountInfo?.mobileNumber || 'Not provided'}</span>
                                </div>
                                
                            </div>
                        </div>
                        
                        <div class="detail-card">
                            <div class="card-header">
                                <h4>Client Information</h4>
                            </div>
                            <div class="card-body">
                                <div class="info-row">
                                    <span class="label">Classification:</span>
                                    <span class="value">${inquiry.classification || 'Not specified'}</span>
                                </div>

                                <div class="info-row">
                                    <span class="label">Client Name:</span>
                                    <span class="value">${inquiry.clientName || 'Not specified'}</span>
                                </div>

                                <div class="info-row">
                                    <span class="label">Representative:</span>
                                    <span class="value">${inquiry.representative || 'None'}</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">Rep. Classification:</span>
                                    <span class="value">${inquiry.repClassification || 'None'}</span>
                                </div>

                                <div class="info-row">
                                    <span class="label">Contact:</span>
                                    <span class="value">${inquiry.contact || 'Not provided'}</span>
                                </div>

                                <div class="info-row">
                                    <span class="label">Location:</span>
                                    <span class="value">${inquiry.location || 'Not provided'}</span>
                                </div>

                                <div class="info-row">
                                    <span class="label">Services:</span>
                                    <span class="value services-list">${services}</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">Submitted:</span>
                                    <span class="value">${dateStr}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="detail-card description-card">
                            <div class="card-header">
                                <h4>Request Description</h4>
                            </div>
                            <div class="card-body">
                                <div class="description-text">
                                    ${inquiry.requestDescription || 'No description provided'}
                                </div>
                            </div>
                        </div>
                        
                        <div class="detail-card documents-card">
                            <div class="card-header">
                                <h4>Documents (${inquiry.documentCount || 0})</h4>
                            </div>
                            <div class="card-body">
                                <div class="documents-list">
                                    ${documentsHTML}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="remarks-section">
                    <div class="card-header">
                        <h3>Remarks</h3>
                    </div>
                    <div class="card-body">
                        <textarea id="remarksInput" placeholder="Enter your remarks here..." rows="4">${inquiry.remarks || ''}</textarea>
                        <button id="applyRemarksBtn" class="apply-btn">Apply</button>
                    </div>
                </div>
            </div>
        `;

        $('#inquiryContent').html(detailsHTML);
        $('#applyRemarksBtn').on('click', () => {
            this.handleRemarksApply();
        });
        console.log('Inquiry details loaded for:', inquiryId);
    }

    formatDate(dateSubmitted) {
        if (!dateSubmitted) return 'Unknown';

        if (typeof dateSubmitted === 'string') {
            return new Date(dateSubmitted).toLocaleString();
        }
        if (dateSubmitted.toDate) {
            return dateSubmitted.toDate().toLocaleString();
        }
        return 'Unknown';
    }

    buildDocumentsHTML(documents) {
        if (!documents || documents.length === 0) {
            return '<p>No documents attached</p>';
        }

        const documentsList = documents.map(doc =>
            `<li><a href="${doc.url}" target="_blank">${doc.name}</a></li>`
        ).join('');

        return `<ul>${documentsList}</ul>`;
    }
}

export default InquiryManager;