import {
    db,
    collection,
    query,
    orderBy,
    onSnapshot,
    doc,
    updateDoc,
    getDoc,
    setDoc,
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
        this.cachedTeams = null;
    }

    async loadTeamOptions() {
        // If teams are already cached, use them
        if (this.cachedTeams) {
            this.populateTeamDropdown(this.cachedTeams);
            return;
        }

        // Otherwise, fetch from Firestore and cache
        try {
            const configDoc = await getDoc(doc(db, 'app_config', 'teams'));
            if (configDoc.exists()) {
                this.cachedTeams = configDoc.data().availableTeams || [];
                this.populateTeamDropdown(this.cachedTeams);
            }
        } catch (error) {
            console.error('Error loading teams:', error);
        }
    }

    // Helper function to populate dropdown
    populateTeamDropdown(teams) {
        // Clear existing options (except the first empty one)
        $('#teamSelect option').not(':first').remove();

        // Add teams to dropdown
        teams.forEach(team => {
            $('#teamSelect').append(`<option value="${team}">${team}</option>`);
        });
    }

    async saveNewTeam(newTeam) {
        try {
            const configRef = doc(db, 'app_config', 'teams');
            const configDoc = await getDoc(configRef);

            let currentTeams = [];
            if (configDoc.exists()) {
                currentTeams = configDoc.data().availableTeams || [];
            }

            if (!currentTeams.includes(newTeam)) {
                currentTeams.push(newTeam);
                await updateDoc(configRef, { availableTeams: currentTeams });

                this.cachedTeams = currentTeams;

                return true;
            }
            return false;
        } catch (error) {
            console.error('Error saving team:', error);
            throw error;
        }
    }

    toggleApprovedSections() {
        const status = $('#statusDropdown').val();
        if (status === 'Approved') {
            $('#planNameSection').show();
            $('#pricingSection').show();
            $('#scheduleTeamSection').show();
        } else {
            $('#planNameSection').hide();
            $('#pricingSection').hide();
            $('#scheduleTeamSection').hide();
        }
    }

    handleTeamExpansion() {
        $('#addTeamOptionBtn').on('click', async () => {
            const newTeam = $('#addTeamInput').val().trim().toUpperCase();
            if (!newTeam) {
                this.showToast('Please enter a team letter', 'warning');
                return;
            }

            if (newTeam.length !== 1 || !/^[A-Z]$/.test(newTeam)) {
                this.showToast('Team name must be a single letter (A-Z)', 'warning');
                return;
            }

            try {
                const success = await this.saveNewTeam(newTeam);
                if (success) {
                    // Add to dropdown
                    $('#teamSelect').append(`<option value="${newTeam}">${newTeam}</option>`);
                    $('#addTeamInput').val('');
                    this.showToast(`Team ${newTeam} added!`, 'success');
                } else {
                    this.showToast('Team already exists', 'warning');
                }
            } catch (error) {
                this.showToast('Failed to add team. Please try again.', 'error');
            }
        });
    }


    handleTeamManagement() {
        // Add new team option to dropdown
        $('#addNewTeamBtn').on('click', () => {
            const newTeam = $('#newTeamInput').val().trim().toUpperCase();
            if (!newTeam) {
                this.showToast('Please enter a team name', 'warning');
                return;
            }

            // Check if team option already exists
            if ($(`#teamSelect option[value="${newTeam}"]`).length > 0) {
                this.showToast('Team option already exists', 'warning');
                return;
            }

            // Add new option to dropdown
            $('#teamSelect').append(`<option value="${newTeam}">${newTeam}</option>`);
            $('#newTeamInput').val('');
            this.showToast(`Team ${newTeam} added to options`, 'success');
        });

        // Add selected team to list
        $('#addTeamBtn').on('click', () => {
            const teamValue = $('#teamSelect').val();
            if (!teamValue) {
                this.showToast('Please select a team', 'warning');
                return;
            }

            // Check if team already exists in list
            if ($(`#teamList .team-item[data-team="${teamValue}"]`).length > 0) {
                this.showToast('Team already added', 'warning');
                return;
            }

            this.addTeamToList(teamValue);
            $('#teamSelect').val('');
        });
    }

    addTeamToList(teamValue) {
        const teamItem = $(`
        <div class="team-item" data-team="${teamValue}" style="display: inline-block; margin: 2px; padding: 5px 10px; background: #007bff; color: white; border-radius: 15px; font-size: 12px;">
            Team ${teamValue}
            <button type="button" onclick="$(this).parent().remove()" style="margin-left: 5px; background: none; border: none; color: white; cursor: pointer;">&times;</button>
        </div>
    `);
        $('#teamList').append(teamItem);
    }

    toggleScheduleTeamSection() {
        const status = $('#statusDropdown').val();
        if (status === 'Approved') {
            $('#scheduleTeamSection').show();
        } else {
            $('#scheduleTeamSection').hide();
        }
    }

    handlePaymentCheckboxes() {
        $('#downPaymentCheck').on('change', function () {
            // When down payment is checked, remaining stays independent
            // No automatic checking of remaining
        });

        $('#remainingCheck').on('change', function () {
            if ($(this).is(':checked')) {
                // When remaining is checked, automatically check down payment too
                $('#downPaymentCheck').prop('checked', true);
            }
        });
    }

    formatCurrency(num) {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(num);
    }

    calculatePricing() {
        let input = $('#totalAmountInput').val().replace(/[^\d]/g, ''); // Remove everything except digits

        // Remove leading zeros but keep at least one digit
        input = input.replace(/^0+/, '') || '0';

        // Simply limit to 9 digits maximum - don't force to 100M
        if (input.length > 9) {
            input = input.substring(0, 9);
        }

        // Format with commas and update input field
        const formattedInput = this.addCommas(input);
        $('#totalAmountInput').val(formattedInput);

        // Calculate
        const amount = parseFloat(input) || 0;
        const downPayment = amount * 0.40;
        const remaining = amount * 0.60;

        $('#displayTotal').text(this.formatCurrency(amount));
        $('#displayDownPayment').text(this.formatCurrency(downPayment));
        $('#displayRemaining').text(this.formatCurrency(remaining));
    }

    addCommas(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    togglePricingSection() {
        const status = $('#statusDropdown').val();
        if (status === 'Approved') {
            $('#pricingSection').show();
            $('#scheduleTeamSection').show();
        } else {
            $('#pricingSection').hide();
        }
    }


    checkForChanges() {
        const currentRemarks = $('#remarksInput').val();
        const currentServices = this.getSelectedServices();
        const currentStatus = $('#statusDropdown').val();

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

    formatDateForStorage(dateString) {
        if (!dateString) return '';

        // dateString comes as "2025-01-15" (yyyy-mm-dd)
        const [year, month, day] = dateString.split('-');
        return `${month}/${day}/${year}`; // Convert to mm/dd/yyyy
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
            console.log('Starting batch update with:', updates);
            const batch = writeBatch(db);
            const inquiry = this.parent.inquiries.find(inq => inq.id === this.parent.currentInquiryId);

            console.log('Found inquiry:', inquiry?.id);


            const inquiryDocRef = doc(db, 'inquiries', this.parent.currentInquiryId);
            batch.update(inquiryDocRef, updates);
            console.log('Added main inquiry to batch');

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
        if ($('#statusDropdown').val() === 'Approved') {
            if (!$('#totalAmountInput').val().trim()) {
                return this.showToast('Total amount is required when status is Approved', 'warning');
            }

            // Check if at least one checkbox is selected when amount is entered
            const hasDownPayment = $('#downPaymentCheck').is(':checked');
            const hasRemaining = $('#remainingCheck').is(':checked');

            if (!hasDownPayment && !hasRemaining) {
                return this.showToast('Please select at least one payment option (Down Payment or Remaining)', 'warning');
            }

            if (!$('#teamSelect').val()) {
                return this.showToast('Team selection is required when status is Approved', 'warning');
            }

            if (!$('#scheduleInput').val()) {
                return this.showToast('Schedule is required when status is Approved', 'warning');
            }
        }

        if ($('#applyRemarksBtn').prop('disabled')) return;

        // Show password confirmation modal
        const inquiry = this.parent.inquiries.find(inq => inq.id === this.parent.currentInquiryId);

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
                    lastUpdated: serverTimestamp(),
                    processed: true,

                });


                if (status === 'Approved') {
                    const progressData = {
                        totalAmount: parseFloat($('#totalAmountInput').val().replace(/[^\d.]/g, '')),
                        is40: $('#downPaymentCheck').is(':checked'),
                        is60: $('#remainingCheck').is(':checked'),
                        schedule: this.formatDateForStorage($('#scheduleInput').val()), // SURVEY TASK INFORMATION
                        selectedTeam: $('#teamSelect').val(), // SURVEY TASK INFORMATION
                        pendingDocId: inquiry.pendingDocId, // this is for the user's pending doc | client/{uid}/pending/{pendingDocId}
                        accountInfo: inquiry.accountInfo,
                        clientInfo: {
                            clientName: inquiry.clientName,
                            classification: inquiry.classification,
                            representative: inquiry.representative,
                            repClassification: inquiry.repClassification,
                            contact: inquiry.contact,
                            location: inquiry.location
                        },
                        createdAt: serverTimestamp(),
                        remarks: null,
                        adminNotes: null,
                        documents: inquiry.documents || [], // TRANSMITTAL OF DOCUMENTS
                        selectedServices: selectedServices,
                        projectFiles: null, // PLOTTING OF LOT AND RESEARCH
                        planName: $('#planNameInput').val().trim(), // PLAN NAME FOR TABLE

                    };

                    const progressRef = doc(collection(db, 'inProgress'));
                    await setDoc(progressRef, progressData);
                }

                this.originalValues = {
                    remarks: remarks,
                    status: status,
                    selectedServices: [...selectedServices]
                };

                this.checkForChanges();
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
            selectedServices: [...(inquiry.selectedServices || [])],
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

                        <div id="planNameSection" style="display: none; margin-top: 15px;">
                            <label>Plan Name:</label>
                            <input type="text" id="planNameInput" placeholder="Enter Plan Name">
                        </div>

                        <div id="pricingSection" style="display: none; margin-top: 15px;">
                            <label>Total Amount:</label>
                            <input type="text" id="totalAmountInput" placeholder="Enter amount" maxlength="15">
                            <div id="calculationDisplay" style="margin-top: 10px; font-size: 14px;">
                                <div>Total Amount: <span id="displayTotal">₱0</span></div>
                                <div>
                                    <label>
                                        <input type="checkbox" id="downPaymentCheck">
                                        <span class="payment-text">Down Payment (40%):</span>
                                        <span id="displayDownPayment">₱0</span>
                                    </label>
                                </div>
                                <div>
                                    <label>
                                        <input type="checkbox" id="remainingCheck">
                                        <span class="payment-text">Remaining (60%):</span>
                                        <span id="displayRemaining">₱0</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div id="scheduleTeamSection" style="display: none; margin-top: 15px;">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                                <div>
                                    <label>Schedule:</label>
                                    <input type="date" id="scheduleInput">
                                </div>
                                <div>
                                    <label>Team:</label>
                                    <select id="teamSelect">
                                        <option value="">Select Team</option>
                                        <option value="A">A</option>
                                        <option value="B">B</option>
                                        <option value="C">C</option>
                                    </select>
                                    <input type="text" id="addTeamInput" placeholder="Add team (D, E, F...)" style="margin-top: 8px; width: 100%; padding: 5px;">
                                    <button type="button" id="addTeamOptionBtn" style="margin-top: 5px; padding: 5px 10px; width: 100%;">Add Team</button>
                                </div>
                            </div>
                        </div>

                        <button id="applyRemarksBtn" class="apply-btn">Apply</button>
                    </div>
                </div>

            </div>
        `;

        // Load any saved progress
        $('#inquiryContent').html(detailsHTML);
        this.loadSavedProgress(inquiryId);

        this.loadTeamOptions();

        this.checkForChanges();

        // In showInquiryDetails(), check if already processed
        if (inquiry.processed || inquiry.status === 'Processing') {
            $('#applyRemarksBtn').prop('disabled', true).text('Already Processed');
        }

        $('#remarksInput').on('input', () => {
            this.autoSaveProgress();
            this.checkForChanges();
        });

        $('.service-checkbox input').on('change', () => {
            this.autoSaveProgress();
            this.checkForChanges();
        });

        $('#statusDropdown').on('change', () => {
            this.autoSaveProgress();
            this.checkForChanges();
            this.toggleApprovedSections(); // Make sure this line exists
        });

        $('#totalAmountInput').on('input', () => {
            this.calculatePricing();
        });

        this.handlePaymentCheckboxes();
        this.handleTeamManagement();
        this.handleTeamExpansion();
        this.toggleApprovedSections();

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