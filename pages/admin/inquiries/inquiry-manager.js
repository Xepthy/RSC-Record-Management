import {
    db,
    collection,
    query,
    orderBy,
    onSnapshot,
    doc,
    updateDoc,
    where,
    writeBatch,
    serverTimestamp,
    auth,
    EmailAuthProvider,
    reauthenticateWithCredential
} from '../../../firebase-config.js';

// Note: ung recent service sa client side wala pa yun pero dagdagin yun sa HULI fucntions dito

class InquiryManager {
    constructor(parentInstance) {
        this.parent = parentInstance;
    }

    checkForChanges() {
        const currentRemarks = $('#remarksInput').val();
        const currentServices = this.getSelectedServices();

        // Check remarks changes
        const remarksChanged = currentRemarks !== this.originalValues.remarks;

        // Update remarks header
        const remarksHeader = $('.remarks-section .card-header h4');
        if (remarksChanged) {
            if (!remarksHeader.html().includes('*')) {
                remarksHeader.html('Remarks <span style="color: red;">*</span>');
            }
        } else {
            remarksHeader.html('Remarks');
        }

        // Check individual service changes
        const originalServices = this.originalValues.selectedServices;
        let anyServiceChanged = false;

        $('.service-checkbox').each(function () {
            const checkbox = $(this).find('input');
            const serviceName = checkbox.val();
            const isCurrentlyChecked = checkbox.is(':checked');
            const wasOriginallyChecked = originalServices.includes(serviceName);
            const isChanged = isCurrentlyChecked !== wasOriginallyChecked;

            const label = $(this).find('span');

            if (isChanged) {
                // Add red asterisk to individual service
                if (!label.html().includes('*')) {
                    label.html(serviceName + ' <span style="color: red;">*</span>');
                }
                anyServiceChanged = true;
            } else {
                // Remove red asterisk
                label.html(serviceName);
            }
        });

        // Update main Services label
        const servicesRow = $('.info-row').filter(function () {
            return $(this).find('.label').text().includes('Services');
        });

        const servicesLabel = servicesRow.find('.label');
        if (anyServiceChanged) {
            if (!servicesLabel.html().includes('*')) {
                servicesLabel.html('Services: <span style="color: red;">*</span>');
            }
        } else {
            servicesLabel.html('Services:');
        }
    }

    showPasswordModal(onConfirm) {
        const modalHTML = `
        <div id="passwordModal" class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Confirm Changes</h3>
                    <button class="modal-close" id="modalCloseBtn">×</button>
                </div>
                <div class="modal-body">
                    <p>Please enter your password to confirm these changes:</p>
                    <div class="password-field">
                        <input type="password" id="confirmPassword" placeholder="Enter your password">
                        <div id="passwordError" class="error-message" style="display: none;"></div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-cancel" id="cancelBtn">Cancel</button>
                    <button class="btn-confirm" id="confirmBtn">Confirm</button>
                </div>
            </div>
        </div>
    `;

        // Store the callback for later use
        this.onPasswordConfirm = onConfirm;

        $('body').append(modalHTML);
        $('#confirmPassword').focus();

        // Add event listeners AFTER HTML is added to DOM
        $('#cancelBtn').on('click', () => this.closePasswordModal());
        $('#modalCloseBtn').on('click', () => this.closePasswordModal());
        $('#confirmBtn').on('click', () => this.confirmPassword());

        // Handle Enter key and Escape key
        $('#confirmPassword').on('keypress', (e) => {
            if (e.which === 13) {
                this.confirmPassword();
            }
        });

        // Close modal on Escape key
        $(document).on('keydown.passwordModal', (e) => {
            if (e.which === 27) { // Escape key
                this.closePasswordModal();
            }
        });
    }


    closePasswordModal() {
        // Remove the modal and unbind document event listener
        $('#passwordModal').remove();
        $(document).off('keydown.passwordModal');
        this.onPasswordConfirm = null;

        // Re-enable the apply button
        $('#applyRemarksBtn').prop('disabled', false).text('Apply');
    }


