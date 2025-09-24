
import {
    db,
    collection,
    query,
    orderBy,
    onSnapshot,
    doc,
    updateDoc,
    serverTimestamp
} from '../../../firebase-config.js';
class InProgressManager {
    constructor(parentInstance) {
        this.parent = parentInstance;
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
        const documentsHTML = this.buildDocumentsHTML(item.documents || []);

        // Project files
        const projectFilesHTML = this.buildProjectFilesHTML(item.projectFiles);

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
                        <div class="detail-card">
                            <div class="card-header">
                                <h4>Quotation</h4>
                            </div>
                            <div class="card-body">
                                <div class="info-row">
                                    <span class="label">Total Amount:</span>
                                    <span class="value" id="quotationValue">${quotation}</span>
                                    <input type="text" id="quotationEdit" value="${totalAmount}" style="display: none;">
                                </div>
                                <div class="info-row">
                                    <label class="checkbox-row">
                                        <input type="checkbox" id="is40Edit" ${item.is40 ? 'checked' : ''} disabled>
                                        <span class="payment-text ${item.is40 ? 'payment-paid' : 'payment-unpaid'}">Down Payment (40%): ${downPayment}</span>
                                    </label>
                                </div>
                                <div class="info-row">
                                    <label class="checkbox-row">
                                        <input type="checkbox" id="is60Edit" ${item.is60 ? 'checked' : ''} disabled>
                                        <span class="payment-text ${item.is60 ? 'payment-delivered' : 'payment-unpaid'}">Upon Delivery (60%): ${uponDelivery}</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <!-- Transmittal of Documents -->
                        <div class="detail-card">
                            <div class="card-header">
                                <h4>Transmittal of Documents</h4>
                            </div>
                            <div class="card-body">
                                <div id="documentsContainer">
                                    ${documentsHTML}
                                </div>
                            </div>
                        </div>

                        <!-- Plotting of Lot and Research -->
                        <div class="detail-card">
                            <div class="card-header">
                                <h4>Plotting of Lot and Research</h4>
                            </div>
                            <div class="card-body">
                                <div id="projectFilesContainer">
                                    ${projectFilesHTML}
                                </div>
                            </div>
                        </div>

                        <!-- Survey Task Information -->
                        <div class="detail-card">
                            <div class="card-header">
                                <h4>Survey Task Information</h4>
                            </div>
                            <div class="card-body">
                                <div class="info-row">
                                    <label class="checkbox-row">
                                        <input type="checkbox" id="scheduleCheckbox" ${item.isScheduleDone ? 'checked' : ''} disabled>
                                        <span>Schedule: ${item.schedule || 'Not scheduled'}</span>
                                        <input type="date" id="scheduleEdit" value="" style="display: none; margin-left: 10px;">
                                    </label>
                                </div>
                            </div>
                        </div>

                        <!-- Survey Team -->
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
                        </div>

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
                        <div class="detail-card full-width">
                            <div class="card-header">
                                <h4>Super Admin Notes</h4>
                            </div>
                            <div class="card-body">
                                <div class="readonly-text" id="adminNotesValue">${item.adminNotes || 'No admin notes'}</div>
                                <textarea id="adminNotesEdit" rows="3" style="display: none;">${item.adminNotes || ''}</textarea>
                            </div>
                        </div>

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
                    <button class="btn-secondary" id="editBtn">Edit</button>
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

    buildDocumentsHTML(documents) {
        if (!documents || documents.length === 0) {
            return '<p>No documents uploaded</p>';
        }

        const documentsList = documents.map(doc =>
            `<div class="document-item">
            <a href="${doc.url}" target="_blank">${doc.name}</a>
        </div>`
        ).join('');

        return documentsList;
    }


    buildProjectFilesHTML(projectFiles) {
        if (!projectFiles) {
            return '<p>No project files uploaded</p>';
        }

        // Handle projectFiles structure when it exists
        return '<p>Project files available</p>';
    }

    setupModalEventListeners(item) {
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
        });

        // Save changes
        $('#saveBtn').on('click', () => {
            this.saveInProgressChanges(item);
        });

