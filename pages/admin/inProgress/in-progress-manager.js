
import {
    db,
    collection,
    query,
    orderBy,
    onSnapshot,
    doc,
    updateDoc,
    serverTimestamp,
    storage,  // Add this
    ref,      // Add this
    uploadBytes,  // Add this
    getDownloadURL,
    getDoc,
    auth,
    deleteObject
} from '../../../firebase-config.js';
class InProgressManager {
    constructor(parentInstance) {
        this.parent = parentInstance;
        window.inProgressManager = this;
    }

    // PS: For the future devs working on this file,
    // I apologize for the mess. This was rushed to meet a deadline.
    // I'll refactor this properly when I have time (hopefully soon).

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


    showInProgressDetails(itemId) {
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
                                        <span>Schedule: ${this.formatDateForDisplay(item.schedule) || 'Not scheduled'}</span>
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
                                        <option value="A" ${item.selectedTeam === 'A' ? 'selected' : ''}>Team A</option>
                                        <option value="B" ${item.selectedTeam === 'B' ? 'selected' : ''}>Team B</option>
                                        <option value="C" ${item.selectedTeam === 'C' ? 'selected' : ''}>Team C</option>
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
                    <!-- ===== HIDE EDIT BUTTON FOR STAFF ===== -->
                    ${this.parent.isAdmin || this.parent.isSuperAdmin ? `<button class="btn-secondary" id="editBtn">Edit</button>` : ''}
                    <button class="btn-primary" id="saveBtn" style="display: none;">Save</button>
                    <button class="btn-secondary" id="cancelEditBtn" style="display: none;">Cancel</button>
                    <button class="btn-cancel" id="cancelBtn">Close</button>
                </div>
            </div>
        </div>
    `;

        $('body').append(modalHTML);
        this.setupModalEventListeners(item);
    }


    buildServicesCheckboxes(selectedServices, editable = true) {
        const allServices = [
            'Relocation Survey',
            'Boundary Survey',
            'Subdivision Survey',
            'Engineering Services',
            'Topographic Survey',
            'As-Built Survey',
            'Tilting Assistance'
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
    async handleViewFile(storagePath, legacyUrl) {
        try {
            let downloadURL;

            if (legacyUrl) {
                // Use existing URL for backward compatibility
                downloadURL = legacyUrl;
            } else if (storagePath) {
                // Generate URL on demand
                const fileRef = ref(storage, storagePath);
                downloadURL = await getDownloadURL(fileRef);
            } else {
                throw new Error('No file path or URL available');
            }

            window.open(downloadURL, '_blank');
        } catch (error) {
            console.error('Error opening file:', error);
            alert('Unable to open file');
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
            <button class="view-link" onclick="window.inProgressManager.handleViewFile('${file.storagePath || ''}', '${file.url || ''}')">View File</button>
${editable ? `<button class="btn-small btn-danger delete-project-btn" data-index="${index}" type="button"></button>` : ''}
        </div>
    `).join('');
    }



    setupModalEventListeners(item) {

        this.currentItemId = item.id;

        // Close modal
        $('#modalCloseBtn, #cancelBtn').on('click', () => {
            $('#inProgressModal').remove();
        });

        // Edit mode
        $('#editBtn').on('click', () => {
            this.toggleEditMode(true);
        });

        $('#cancelEditBtn').on('click', () => {
            this.toggleEditMode(false);
            this.resetFormValues(item); // Reset any changes

            this.tempProjectFiles = null;
            this.filesToDelete = null;
        });

        // Save changes
        $('#saveBtn').on('click', () => {
            this.saveInProgressChanges(item);
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

            // Update Firestore
            await updateDoc(doc(db, 'inProgress', item.id), updates);

            // Clear temporary data
            this.tempProjectFiles = null;
            this.filesToDelete = null;
            this.projectFilesToDelete = false;

            this.parent.inquiryManager.showToast('Changes saved successfully!', 'success');
            $('#inProgressModal').remove();

        } catch (error) {
            console.error('Error saving changes:', error);
            this.parent.inquiryManager.showToast('Failed to save changes', 'error');
        }
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


    async setupInProgressListener() {
        try {
            console.log('Setting up in-progress listener...');
            this.parent.uiRenderer.showLoading();

            const inProgressQuery = query(
                collection(db, 'inProgress'),
                orderBy('createdAt', 'desc')
            );

            this.parent.unsubscribeInProgress = onSnapshot(inProgressQuery, (snapshot) => {
                console.log('InProgress snapshot received:', snapshot.size, 'documents');

                // Filter out the _init document
                this.parent.inProgressItems = snapshot.docs
                    .filter(doc => doc.id !== '_init')
                    .map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));

                console.log('Processed in-progress items:', this.parent.inProgressItems.length);

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