    async confirmPassword() {
        const enteredPassword = $('#confirmPassword').val();
        const errorDiv = $('#passwordError');

        if (!enteredPassword) {
            errorDiv.text('Password is required').show();
            return;
        }

        try {
            $('.btn-confirm').prop('disabled', true).text('Verifying...');

            const user = auth.currentUser;
            if (!user) {
                throw new Error('User not authenticated');
            }

            // Re-authenticate user with their password
            const credential = EmailAuthProvider.credential(user.email, enteredPassword);
            await reauthenticateWithCredential(user, credential);

            // Password is correct - store callback BEFORE closing modal
            const callback = this.onPasswordConfirm;
            this.closePasswordModal();

            // Execute the callback after modal is closed
            if (callback) {
                await callback();
            }

        } catch (error) {
            console.error('Password verification failed:', error);

            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                errorDiv.text('Incorrect password. Please try again.').show();
            } else {
                errorDiv.text('Authentication failed. Please try again.').show();
            }

            $('.btn-confirm').prop('disabled', false).text('Confirm');
            $('#confirmPassword').focus().select();
        }
    }

    autoSaveProgress() {
        const progressData = {
            inquiryId: this.parent.currentInquiryId,
            remarks: $('#remarksInput').val(),
            status: $('#statusDropdown').val(),
            selectedServices: this.getSelectedServices(),
            timestamp: Date.now()
        };

        localStorage.setItem('inquiryProgress', JSON.stringify(progressData));
    }

    // Load saved progress
    loadSavedProgress(inquiryId) {
        const saved = localStorage.getItem('inquiryProgress');
        if (!saved) return;

        const progressData = JSON.parse(saved);

        // Only restore if it's for the same inquiry and recent (within 24 hours)
        const isRecent = Date.now() - progressData.timestamp < 24 * 60 * 60 * 1000;

        if (progressData.inquiryId === inquiryId && isRecent) {
            $('#remarksInput').val(progressData.remarks || '');
            $('#statusDropdown').val(progressData.status || '');

            // Restore selected services
            $('.service-checkbox input[type="checkbox"]').prop('checked', false);
            progressData.selectedServices?.forEach(service => {
                $(`.service-checkbox input[value="${service}"]`).prop('checked', true);
            });

            // Show notification
            this.showToast('Previous work restored!', 'success');
        }
    }

    // Clear saved progress after successful save
    clearSavedProgress() {
        localStorage.removeItem('inquiryProgress');
    }



    async batchUpdateInquiryAndPending(updates) {
        try {
            console.log('Starting batch update with:', updates); // ADD THIS
            const batch = writeBatch(db);
            const inquiry = this.parent.inquiries.find(inq => inq.id === this.parent.currentInquiryId);
            console.log('Found inquiry:', inquiry?.id); // ADD THIS

            // Always update main inquiries collection
            const inquiryDocRef = doc(db, 'inquiries', this.parent.currentInquiryId);
            batch.update(inquiryDocRef, updates);
            console.log('Added main inquiry to batch'); // ADD THIS

            // Update pending collection if it exists
            if (inquiry?.pendingDocId && inquiry.accountInfo?.uid) {
                const pendingDocRef = doc(db, 'client', inquiry.accountInfo.uid, 'pending', inquiry.pendingDocId);
                batch.update(pendingDocRef, updates);
                console.log('Added pending document to batch');
            }

            await batch.commit();
            console.log('Batch update completed successfully');
        } catch (error) {
            console.error('Error in batch update:', error);
            throw error;
        }
    }

    async updateServices(services) {
        await this.batchUpdateInquiryAndPending({ selectedServices: services });
    }

    async updateStatus(status) {
        await this.batchUpdateInquiryAndPending({ status: status });
    }

    async updateRemarks(remarks) {
        await this.batchUpdateInquiryAndPending({ remarks: remarks });
    }


    getUserInquiries(userId) {
        const userInquiriesQuery = query(
            collection(db, 'inquiries'),
            where('accountInfo.uid', '==', userId),
            orderBy('dateSubmitted', 'desc')
        );

        return onSnapshot(userInquiriesQuery, (snapshot) => {
            const userInquiries = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            // Handle user inquiries display
            console.log('User inquiries loaded:', userInquiries.length);
        });
    }

    getSelectedServices() {
        const selectedServices = [];
        $('.service-checkbox input[type="checkbox"]:checked').each(function () {
            selectedServices.push($(this).val());
        });
        return selectedServices;
    }

    buildServicesCheckboxes(selectedServices) {
        const allServices = [
            'Relocation Survey',
            'Boundary Survey',
            'Subdivision Survey',
            'Engineering Services',
            'Topographic Survey',
            'As-Built Survey',
            'Tilting Assistance',
            'All'
        ];

        return allServices.map(service => {
            const isChecked = selectedServices.includes(service) ? 'checked' : '';
            return `
            <label class="service-checkbox">
                <input type="checkbox" value="${service}" ${isChecked}>
                <span>${service}</span>
            </label>
        `;
        }).join('');
    }

    showToast(message, type = 'info') {
        const toast = $(`<div class="toast ${type}">${message}</div>`);
        $('body').append(toast);

        setTimeout(() => toast.addClass('show'), 100);
        setTimeout(() => {
            toast.removeClass('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    async handleStatusUpdate() {
        const status = $('#statusDropdown').val();

        if (!status) {
            alert('Please select a status');
            return;
        }

        try {
            await this.updateStatus(status);
            console.log('Status updated successfully to:', status);
        } catch (error) {
            console.error('Error updating status:', error);
            throw error;
        }
    }

    async handleRemarksApply() {
        // Quick validation checks
        if (!$('#remarksInput').val().trim()) return this.showToast('Remarks is required', 'warning');
        if (!$('#statusDropdown').val()) return this.showToast('Please select a status before applying', 'warning');
        if ($('#applyRemarksBtn').prop('disabled')) return;

        // Show password confirmation modal
        $('#applyRemarksBtn').prop('disabled', true).text('Confirming...');

        this.showPasswordModal(async () => {
            console.log('Password confirmed, starting update...');
            try {
                $('#applyRemarksBtn').text('Applying...');

                // Get fresh data when password is confirmed
                const remarks = $('#remarksInput').val().trim();
                const status = $('#statusDropdown').val();
                const selectedServices = this.getSelectedServices();

                await this.batchUpdateInquiryAndPending({
                    remarks: remarks,
                    status: status,
                    selectedServices: selectedServices,
                    lastUpdated: serverTimestamp()
                });

                this.clearSavedProgress();
                console.log('Updates completed successfully');
                this.showToast('Applied successfully!', 'success');

            } catch (error) {
                console.error('Error updating:', error);
                this.showToast('Failed to apply changes. Please try again.', 'error');
            } finally {
                setTimeout(() => {
                    $('#applyRemarksBtn').prop('disabled', false).text('Apply');
                }, 500);
            }
        });
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

        this.originalValues = {
            remarks: inquiry.remarks || '',
            selectedServices: [...(inquiry.selectedServices || [])]
        };

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
                                    <div class="value services-checkboxes">
                                        ${this.buildServicesCheckboxes(inquiry.selectedServices || [])}
                                    </div>
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
                        <h4>Remarks</h4>
                    </div>
                    <div class="card-body">

                        <textarea id="remarksInput" placeholder="Enter your remarks here..." rows="4">${inquiry.remarks || ''}</textarea>

                        <select id="statusDropdown">
                            <option value="">Select Status</option>
                            <option value="Approved" ${inquiry.status === 'Approved' ? 'selected' : ''} >Approved</option>
                            <option value="Rejected" ${inquiry.status === 'Rejected' ? 'selected' : ''} >Rejected</option>
                            <option value="Update Documents" ${inquiry.status === 'Update Documents' ? 'selected' : ''} >Update Documents</option>
                        </select>

                        <button id="applyRemarksBtn" class="apply-btn">Apply</button>
                    </div>
                </div>

            </div>
        `;

        // Load any saved progress
        $('#inquiryContent').html(detailsHTML);
        this.loadSavedProgress(inquiryId);

        this.checkForChanges();

        $('#remarksInput').on('input', () => {
            this.autoSaveProgress();
            this.checkForChanges();
        });

        $('.service-checkbox input').on('change', () => {
            this.autoSaveProgress();
            this.checkForChanges();
        });

        $('#statusDropdown').on('change', () => this.autoSaveProgress());
        $('#applyRemarksBtn').on('click', () => this.handleRemarksApply());
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