        $('#quotationEdit').on('input', () => {
            this.updatePaymentCalculations();
        });
    }

    updatePaymentCalculations() {
        const totalAmount = parseFloat($('#quotationEdit').val()) || 0;
        const downPayment = totalAmount * 0.40;
        const uponDelivery = totalAmount * 0.60;

        // Update the payment text displays
        const is40Checked = $('#is40Edit').is(':checked');
        const is60Checked = $('#is60Edit').is(':checked');

        // Update down payment text
        const downPaymentText = `Down Payment (40%): ${this.formatCurrency(downPayment)}`;
        $('#is40Edit').siblings('.payment-text').text(downPaymentText);

        // Update upon delivery text  
        const uponDeliveryText = `Upon Delivery (60%): ${this.formatCurrency(uponDelivery)}`;
        $('#is60Edit').siblings('.payment-text').text(uponDeliveryText);

        // Update CSS classes based on checkbox states
        $('#is40Edit').siblings('.payment-text')
            .removeClass('payment-paid payment-unpaid')
            .addClass(is40Checked ? 'payment-paid' : 'payment-unpaid');

        $('#is60Edit').siblings('.payment-text')
            .removeClass('payment-delivered payment-unpaid')
            .addClass(is60Checked ? 'payment-delivered' : 'payment-unpaid');
    }


    resetFormValues(item) {
        // Reset all form values to original
        $('#quotationEdit').val(item.totalAmount || 0);
        $('#is40Edit').prop('checked', item.is40 || false);
        $('#is60Edit').prop('checked', item.is60 || false);
        $('#scheduleCheckbox').prop('checked', item.isScheduleDone || false);
        $('#teamEdit').val(item.selectedTeam || '');
        $('#encroachmentEdit').prop('checked', item.isEncroachment || false);
        $('#needResearchEdit').prop('checked', item.isNeedResearch || false);
        $('#doneLayoutEdit').prop('checked', item.isDoneLayout || false);
        $('#adminNotesEdit').val(item.adminNotes || '');
        $('#remarksEdit').val(item.remarks || '');

        // Reset service checkboxes
        const selectedServices = item.selectedServices || [];
        $('#servicesContainer input[type="checkbox"]').each(function () {
            const isChecked = selectedServices.includes($(this).val());
            $(this).prop('checked', isChecked);
        });
    }

    toggleEditMode(isEdit) {
        if (isEdit) {
            // Show edit elements
            $('#quotationEdit, #scheduleEdit, #teamEdit, #adminNotesEdit, #remarksEdit, #saveBtn, #cancelEditBtn').show();
            // Hide view elements
            $('#quotationValue, #teamValue, #adminNotesValue, #remarksValue, #editBtn').hide();
            // Enable checkboxes
            $('#is40Edit, #is60Edit, #scheduleCheckbox, #encroachmentEdit, #needResearchEdit, #doneLayoutEdit').prop('disabled', false);
            // Enable service checkboxes
            $('#servicesContainer input[type="checkbox"]').prop('disabled', false);
        } else {
            // Hide edit elements
            $('#quotationEdit, #scheduleEdit, #teamEdit, #adminNotesEdit, #remarksEdit, #saveBtn, #cancelEditBtn').hide();
            // Show view elements
            $('#quotationValue, #teamValue, #adminNotesValue, #remarksValue, #editBtn').show();
            // Disable checkboxes
            $('#is40Edit, #is60Edit, #scheduleCheckbox, #encroachmentEdit, #needResearchEdit, #doneLayoutEdit').prop('disabled', true);
            // Disable service checkboxes
            $('#servicesContainer input[type="checkbox"]').prop('disabled', true);
        }
    }

    async saveInProgressChanges(item) {
        try {
            // Collect updated data
            const updates = {
                totalAmount: parseFloat($('#quotationEdit').val()) || 0,
                is40: $('#is40Edit').is(':checked'),
                is60: $('#is60Edit').is(':checked'),
                selectedServices: this.getSelectedServicesFromModal(),
                isScheduleDone: $('#scheduleCheckbox').is(':checked'),
                schedule: $('#scheduleEdit').val() || item.schedule,
                selectedTeam: $('#teamEdit').val() || item.selectedTeam,
                isEncroachment: $('#encroachmentEdit').is(':checked'),
                isNeedResearch: $('#needResearchEdit').is(':checked'),
                isDoneLayout: $('#doneLayoutEdit').is(':checked'),
                adminNotes: $('#adminNotesEdit').val(),
                remarks: $('#remarksEdit').val()
            };

            // Update Firestore
            await updateDoc(doc(db, 'inProgress', item.id), updates);

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