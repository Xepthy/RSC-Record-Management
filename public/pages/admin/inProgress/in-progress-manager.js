
import {
    db,
    collection,
    query,
    orderBy,
    onSnapshot,
    doc,
    updateDoc,
    serverTimestamp,
    storage,
    ref,
    uploadBytes,
    getDownloadURL,
    where,
    getDocs,
    getDoc,
    setDoc,
    deleteDoc,
    auth,
    deleteObject,
    EmailAuthProvider,
    reauthenticateWithCredential,
    arrayUnion
} from '../../../firebase-config.js';
import auditLogger from '../audit-logs/audit-logger.js';


class InProgressManager {
    constructor(parentInstance) {
        this.parent = parentInstance;
        window.inProgressManager = this;
    }

    // PS: For the future devs working on this file,
    // I apologize for the mess. This was rushed to meet a deadline.
    // I'll refactor this properly when I have time (hopefully soon).

    async loadTeamOptions() {
        try {
            const configDoc = await getDoc(doc(db, 'app_config', 'teams'));
            if (configDoc.exists()) {
                const teams = configDoc.data().availableTeams || [];
                return teams;
            }
            return [];
        } catch (error) {
            console.error('Error loading teams:', error);
            return [];
        }
    }

    populateTeamDropdown(teams, selectedTeam) {
        const teamSelect = $('#teamEdit');
        teamSelect.find('option').not(':first').remove(); // Clear except "Select Team"

        teams.forEach(team => {
            const isSelected = selectedTeam === team ? 'selected' : '';
            teamSelect.append(`<option value="${team}" ${isSelected}>Team ${team}</option>`);
        });
    }

    updateInProgressNotificationCount() {
        const unreadCount = this.inProgressItems.filter(item => !item.read).length;

        // Count items with urgent schedules (today or overdue)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const urgentScheduleCount = this.inProgressItems.filter(item => {
            if (item.isScheduleDone || !item.schedule) return false;

            const scheduleParts = item.schedule.split('/');
            if (scheduleParts.length !== 3) return false;

            const scheduleDate = new Date(scheduleParts[2], scheduleParts[1] - 1, scheduleParts[0]);
            scheduleDate.setHours(0, 0, 0, 0);

            // Return true if schedule is today or overdue
            return scheduleDate <= today;
        }).length;

        const totalNotifications = unreadCount + urgentScheduleCount;
        const $countElement = $('#inProgressCount');

        if (totalNotifications > 0) {
            $countElement.text(totalNotifications).show();
        } else {
            $countElement.hide();
        }
    }


    showInProgressDetails(itemId, readOnly = false) {
        const item = this.parent.inProgressItems.find(item => item.id === itemId);
        if (!item) return;

        // Account Information
        const accountEmail = item.accountInfo?.email || 'Not provided';
        const accountClassification = item.accountInfo?.classification || 'Not specified';
        const firstName = item.accountInfo?.firstName || '';
        const middleName = item.accountInfo?.middleName ? ` ${item.accountInfo.middleName}` : '';
        const lastName = item.accountInfo?.lastName || '';
        const suffix = item.accountInfo?.suffix ? ` ${item.accountInfo.suffix}` : '';
        const fullName = `${firstName}${middleName} ${lastName}${suffix}`.trim();
        const mobileNumber = item.accountInfo?.mobileNumber || 'Not provided';

        // Client Information
        const clientClassification = item.clientInfo?.classification || 'Not specified';
        const clientName = item.clientInfo?.clientName || 'Unknown Client';
        const contact = item.clientInfo?.contact || 'Not provided';
        const location = item.clientInfo?.location || 'Not provided';
        const repClassification = item.clientInfo?.repClassification || 'None';
        const representative = item.clientInfo?.representative || 'None';
        const contractorName = item.clientInfo?.contractorName || 'None';
        const companyName = item.clientInfo?.companyName || 'None';

        const planName = item?.planName || 'None';
        // Services checkboxes (read-only)
        const servicesHTML = this.buildServicesCheckboxes(item.selectedServices || [], false);

        // Quotation
        const totalAmount = item.totalAmount || 0;
        const quotation = this.formatCurrency(totalAmount);
        const downPayment = this.formatCurrency(totalAmount * 0.40);
        const uponDelivery = this.formatCurrency(totalAmount * 0.60);

        // Documents
        const documentsHTML = this.buildDocumentsHTML(item.documents || [], false);

        // Project files
        const projectFilesHTML = this.buildProjectFilesHTML(item.projectFiles, false);

        const modalHTML = `
        <div id="inProgressModal" class="modal-overlay">
            <div class="modal-content large-modal">
                <div class="modal-header">
                    <h3>In Progress Details</h3>
                    <button class="modal-close" id="modalCloseBtn">×</button>
                </div>
                <div class="modal-body">
                    <div class="details-grid">

                        <div class="detail-card full-width">
                            <div class="card-header">
                                <h4>Plan Name</h4>
                            </div>
                            <div class="card-body">
                                <div class="planNameClass" id="planName">
                                    ${planName}
                                </div>
                            </div>
                        </div>

                        <!-- Account Information -->
                        <div class="detail-card">
                            <div class="card-header">
                                <h4>Account Information</h4>
                            </div>
                            <div class="card-body">
                                <div class="info-row">
                                    <span class="label">Classification:</span>
                                    <span class="value">${accountClassification}</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">Email:</span>
                                    <span class="value">${accountEmail}</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">Full Name:</span>
                                    <span class="value">${fullName}</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">Mobile Number:</span>
                                    <span class="value">${mobileNumber}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Client Information -->
                        <div class="detail-card">
                            <div class="card-header">
                                <h4>Client Information</h4>
                            </div>
                            <div class="card-body">
                                <div class="info-row">
                                    <span class="label">Classification:</span>
                                    <span class="value">${clientClassification}</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">Client Name:</span>
                                    <span class="value">${clientName}</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">Contact:</span>
                                    <span class="value">${contact}</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">Location:</span>
                                    <span class="value">${location}</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">Rep. Classification:</span>
                                    <span class="value">${repClassification}</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">Representative:</span>
                                    <span class="value">${representative}</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">Contractor Name:</span>
                                    <span class="value">${contractorName}</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">Company Name:</span>
                                    <span class="value">${companyName}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Service Types -->
                        <div class="detail-card">
                            <div class="card-header">
                                <h4>Service Types</h4>
                            </div>
                            <div class="card-body">
                                <div class="services-checkboxes" id="servicesContainer">
                                    ${servicesHTML}
                                </div>
                            </div>
                        </div>

                        <!-- Quotation -->
                        ${this.parent.isSuperAdmin ? `
                        <div class="detail-card">
                            <div class="card-header">
                                <h4>Quotation</h4>
                            </div>
                            <div class="card-body">
                                <div class="info-row">
                                    <span class="label">Total Amount:</span>
                                    <span class="value" id="quotationValue">${quotation}</span>
                                    <input type="text" id="quotationEdit" value="${this.addCommas(totalAmount)}" placeholder="0.00" style="display: none;">
                                </div>
                                <div class="info-row">
                                    <label class="checkbox-row">
                                        <input type="checkbox" id="is40Edit" ${item.is40 ? 'checked' : ''} disabled>
                                        <span class="payment-text">
                                            Down Payment (40%): ${downPayment}
                                        </span>
                                    </label>
                                </div>
                                <div class="info-row">
                                    <label class="checkbox-row">
                                        <input type="checkbox" id="is60Edit" ${item.is60 ? 'checked' : ''} disabled>
                                        <span class="payment-text">
                                            Upon Delivery (60%): ${uponDelivery}
                                        </span>
                                    </label>
                                </div>
                            </div>
                        </div>`: ''}

                        <!-- Transmittal of Documents -->
                        ${this.parent.isSuperAdmin ? `
                        <div class="detail-card">
                            <div class="card-header">
                                <h4>Transmittal of Documents</h4>
                            </div>
                            <div class="card-body">
                                <div id="documentsContainer">
                                    ${documentsHTML}
                                </div>
                            </div>
                        </div>` : ''}

                        <!-- Plotting of Lot and Research -->
                        <div class="detail-card">
                            <div class="card-header">
                                <h4>Plotting of Lot and Research</h4>
                                <div class="card-actions" id="projectFilesActions" style="display: none;">
                                    <button class="btn-small btn-primary" id="addProjectFileBtn"></button>
                                </div>
                            </div>
                            <div class="card-body">
                                <div id="projectFilesContainer">
                                    ${projectFilesHTML}
                                </div>
                            </div>
                        </div>

                        <!-- Survey Task Information -->
                        ${this.parent.isSuperAdmin ? `
                        <div class="detail-card">
                            <div class="card-header">
                                <h4>Survey Task Information</h4>
                            </div>
                            <div class="card-body">
                                <div class="info-row">
                                    <label class="checkbox-row">
                                        <input type="checkbox" id="scheduleCheckbox" ${item.isScheduleDone ? 'checked' : ''} disabled>
                                        <span>Schedule: ${item.isScheduleDone ? '--' : (this.formatDateForDisplay(item.schedule) || 'Not scheduled')}</span>
                                        <input type="date" id="scheduleEdit" value="" style="display: none; margin-left: 10px;">
                                    </label>
                                </div>
                            </div>
                        </div> ` : ''}
                        


                        <!-- Survey Team -->

                        ${this.parent.isSuperAdmin ? `
                        <div class="detail-card">
                            <div class="card-header">
                                <h4>Survey Team</h4>
                            </div>
                            <div class="card-body">
                                <div class="info-row">
                                    <span class="label">Team:</span>
                                    <span class="value" id="teamValue">Team ${item.selectedTeam || 'Not assigned'}</span>
                                    <select id="teamEdit" style="display: none;">
                                        <option value="">Select Team</option>
                                    </select>
                                </div>
                            </div>
                        </div>` : ''}

                        <!-- Findings -->
                        <div class="detail-card">
                            <div class="card-header">
                                <h4>Findings</h4>
                            </div>
                            <div class="card-body">
                                <div class="info-row">
                                    <label class="checkbox-row">
                                        <input type="checkbox" id="encroachmentEdit" ${item.isEncroachment ? 'checked' : ''} disabled>
                                        <span>Encroachment</span>
                                    </label>
                                </div>
                                <div class="info-row">
                                    <label class="checkbox-row">
                                        <input type="checkbox" id="needResearchEdit" ${item.isNeedResearch ? 'checked' : ''} disabled>
                                        <span>Need Research</span>
                                    </label>
                                </div>
                                <div class="info-row">
                                    <label class="checkbox-row">
                                        <input type="checkbox" id="doneLayoutEdit" ${item.isDoneLayout ? 'checked' : ''} disabled>
                                        <span>Done Layout</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <!-- Notes and Remarks -->
                        <!--
                        <div class="detail-card full-width">
                            <div class="card-header">
                                <h4>Super Admin Notes</h4>
                            </div>
                            <div class="card-body">
                                <div class="readonly-text" id="adminNotesValue">${item.adminNotes || 'No admin notes'}</div>
                                <textarea id="adminNotesEdit" rows="3" style="display: none;">${item.adminNotes || ''}</textarea>
                            </div>
                        </div>
                        -->
                        <div class="detail-card full-width">
                            <div class="card-header">
                                <h4>Remarks</h4>
                            </div>
                            <div class="card-body">
                                <div class="readonly-text" id="remarksValue">${item.remarks || 'No remarks'}</div>
                                <textarea id="remarksEdit" rows="3" style="display: none;">${item.remarks || ''}</textarea>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    ${!readOnly && this.parent.isAdmin || this.parent.isSuperAdmin ? `<button class="btn-success" id="moveToCompletedBtn">Move to Completed</button>` : ''}
                    ${!readOnly && this.parent.isAdmin || this.parent.isSuperAdmin ? `<button class="btn-secondary" id="editBtn">Edit</button>` : ''}
                    <button class="btn-primary" id="saveBtn" style="display: none;">Save</button>
                    <button class="btn-secondary" id="cancelEditBtn" style="display: none;">Cancel</button>
                    <button class="btn-cancel" id="cancelBtn">Close</button>
                </div>
            </div>
        </div>
    `;

        $('body').append(modalHTML);
        this.loadTeamOptions().then(teams => {
            this.populateTeamDropdown(teams, item.selectedTeam);
        });

        // Only setup edit listeners if not readOnly
        if (!readOnly) {
            this.setupModalEventListeners(item);
        } else {
            // Only setup close button
            $('#modalCloseBtn, #cancelBtn').on('click', () => {
                $('#inProgressModal').remove();
            });
        }
    }


    buildServicesCheckboxes(selectedServices, editable = true) {
        const allServices = [
            'Relocation Survey',
            'Boundary Survey',
            'Subdivision Survey',
            'Engineering Services',
            'Topographic Survey',
            'Consolidation Survey',
            'Parcellary Survey',
            'As-Built Survey',
            'Titling Assistance',
            'All'
        ];

        return allServices.map(service => {
            const isChecked = selectedServices.includes(service) ? 'checked' : '';
            const disabled = editable ? '' : 'disabled';
            return `
            <label class="service-checkbox">
                <input type="checkbox" value="${service}" ${isChecked} ${disabled}>
                <span>${service}</span>
            </label>
        `;
        }).join('');
    }

    buildDocumentsHTML(documents, editable = false) {
        if (!documents || documents.length === 0) {
            return '<p>No documents uploaded</p>';
        }

        const documentsList = documents.map((doc, index) =>
            `<div class="document-item" data-index="${index}">
            <a href="${doc.url}" target="_blank">${doc.name}</a>
            ${editable ? `<button class="btn-small btn-danger delete-doc-btn" data-index="${index}" type="button">Remove</button>` : ''}
        </div>`
        ).join('');

        return documentsList;
    }

    // Replace the existing handleViewFile with this async version:
    async handleViewFile(storagePath, url) {
        try {
            let fileUrl = url;

            // If no direct URL was stored, but we have a Firebase storagePath,
            // resolve it to a download URL using Firebase Storage's getDownloadURL.
            if (!fileUrl && storagePath) {
                try {
                    const storageRef = ref(storage, storagePath);
                    fileUrl = await getDownloadURL(storageRef);
                } catch (err) {
                    // Could not resolve via Firebase Storage (maybe it's not a Firebase path).
                    // As a graceful fallback, try building a URL relative to current origin (/uploads/...)
                    // (Keep this fallback only if you sometimes store local paths).
                    console.warn('getDownloadURL failed for', storagePath, err);
                    const baseUrl = window.location.origin;
                    fileUrl = `${baseUrl}/uploads/${storagePath}`;
                }
            }

            if (!fileUrl) {
                alert("File URL not found.");
                return;
            }

            // Ensure URL is safe/normalized
            // (no modifications to remove #toolbar etc. — viewer will append if necessary)
            const fileName = decodeURIComponent(fileUrl.split('/').pop().split('?')[0]);
            const fileExt = (fileName.split('.').pop() || '').toLowerCase();

            // Only allow PDF files (per your system requirement)
            if (fileExt === 'pdf') {
                // Ensure iframe-friendly URL (optional: add viewer params)
                const viewerUrl = fileUrl.includes('#') ? fileUrl : (fileUrl + '#toolbar=0&navpanes=0');
                showDocumentViewer(viewerUrl, fileName);
            } else {
                alert("Unsupported file type. Only PDF files are allowed.");
            }
        } catch (error) {
            console.error('Error opening document:', error);
            alert('Failed to open document. Please try again.');
        }
    }



    buildProjectFilesHTML(projectFiles, editable = false) {
        if (!projectFiles || (Array.isArray(projectFiles) && projectFiles.length === 0)) {
            return '<p>No project files uploaded</p>';
        }

        // Handle single object (for backward compatibility)
        if (!Array.isArray(projectFiles)) {
            return `<div class="project-file-item">
            <span>📄 ${projectFiles.name}</span>
            <a href="${projectFiles.url}" target="_blank" class="view-link">View File</a>
            ${editable ? `<button class="btn-small btn-danger delete-project-btn" data-index="0" type="button">Remove</button>` : ''}
        </div>`;
        }

        // Handle array of files
        return projectFiles.map((file, index) => `
            <div class="project-file-item">
                <span>📄 ${file.name}</span>
                ${file.storagePath || file.url ?
                `<button class="view-link" onclick="window.inProgressManager.handleViewFile('${file.storagePath || ''}', '${file.url || ''}')">View File</button>` :
                ``
            }
                ${editable ? `<button class="btn-small btn-danger delete-project-btn" data-index="${index}" type="button"></button>` : ''}
            </div>
        `).join('');
    }

    async handleMoveToCompleted(item) {
        const completionDate = $('#completionDate').val();
        const referenceCode = $('#referenceCode').val().trim();
        const password = $('#confirmCompletionPassword').val();
        const errorDiv = $('#completionError');

        // Clear previous errors
        errorDiv.hide();

        // Validate inputs
        if (!completionDate) {
            errorDiv.text('Completion date is required').show();
            return;
        }
        if (!referenceCode) {
            errorDiv.text('Reference code is required').show();
            return;
        }
        if (!password) {
            errorDiv.text('Password is required').show();
            return;
        }

        // Check business logic conditions
        if (!item.is40 || !item.is60) {
            errorDiv.text('Both down payment (40%) and upon delivery (60%) must be completed').show();
            return;
        }

        if (!item.projectFiles || (Array.isArray(item.projectFiles) && item.projectFiles.length === 0)) {
            errorDiv.text('Project files are required before completion').show();
            return;
        }

        if (!item.isScheduleDone) {
            errorDiv.text('Schedule must be marked as done before completion').show();
            return;
        }

        try {
            const completedQuery = query(
                collection(db, 'completed'),
                where('referenceCode', '==', referenceCode)
            );
            const existingDocs = await getDocs(completedQuery);

            if (!existingDocs.empty) {
                errorDiv.text('Reference code already exists. Please use a unique reference code.').show();
                return;
            }
        } catch (error) {
            console.error('Error checking reference code:', error);
            errorDiv.text('Failed to validate reference code. Please try again.').show();
            return;
        }

        try {
            $('#confirmCompletionBtn').prop('disabled', true).text('Verifying...');

            // Verify password
            const user = auth.currentUser;
            const credential = EmailAuthProvider.credential(user.email, password);
            await reauthenticateWithCredential(user, credential);

            // Create completion data
            const completionData = {
                completedDate: completionDate,
                referenceCode: referenceCode,
                clientInfo: item.clientInfo,
                planName: item.planName,
                selectedServices: item.selectedServices,
                projectFiles: item.projectFiles,
                contractorName: item.clientInfo.contractorName || 'None',
                companyName: item.clientInfo.companyName || 'None',
                representative: item.clientInfo.representative || 'None',
                repClassification: item.clientInfo.repClassification || 'None',
                isReceive: false,
                read: false,
                originalInProgressId: item.id,
                createdAt: serverTimestamp()
            };

            // Add to completed collection
            await setDoc(doc(collection(db, 'completed')), completionData);
            console.log('Added to completed collection');

            // Update client pending document AND create notification
            if (item.accountInfo?.uid && item.pendingDocId) {
                try {
                    const pendingDocRef = doc(db, 'client', item.accountInfo.uid, 'pending', item.pendingDocId);

                    const newNotification = {
                        inquiryId: item.pendingDocId,
                        status: 'Completed',
                        requestTitle: item.requestDescription || item.planName || 'Project',
                        message: `Your request has been completed. You can claim the original copy of the document at Rafallo's office.
                        Reference Code: ${referenceCode}`,
                        timestamp: new Date(),
                        read: false
                    };

                    await updateDoc(pendingDocRef, {
                        notifications: arrayUnion(newNotification),
                        lastUpdated: serverTimestamp(),
                        status: 'completed',
                        projectFiles: item.projectFiles
                    });

                    console.log('✅ Notification sent to client:', newNotification);
                } catch (error) {
                    console.error('Error updating client pending document:', error);
                    // Continue even if this fails - don't block the completion
                }
            } else {
                console.warn('Missing accountInfo.uid or pendingDocId:', {
                    uid: item.accountInfo?.uid,
                    pendingDocId: item.pendingDocId
                });
            }

            // Remove from inProgress
            await deleteDoc(doc(db, 'inProgress', item.id));
            console.log('Removed from inProgress');

            // After deleteDoc and before closing modals
            await auditLogger.logSimpleAction(
                item.id,
                'In Progress',
                item.clientInfo?.clientName || 'Unknown',
                'Moved to Completed'
            );

            this.parent.inquiryManager.showToast('Successfully moved to completed!', 'success');

            // Close both modals
            $('#completionModal').remove();
            $('#inProgressModal').remove();

        } catch (error) {
            console.error('Error moving to completed:', error);

            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                errorDiv.text('Incorrect password. Please try again.').show();
            } else {
                errorDiv.text('Failed to complete the operation. Please try again.').show();
            }

            $('#confirmCompletionBtn').prop('disabled', false).text('Confirm');
        }
    }

    setupCompletionModalEventListeners(item) {
        // Close modal
        $('#completionModalCloseBtn, #cancelCompletionBtn').on('click', () => {
            $('#completionModal').remove();
        });

        // Confirm completion
        $('#confirmCompletionBtn').on('click', () => {
            this.handleMoveToCompleted(item);
        });

        // Handle Enter key
        $('#completionModal input').on('keypress', (e) => {
            if (e.which === 13) {
                this.handleMoveToCompleted(item);
            }
        });
    }

    showMoveToCompletedModal(item) {
        const completionModalHTML = `
        <div id="completionModal" class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Move to Completed</h3>
                    <button class="modal-close" id="completionModalCloseBtn">×</button>
                </div>
                <div class="modal-body">
                    <div class="completion-form">
                        <div class="form-group">
                            <label>Completion Date:</label>
                            <input type="date" id="completionDate" required>
                        </div>
                        <div class="form-group">
                            <label>Reference Code:</label>
                            <input type="text" id="referenceCode" placeholder="Enter reference code" required>
                        </div>
                        <div class="form-group">
                            <label>Confirm Password:</label>
                            <input type="password" id="confirmCompletionPassword" placeholder="Enter your password" required>
                        </div>
                        <div id="completionError" class="error-message" style="display: none;"></div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" id="cancelCompletionBtn">Cancel</button>
                    <button class="btn-primary" id="confirmCompletionBtn">Confirm</button>
                </div>
            </div>
        </div>
    `;

        $('body').append(completionModalHTML);

        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        $('#completionDate').val(today);

        this.setupCompletionModalEventListeners(item);
    }


    setupModalEventListeners(item) {

        this.currentItemId = item.id;

        // Close modal
        $('#modalCloseBtn, #cancelBtn').on('click', async () => {
            // Release lock if in edit mode
            if ($('#saveBtn').is(':visible')) {
                await updateDoc(doc(db, 'inProgress', this.currentItemId), {
                    beingEditedBy: null,
                    editingStartedAt: null
                });

                if (this.lockHeartbeat) {
                    clearInterval(this.lockHeartbeat);
                    this.lockHeartbeat = null;
                }

            }
            $('#inProgressModal').remove();
        });

        // Edit mode + Lock
        $('#editBtn').on('click', async () => {
            const currentItem = this.parent.inProgressItems.find(item => item.id === this.currentItemId);

            // Check if someone else is editing
            if (currentItem.beingEditedBy && currentItem.beingEditedBy !== auth.currentUser.uid) {
                this.parent.inquiryManager.showToast(`Being processed by ${currentItem.beingEditedByName || 'Another User'}`, 'warning');
                return;
            }

            try {

                const userDoc = await getDoc(doc(db, 'accounts', auth.currentUser.uid));
                const userData = userDoc.data();
                const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();

                // Lock the item
                await updateDoc(doc(db, 'inProgress', this.currentItemId), {
                    beingEditedBy: auth.currentUser.uid,
                    beingEditedByName: fullName,
                    editingStartedAt: serverTimestamp()
                });


                const clientName = currentItem.clientInfo?.clientName || 'Unknown';
                await auditLogger.logSimpleAction(
                    this.currentItemId,
                    'In Progress',
                    clientName,
                    'Started editing'
                );

                this.toggleEditMode(true);

                $('#scheduleCheckbox').on('change', function () {
                    if ($(this).is(':checked')) {
                        $('#scheduleEdit').prop('disabled', true);
                    } else {
                        $('#scheduleEdit').prop('disabled', false);
                    }
                });

                this.lockHeartbeat = setInterval(async () => {
                    await updateDoc(doc(db, 'inProgress', this.currentItemId), {
                        editingStartedAt: serverTimestamp()
                    });
                }, 9 * 60 * 1000);

            } catch (error) {
                this.parent.inquiryManager.showToast('Failed to lock item', 'error');
            }
        });

        $('#cancelEditBtn').on('click', async () => {

            const currentItem = this.parent.inProgressItems.find(item => item.id === this.currentItemId);

            // Release the lock
            await updateDoc(doc(db, 'inProgress', this.currentItemId), {
                beingEditedBy: null,
                editingStartedAt: null
            });

            if (this.lockHeartbeat) {
                clearInterval(this.lockHeartbeat);
                this.lockHeartbeat = null;
            }

            // After releasing lock, before toggleEditMode(false)
            const clientName = currentItem.clientInfo?.clientName || 'Unknown';
            await auditLogger.logSimpleAction(
                this.currentItemId,
                'In Progress',
                clientName,
                'Cancelled editing'
            );


            this.toggleEditMode(false);
            this.resetFormValues(item);
            this.tempProjectFiles = null;
            this.filesToDelete = null;
        });

        // Save changes
        $('#saveBtn').on('click', () => {
            this.saveInProgressChanges(item);
        });

        $('#moveToCompletedBtn').on('click', () => {
            this.showMoveToCompletedModal(item);
        });


        $('#quotationEdit').on('input', () => {
            this.calculateModalPricing();
        });
        // Project files management
        $('#addProjectFileBtn').on('click', () => this.handleAddProjectFile());
        $(document).on('click', '.delete-project-btn', (e) => {
            const index = parseInt($(e.target).data('index'));
            this.handleDeleteIndividualProjectFile(index);
        });
    }

    handleDeleteIndividualProjectFile(index) {
        if (confirm('Are you sure you want to remove this file?')) {
            const currentItem = this.parent.inProgressItems.find(item => item.id === this.currentItemId);
            const displayFiles = this.getDisplayFiles();

            // Find which file we're deleting from the display
            const fileToDelete = displayFiles[index];

            // Check if it's an existing file or temp file
            const existingFiles = currentItem.projectFiles ?
                (Array.isArray(currentItem.projectFiles) ? currentItem.projectFiles : [currentItem.projectFiles]) : [];

            // Find if this file exists in existing files
            const existingIndex = existingFiles.findIndex(f => f.name === fileToDelete.name && f.url === fileToDelete.url);

            if (existingIndex !== -1) {
                // It's an existing file - mark for deletion
                if (!this.filesToDelete) this.filesToDelete = [];
                this.filesToDelete.push(existingIndex);
            } else {
                // It's a temp file - remove from temp array
                const tempIndex = this.tempProjectFiles.findIndex(f => f.name === fileToDelete.name);
                if (tempIndex !== -1) {
                    this.tempProjectFiles.splice(tempIndex, 1);
                }
            }

            // Refresh display
            const updatedDisplayFiles = this.getDisplayFiles();
            const projectFilesHTML = this.buildProjectFilesHTML(updatedDisplayFiles, true);
            $('#projectFilesContainer').html(projectFilesHTML);

            this.parent.inquiryManager.showToast('File will be removed when you save.', 'warning');
        }
    }

    getDisplayFiles() {
        const currentItem = this.parent.inProgressItems.find(item => item.id === this.currentItemId);
        let displayFiles = [];

        // Add existing files (but skip deleted ones)
        if (currentItem.projectFiles) {
            const existingFiles = Array.isArray(currentItem.projectFiles) ?
                currentItem.projectFiles : [currentItem.projectFiles];

            existingFiles.forEach((file, index) => {
                if (!this.filesToDelete || !this.filesToDelete.includes(index)) {
                    displayFiles.push(file);
                }
            });
        }

        // Add temp files
        if (this.tempProjectFiles && this.tempProjectFiles.length > 0) {
            displayFiles = displayFiles.concat(this.tempProjectFiles);
        }

        return displayFiles;
    }

    handleAddProjectFile() {
        // Create file input for PDF upload
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.pdf';
        fileInput.style.display = 'none';

        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file && file.type === 'application/pdf') {
                console.log('Selected project PDF file:', file.name);

                if (!this.tempProjectFiles) {
                    this.tempProjectFiles = [];
                }

                this.tempProjectFiles.push({
                    name: file.name,
                    size: file.size,
                    uploadDate: new Date().toISOString(),
                    rawFile: file
                });

                // Refresh display with current state (respecting deleted files)
                const displayFiles = this.getDisplayFiles();
                const projectFilesHTML = this.buildProjectFilesHTML(displayFiles, true);
                $('#projectFilesContainer').html(projectFilesHTML);

                this.parent.inquiryManager.showToast('Project file added! Click Save to upload all files.', 'info');
            } else {
                alert('Please select a valid PDF file');
            }
        };

        document.body.appendChild(fileInput);
        fileInput.click();
        document.body.removeChild(fileInput);
    }

    calculateModalPricing() {
        let input = $('#quotationEdit').val().replace(/[^\d]/g, ''); // Remove everything except digits

        // If completely empty, show 0.00 and reset everything
        if (!input || input === '') {
            $('#quotationEdit').val('0.00');
            $('#is40Edit').siblings('.payment-text').text('Down Payment (40%): ₱0.00');
            $('#is60Edit').siblings('.payment-text').text('Upon Delivery (60%): ₱0.00');
            return;
        }

        // Remove leading zeros but keep at least one digit
        input = input.replace(/^0+/, '') || '0';

        // Simply limit to 9 digits maximum - don't force to 100M
        if (input.length > 9) {
            input = input.substring(0, 9);
        }

        // Format with commas and update input field
        const formattedInput = this.addCommas(input);
        $('#quotationEdit').val(formattedInput);

        // Calculate
        const amount = parseFloat(input) || 0;
        const downPayment = amount * 0.40;
        const uponDelivery = amount * 0.60;

        // Update the payment text displays
        const is40Checked = $('#is40Edit').is(':checked');
        const is60Checked = $('#is60Edit').is(':checked');

        // Update down payment text
        const downPaymentText = `Down Payment (40%): ${this.formatCurrency(downPayment)}`;
        $('#is40Edit').siblings('.payment-text').text(downPaymentText);

        // Update upon delivery text  
        const uponDeliveryText = `Upon Delivery (60%): ${this.formatCurrency(uponDelivery)}`;
        $('#is60Edit').siblings('.payment-text').text(uponDeliveryText);
    }

    addCommas(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    resetFormValues(item) {
        // Reset all form values to original
        $('#quotationEdit').val(item.totalAmount || 0);
        $('#is40Edit').prop('checked', item.is40 || false);
        $('#is60Edit').prop('checked', item.is60 || false);
        $('#scheduleCheckbox').prop('checked', item.isScheduleDone || false);
        if (item.schedule) {
            $('#scheduleEdit').val(this.formatDateForInput(item.schedule));
        }
        $('#teamEdit').val(item.selectedTeam || '');
        $('#encroachmentEdit').prop('checked', item.isEncroachment || false);
        $('#needResearchEdit').prop('checked', item.isNeedResearch || false);
        $('#doneLayoutEdit').prop('checked', item.isDoneLayout || false);
        $('#remarksEdit').val(item.remarks || '');

        // Reset service checkboxes
        const selectedServices = item.selectedServices || [];
        $('#servicesContainer input[type="checkbox"]').each(function () {
            const isChecked = selectedServices.includes($(this).val());
            $(this).prop('checked', isChecked);
        });

        this.tempProjectFiles = null;
        const currentItem = this.parent.inProgressItems.find(item => item.id === this.currentItemId);
        const projectFilesHTML = this.buildProjectFilesHTML(currentItem.projectFiles, false);
        $('#projectFilesContainer').html(projectFilesHTML);
    }

    toggleEditMode(isEdit) {
        if (isEdit) {
            // Show edit elements
            $('#quotationEdit, #scheduleEdit, #teamEdit, #remarksEdit, #saveBtn, #cancelEditBtn').show();
            $('#projectFilesActions').show();
            $('#moveToCompletedBtn').prop('disabled', true);

            const item = this.parent.inProgressItems.find(item => item.id === this.currentItemId);
            const documentsHTML = this.buildDocumentsHTML(item.documents || [], false);

            // Combine existing files with temporary files for display
            let displayFiles = [];

            // Add existing files (convert single object to array if needed)
            if (item.projectFiles) {
                if (Array.isArray(item.projectFiles)) {
                    displayFiles = [...item.projectFiles];
                } else {
                    displayFiles = this.getDisplayFiles();
                }
            }

            // Add temporary files
            if (this.tempProjectFiles && this.tempProjectFiles.length > 0) {
                displayFiles = displayFiles.concat(this.tempProjectFiles);
            }

            const projectFilesHTML = this.buildProjectFilesHTML(displayFiles, true);
            $('#documentsContainer').html(documentsHTML);
            $('#projectFilesContainer').html(projectFilesHTML);

            // Hide view elements
            $('#quotationValue, #teamValue, #remarksValue, #editBtn').hide();
            // Enable checkboxes
            $('#is40Edit, #is60Edit, #scheduleCheckbox, #encroachmentEdit, #needResearchEdit, #doneLayoutEdit').prop('disabled', false);
            // Enable service checkboxes
            $('#servicesContainer input[type="checkbox"]').prop('disabled', false);

        } else {
            // Hide edit elements
            $('#quotationEdit, #scheduleEdit, #teamEdit, #remarksEdit, #saveBtn, #cancelEditBtn').hide();
            $('#documentsActions, #projectFilesActions').hide();
            $('#moveToCompletedBtn').prop('disabled', false);

            const item = this.parent.inProgressItems.find(item => item.id === this.currentItemId);
            const documentsHTML = this.buildDocumentsHTML(item.documents || [], false);
            const projectFilesHTML = this.buildProjectFilesHTML(item.projectFiles, false);
            $('#documentsContainer').html(documentsHTML);
            $('#projectFilesContainer').html(projectFilesHTML);

            // Show view elements
            $('#quotationValue, #teamValue, #remarksValue, #editBtn').show();
            // Disable checkboxes
            $('#is40Edit, #is60Edit, #scheduleCheckbox, #encroachmentEdit, #needResearchEdit, #doneLayoutEdit').prop('disabled', true);
            // Disable service checkboxes
            $('#servicesContainer input[type="checkbox"]').prop('disabled', true);
        }
    }

    async saveInProgressChanges(item) {
        try {
            console.log('auth.currentUser?.uid:', auth.currentUser?.uid);
            const currentItem = this.parent.inProgressItems.find(i => i.id === item.id);

            let finalProjectFiles = [];

            // Convert existing projectFiles to array format, excluding deleted ones
            if (currentItem.projectFiles) {
                const existingFiles = Array.isArray(currentItem.projectFiles) ?
                    currentItem.projectFiles : [currentItem.projectFiles];

                // Delete files from Storage before filtering (sequential)
                if (this.filesToDelete && this.filesToDelete.length > 0) {
                    console.log('Deleting files from Storage...');
                    for (const deleteIndex of this.filesToDelete) {
                        const fileToDelete = existingFiles[deleteIndex];
                        if (fileToDelete) {
                            try {
                                // Handle both new format (storagePath) and old format (url)
                                let storageRef;
                                if (fileToDelete.storagePath) {
                                    storageRef = ref(storage, fileToDelete.storagePath);
                                } else if (fileToDelete.url) {
                                    storageRef = ref(storage, fileToDelete.url);
                                } else {
                                    continue;
                                }

                                await deleteObject(storageRef);
                                console.log('Deleted file from Storage:', fileToDelete.name);
                            } catch (error) {
                                console.error('Error deleting file from Storage:', error);
                                // Continue with other files
                            }
                        }
                    }
                }

                // Only include files that are NOT in the filesToDelete array
                if (this.filesToDelete && this.filesToDelete.length > 0) {
                    finalProjectFiles = existingFiles.filter((file, index) =>
                        !this.filesToDelete.includes(index)
                    );
                } else {
                    finalProjectFiles = [...existingFiles];
                }
            }


            if (this.tempProjectFiles && this.tempProjectFiles.length > 0) {
                console.log('Uploading project files to Storage...');

                const clientUid = currentItem.accountInfo?.uid;

                for (const tempFile of this.tempProjectFiles) {
                    const timestamp = Date.now() + Math.random(); // Add randomness to avoid name conflicts
                    const storageRef = ref(storage, `super_admin_projectFiles/${clientUid}/${timestamp}_${tempFile.name}`);

                    await uploadBytes(storageRef, tempFile.rawFile);

                    finalProjectFiles.push({
                        name: tempFile.name,
                        size: tempFile.size,
                        uploadDate: tempFile.uploadDate,
                        storagePath: `super_admin_projectFiles/${clientUid}/${timestamp}_${tempFile.name}`,
                    });
                }
            }

            if (this.projectFilesToDelete) {
                finalProjectFiles = null;
            }


            // ===== FIX: Only get quotation value if user is super_admin =====
            let totalAmount = currentItem.totalAmount; // Keep existing amount by default
            if (this.parent.isSuperAdmin) {
                const quotationInput = $('#quotationEdit').val();
                if (quotationInput) {
                    totalAmount = parseFloat(quotationInput.replace(/,/g, '')) || 0;
                }
            }

            // ===== FIX: Only get payment checkboxes if user is super_admin =====
            let is40 = currentItem.is40; // Keep existing values by default
            let is60 = currentItem.is60;
            if (this.parent.isSuperAdmin) {
                is40 = $('#is40Edit').is(':checked');
                is60 = $('#is60Edit').is(':checked');
            }

            const isScheduleDone = $('#scheduleCheckbox').is(':checked');
            const wasScheduleDone = currentItem.isScheduleDone;

            // Collect updated data
            const updates = {
                totalAmount: totalAmount,
                is40: is40,
                is60: is60,
                selectedServices: this.getSelectedServicesFromModal(),
                isScheduleDone: $('#scheduleCheckbox').is(':checked'),
                schedule: $('#scheduleEdit').val()
                    ? this.formatDateForDisplay($('#scheduleEdit').val())
                    : item.schedule,
                selectedTeam: $('#teamEdit').val() || item.selectedTeam,
                isEncroachment: $('#encroachmentEdit').is(':checked'),
                isNeedResearch: $('#needResearchEdit').is(':checked'),
                isDoneLayout: $('#doneLayoutEdit').is(':checked'),
                // adminNotes: $('#adminNotesEdit').val(),
                remarks: $('#remarksEdit').val(),
                documents: currentItem.documents || [],
                projectFiles: finalProjectFiles
            };

            if (isScheduleDone && !wasScheduleDone) {
                updates.read = true;
            }

            // After collecting all updates, before updateDoc
            const clientName = currentItem.clientInfo?.clientName || 'Unknown';
            auditLogger.startBatch(item.id, 'In Progress', clientName);

            // Check quotation change
            if (this.parent.isSuperAdmin && totalAmount !== currentItem.totalAmount) {
                auditLogger.addChange(
                    'Changed Quotation',
                    `₱${currentItem.totalAmount.toLocaleString()}`,
                    `₱${totalAmount.toLocaleString()}`
                );
            }

            // Check payment checkboxes
            if (this.parent.isSuperAdmin) {
                if (is40 !== currentItem.is40) {
                    auditLogger.addChange(
                        'Downpayment (40%)',
                        auditLogger.formatPaymentStatus(currentItem.is40),
                        auditLogger.formatPaymentStatus(is40)
                    );
                }
                if (is60 !== currentItem.is60) {
                    auditLogger.addChange(
                        'Upon Delivery (60%)',
                        auditLogger.formatPaymentStatus(currentItem.is60),
                        auditLogger.formatPaymentStatus(is60)
                    );
                }
            }

            // Check services
            const oldServices = currentItem.selectedServices || [];
            const newServices = updates.selectedServices;
            if (JSON.stringify(oldServices) !== JSON.stringify(newServices)) {
                auditLogger.addChange(
                    'Changed Services',
                    auditLogger.formatServices(oldServices),
                    auditLogger.formatServices(newServices)
                );
            }

            // Check schedule
            if (updates.isScheduleDone !== currentItem.isScheduleDone) {
                auditLogger.addChange(
                    'Survey Schedule Status',
                    currentItem.isScheduleDone ? 'Done' : 'Pending',
                    updates.isScheduleDone ? 'Done' : 'Pending'
                );
            }

            if (updates.schedule !== currentItem.schedule) {
                auditLogger.addChange(
                    'Survey Schedule Date',
                    currentItem.schedule || 'Not set',
                    updates.schedule || 'Not set'
                );
            }

            // Check team
            if (updates.selectedTeam !== currentItem.selectedTeam) {
                auditLogger.addChange(
                    'Survey Team',
                    `Team ${currentItem.selectedTeam || 'Not assigned'}`,
                    `Team ${updates.selectedTeam || 'Not assigned'}`
                );
            }

            // Check findings
            if (updates.isEncroachment !== currentItem.isEncroachment) {
                auditLogger.addChange(
                    'Finding: Encroachment',
                    currentItem.isEncroachment ? 'Yes' : 'No',
                    updates.isEncroachment ? 'Yes' : 'No'
                );
            }
            if (updates.isNeedResearch !== currentItem.isNeedResearch) {
                auditLogger.addChange(
                    'Finding: Need Research',
                    currentItem.isNeedResearch ? 'Yes' : 'No',
                    updates.isNeedResearch ? 'Yes' : 'No'
                );
            }
            if (updates.isDoneLayout !== currentItem.isDoneLayout) {
                auditLogger.addChange(
                    'Finding: Done Layout',
                    currentItem.isDoneLayout ? 'Yes' : 'No',
                    updates.isDoneLayout ? 'Yes' : 'No'
                );
            }

            // Check remarks
            if (updates.remarks !== currentItem.remarks) {
                auditLogger.addChange(
                    'Changed Remarks',
                    currentItem.remarks || 'None',
                    updates.remarks || 'None'
                );
            }

            // Check project files
            const oldFiles = currentItem.projectFiles || [];
            const newFiles = finalProjectFiles || [];
            const oldFileNames = Array.isArray(oldFiles) ? oldFiles.map(f => f.name).join(', ') : (oldFiles.name || 'None');
            const newFileNames = Array.isArray(newFiles) ? newFiles.map(f => f.name).join(', ') : (newFiles.name || 'None');

            if (oldFileNames !== newFileNames) {
                auditLogger.addChange(
                    'Project Files',
                    oldFileNames,
                    newFileNames
                );
            }

            // Commit batch
            await auditLogger.commitBatch();





            // Update Firestore
            await updateDoc(doc(db, 'inProgress', item.id), {
                ...updates,
                beingEditedBy: null,
                editingStartedAt: null
            });


            await auditLogger.logSimpleAction(
                item.id,
                'In Progress',
                clientName,
                'Finished editing'
            );


            // Clear temporary data
            this.tempProjectFiles = null;
            this.filesToDelete = null;
            this.projectFilesToDelete = false;

            if (this.lockHeartbeat) {
                clearInterval(this.lockHeartbeat);
                this.lockHeartbeat = null;
            }

            this.parent.inquiryManager.showToast('Changes saved successfully!', 'success');

            // Exit edit mode and refresh with saved data
            this.toggleEditMode(false);

            Object.assign(item, updates);
            this.refreshModalContent(item);

            // Also update the parent array
            const itemIndex = this.parent.inProgressItems.findIndex(i => i.id === item.id);
            if (itemIndex !== -1) {
                Object.assign(this.parent.inProgressItems[itemIndex], updates);
            }

        } catch (error) {
            console.error('Error saving changes:', error);
            this.parent.inquiryManager.showToast('Failed to save changes', 'error');
        }
    }

    refreshModalContent(item) {
        // Update all read-only display values with fresh data
        $('#quotationValue').text(this.formatCurrency(item.totalAmount || 0));
        $('#teamValue').text(`Team ${item.selectedTeam || 'Not assigned'}`);
        $('#remarksValue').text(item.remarks || 'No remarks');

        // Update schedule display
        const scheduleText = item.isScheduleDone ? '--' : (this.formatDateForDisplay(item.schedule) || 'Not scheduled');
        $('#scheduleCheckbox').siblings('span').text(`Schedule: ${scheduleText}`);

        // Update checkboxes to match saved state
        $('#is40Edit').prop('checked', item.is40 || false);
        $('#is60Edit').prop('checked', item.is60 || false);
        $('#scheduleCheckbox').prop('checked', item.isScheduleDone || false);
        $('#encroachmentEdit').prop('checked', item.isEncroachment || false);
        $('#needResearchEdit').prop('checked', item.isNeedResearch || false);
        $('#doneLayoutEdit').prop('checked', item.isDoneLayout || false);

        // Update services checkboxes
        const selectedServices = item.selectedServices || [];
        $('#servicesContainer input[type="checkbox"]').each(function () {
            const isChecked = selectedServices.includes($(this).val());
            $(this).prop('checked', isChecked);
        });

        // Refresh project files display
        const projectFilesHTML = this.buildProjectFilesHTML(item.projectFiles, false);
        $('#projectFilesContainer').html(projectFilesHTML);
    }

    getSelectedServicesFromModal() {
        const selectedServices = [];
        $('#servicesContainer input[type="checkbox"]:checked').each(function () {
            selectedServices.push($(this).val());
        });
        return selectedServices;
    }

    async markAsRead(itemId) {
        try {
            const item = this.parent.inProgressItems.find(item => item.id === itemId);
            if (!item || item.read) {
                return;
            }

            const itemDocRef = doc(db, 'inProgress', itemId);
            await updateDoc(itemDocRef, {
                read: true,
            });

            console.log('InProgress item marked as read:', itemId);

        } catch (error) {
            console.error('Error marking in-progress item as read:', error);
        }
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(amount);
    }

    formatDateForDisplay(dateStr) {
        if (!dateStr) return '';
        // Handle yyyy-mm-dd (from date picker) → dd/mm/yyyy
        if (dateStr.includes('-')) {
            const [year, month, day] = dateStr.split('-');
            return `${day}/${month}/${year}`;
        }
        // Already dd/mm/yyyy
        return dateStr;
    }

    formatDateForInput(dateStr) {
        if (!dateStr) return '';
        // Convert dd/mm/yyyy → yyyy-mm-dd (for <input type="date">)
        const parts = dateStr.split('/');
        if (parts.length !== 3) return dateStr;
        const [day, month, year] = parts;
        return `${year}-${month}-${day}`;
    }

    async checkAndUpdateScheduleStatus() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (const item of this.parent.inProgressItems) {
            // Skip if schedule is already done or no schedule set
            if (item.isScheduleDone || !item.schedule) continue;

            const scheduleParts = item.schedule.split('/');
            if (scheduleParts.length !== 3) continue;

            const [day, month, year] = scheduleParts;
            const scheduleDate = new Date(year, month - 1, day);
            scheduleDate.setHours(0, 0, 0, 0);

            // If schedule is today, mark as unread
            if (scheduleDate <= today && item.read !== false) {
                try {
                    await updateDoc(doc(db, 'inProgress', item.id), { read: false });
                    console.log(`Marked item ${item.id} as unread due to schedule date`);
                } catch (error) {
                    console.error('Error updating read status:', error);
                }
            }
        }
    }

    async setupInProgressListener() {
        try {
            console.log('Setting up in-progress listener...');
            this.parent.uiRenderer.showLoading();

            const inProgressQuery = query(
                collection(db, 'inProgress'),
                orderBy('read', 'asc'),
                orderBy('createdAt', 'desc')
            );

            this.parent.unsubscribeInProgress = onSnapshot(inProgressQuery, (snapshot) => {
                console.log('InProgress snapshot received:', snapshot.size, 'documents');


                const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);
                snapshot.docs.forEach(async (docSnap) => {
                    if (docSnap.id === '_init') return;

                    const data = docSnap.data();
                    if (data.beingEditedBy && data.editingStartedAt) {
                        const editingStarted = data.editingStartedAt.toDate();
                        if (editingStarted < twentyMinutesAgo) {
                            await updateDoc(doc(db, 'inProgress', docSnap.id), {
                                beingEditedBy: null,
                                editingStartedAt: null
                            });
                            console.log(`Released stale lock for inProgress ${docSnap.id}`);
                        }
                    }
                });

                // Filter out the _init document
                this.parent.inProgressItems = snapshot.docs
                    .filter(doc => doc.id !== '_init')
                    .map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }))
                    .sort((a, b) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);

                        const getSchedulePriority = (item) => {
                            if (item.isScheduleDone || !item.schedule) return 3; // No priority

                            const scheduleParts = item.schedule.split('/');
                            if (scheduleParts.length !== 3) return 3;

                            const scheduleDate = new Date(scheduleParts[2], scheduleParts[1] - 1, scheduleParts[0]);
                            scheduleDate.setHours(0, 0, 0, 0);

                            if (scheduleDate < today) return 0; // Gray (overdue) - FIRST
                            if (scheduleDate.getTime() === today.getTime()) return 1; // Red (today) - SECOND
                            return 3; // No urgency
                        };

                        const priorityA = getSchedulePriority(a);
                        const priorityB = getSchedulePriority(b);

                        // Sort by schedule priority first
                        if (priorityA !== priorityB) return priorityA - priorityB;

                        // Then by read status
                        if (a.read !== b.read) return a.read ? 1 : -1;

                        // Finally by createdAt
                        const dateA = a.createdAt?.toDate?.() || new Date(0);
                        const dateB = b.createdAt?.toDate?.() || new Date(0);
                        return dateB - dateA;
                    });

                console.log('Processed in-progress items:', this.parent.inProgressItems.length);

                this.checkAndUpdateScheduleStatus()
                // Always update notification count
                this.parent.updateInProgressNotificationCount();



                // Only update UI if we're currently viewing in-progress
                if ($('#inProgressNav').hasClass('active')) {
                    this.parent.uiRenderer.showInProgressItems();
                }

            }, (error) => {
                console.error('Error listening to in-progress:', error);
                this.parent.uiRenderer.showError('Failed to load in-progress: ' + error.message);
            });

            setInterval(() => {
                const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);
                this.parent.inProgressItems.forEach(async (item) => {
                    if (item.beingEditedBy && item.editingStartedAt) {
                        const editingStarted = item.editingStartedAt.toDate();
                        if (editingStarted < twentyMinutesAgo) {
                            await updateDoc(doc(db, 'inProgress', item.id), {
                                beingEditedBy: null,
                                editingStartedAt: null
                            });
                            console.log(`Released stale lock for inProgress ${item.id}`);
                        }
                    }
                });
            }, 2 * 60 * 1000);

        } catch (error) {
            console.error('Error setting up in-progress listener:', error);
            this.parent.uiRenderer.showError('Failed to initialize in-progress: ' + error.message);
        }
    }

    async markInProgressAsRead(itemId) {
        try {
            const item = this.parent.inProgressItems.find(item => item.id === itemId);
            if (!item || item.read) {
                return;
            }

            const itemDocRef = doc(db, 'inProgress', itemId);
            await updateDoc(itemDocRef, {
                read: true,
            });

            console.log('InProgress item marked as read:', itemId);

        } catch (error) {
            console.error('Error marking in-progress item as read:', error);
        }
    }

    formatServices(services) {
        if (!services || services.length === 0) return 'None';

        // If more than 3 services, show first 2 and "X more"
        if (services.length > 3) {
            return services.slice(0, 2).join(', ') + ` +${services.length - 2} more`;
        }

        return services.join(', ');
    }











}

export default InProgressManager;