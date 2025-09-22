class UIRenderer {
    constructor(parentInstance) {
        this.parent = parentInstance;
    }

    handleBulkDelete() {
        const selectedIds = $('.row-checkbox:checked').map(function () {
            return $(this).val();
        }).get();

        if (selectedIds.length === 0) return;

        const confirmMessage = `Are you sure you want to permanently delete ${selectedIds.length} archived ${selectedIds.length === 1 ? 'inquiry' : 'inquiries'}? This action cannot be undone.`;

        if (confirm(confirmMessage)) {
            this.parent.inquiryManager.bulkDeleteArchived(selectedIds);
        }
    }

    showInProgressItems() {
        if (this.parent.inProgressItems.length === 0) {
            $('#inquiryContent').html(`
            <div class="empty-state">
                <h3>⚙️ No items in progress</h3>
                <p>Approved inquiries will appear here.</p>
            </div>
        `);
            return;
        }

        const tableRows = this.parent.inProgressItems.map(item => {
            // Client Name & Contact
            const clientName = item.clientInfo?.clientName || 'Unknown Client';
            const contact = item.clientInfo?.contact || '';

            // Plan Name
            const planName = item.planName || 'Not specified';

            // Services (formatted to prevent overflow)
            const services = this.parent.inProgressManager.formatServices(item.selectedServices);


            // Schedule
            const schedule = item.schedule || 'Not scheduled';

            // Quotation & Payments
            const totalAmount = item.totalAmount || 0;
            const quotation = this.parent.inProgressManager.formatCurrency(totalAmount);
            const downPayment = this.parent.inProgressManager.formatCurrency(totalAmount * 0.40);
            const uponDelivery = this.parent.inProgressManager.formatCurrency(totalAmount * 0.60);

            // Remarks
            const remarks = item.remarks || '--';

            // Read status
            const readClass = item.read ? 'read' : 'unread';

            return `
            <tr class="progress-row ${readClass}" data-item-id="${item.id}">
                <td class="client-column">
                    <div class="client-name">${clientName}</div>
                    ${contact ? `<div class="client-contact">${contact}</div>` : ''}
                </td>
                <td class="plan-column">
                    <div class="plan-name">${planName}</div>
                </td>
                <td class="services-column">
                    <div class="services-text" title="${item.selectedServices?.join(', ') || 'None'}">${services}</div>
                </td>
                <td class="schedule-column">
                    <div class="schedule-text">${schedule}</div>
                </td>
                <td class="quotation-column">
                    <div class="quotation-amount">${quotation}</div>
                </td>

                <td class="payment-column ${item.is40 ? 'payment-paid' : 'payment-unpaid'}">
                    <div class="payment-amount">${downPayment}</div>
                </td>

                <td class="payment-column ${item.is60 ? 'payment-delivered' : 'payment-unpaid'}">
                    <div class="payment-amount">${uponDelivery}</div>
                </td>
                
                <td class="remarks-column">
                    <div class="remarks-text" title="${remarks}">${remarks.length > 30 ? remarks.substring(0, 30) + '...' : remarks}</div>
                </td>
            </tr>
        `;
        }).join('');

        const tableHTML = `
        <div class="inquiries-table-container">
            <div class="table-header">
                <div class="table-stats">
                    <span class="total-count">${this.parent.inProgressItems.length} In Progress</span>
                    <span class="unread-count">${this.parent.inProgressItems.filter(item => !item.read).length} Unread</span>
                </div>
            </div>
            
            <div class="table-wrapper">
                <table class="inquiries-table progress-table">
                    <thead>
                        <tr>
                            <th class="client-header">Client</th>
                            <th class="plan-header">Plan Name</th>
                            <th class="services-header">Services</th>
                            <th class="schedule-header">Schedule</th>
                            <th class="quotation-header">Quotation</th>
                            <th class="payment-header">Downpayment (40%)</th>
                            <th class="payment-header">Upon Delivery (60%)</th>
                            <th class="remarks-header">Remarks</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        </div>
    `;

        $('#inquiryContent').html(tableHTML);
        this.setupInProgressTableEventListeners();
    }

    setupInProgressTableEventListeners() {
        // Click event for progress rows
        $('.progress-row').on('click', async (e) => {
            const itemId = $(e.currentTarget).data('item-id');
            const item = this.parent.inProgressItems.find(item => item.id === itemId);

            // If item is unread, mark it as read first
            if (item && !item.read) {
                await this.parent.inProgressManager.markAsRead(itemId);

                // Update the row visually to show it's now read
                $(e.currentTarget).removeClass('unread').addClass('read');
                $(e.currentTarget).find('.unread-indicator').remove();

                // Update the notification count
                this.parent.updateInProgressNotificationCount();
            }
        });

        // Hover effects
        $('.progress-row').on('mouseenter', function () {
            $(this).css({
                'opacity': '0.8',
                'transform': 'translateX(2px)',
                'transition': 'all 0.2s ease'
            });
        }).on('mouseleave', function () {
            $(this).css({
                'opacity': '1',
                'transform': 'translateX(0)',
                'transition': 'all 0.2s ease'
            });
        });

        $('.progress-row').css('cursor', 'pointer');
    }

    updateSelectAllState() {
        const totalRows = $('.row-checkbox').length;
        const selectedRows = $('.row-checkbox:checked').length;
        const $selectAll = $('#selectAllCheckbox');

        if (selectedRows === 0) {
            $selectAll.prop('checked', false).prop('indeterminate', false);
        } else if (selectedRows === totalRows) {
            $selectAll.prop('checked', true).prop('indeterminate', false);
        } else {
            $selectAll.prop('checked', false).prop('indeterminate', true);
        }
    }

    showArchivedInquiries() {
        if (this.parent.archivedInquiries.length === 0) {
            $('#inquiryContent').html(`
            <div class="empty-state">
                <h3>📦 No archived inquiries</h3>
                <p>Processed inquiries will appear here.</p>
            </div>
        `);
            return;
        }

        const tableRows = this.parent.archivedInquiries.map(inquiry => {
            const fromName = inquiry.accountInfo ?
                `${inquiry.accountInfo.firstName || ''} ${inquiry.accountInfo.lastName || ''}`.trim() :
                'Unknown Client';

            const subject = inquiry.requestDescription ?
                (inquiry.requestDescription.length > 50 ?
                    inquiry.requestDescription.substring(0, 50) + '...' :
                    inquiry.requestDescription) :
                'No subject';

            let archivedDate = 'Unknown date';
            if (inquiry.archivedAt) {
                try {
                    const date = inquiry.archivedAt.toDate ? inquiry.archivedAt.toDate() : new Date(inquiry.archivedAt);
                    const time = date.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                    });
                    const dateStr = date.toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric'
                    });
                    archivedDate = `${time}<br>${dateStr}`;
                } catch (error) {
                    archivedDate = 'Invalid date';
                }
            }

            const statusClass = inquiry.status?.toLowerCase().replace(' ', '-') || 'unknown';

            return `
            <tr class="inquiry-row archived ${statusClass}" data-inquiry-id="${inquiry.id}">
                <td class="checkbox-column">
                    <input type="checkbox" class="row-checkbox" value="${inquiry.id}">
                </td>
                <td class="from-column">
                    <div class="client-name">${fromName}</div>
                    ${inquiry.accountInfo?.email ? `<div class="client-email">${inquiry.accountInfo.email}</div>` : ''}
                </td>
                <td class="subject-column">
                    <div class="subject-text">${subject}</div>
                    <span class="status-indicator status-${statusClass}">${inquiry.status}</span>
                </td>
                <td class="sent-column">
                    <div class="sent-date">${archivedDate}</div>
                </td>
            </tr>
        `;
        }).join('');

        const tableHTML = `
        <div class="inquiries-table-container">
            <div class="table-header">
                <div class="table-stats">
                    <span class="total-count">${this.parent.archivedInquiries.length} Archived</span>
                    <span class="status-breakdown">
                        ${this.getStatusBreakdown()}
                    </span>
                </div>
                <div class="bulk-actions" style="display: none;">
                    <span class="selected-count">0 selected</span>
                    <button class="delete-selected-btn" id="deleteSelectedBtn">Delete Selected</button>
                </div>
            </div>
            
            <div class="table-wrapper">
                <table class="inquiries-table archive-table">
                    <thead>
                        <tr>
                            <th class="checkbox-header">
                                <input type="checkbox" id="selectAllCheckbox">
                            </th>
                            <th class="from-header">From</th>
                            <th class="subject-header">Subject & Status</th>
                            <th class="sent-header">Archived</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        </div>
    `;

        $('#inquiryContent').html(tableHTML);
        this.setupArchiveTableEventListeners();
    }

    getStatusBreakdown() {
        const breakdown = {};
        this.parent.archivedInquiries.forEach(inquiry => {
            const status = inquiry.status || 'Unknown';
            breakdown[status] = (breakdown[status] || 0) + 1;
        });

        return Object.entries(breakdown)
            .map(([status, count]) => `${status}: ${count}`)
            .join(' | ');
    }

    updateBulkActions() {
        const selectedCount = $('.row-checkbox:checked').length;
        const $bulkActions = $('.bulk-actions');
        const $selectedCount = $('.selected-count');

        if (selectedCount > 0) {
            $bulkActions.show();
            $selectedCount.text(`${selectedCount} selected`);
        } else {
            $bulkActions.hide();
        }
    }

    setupArchiveTableEventListeners() {
        // Handle row clicks (avoid checkbox column)
        $('.inquiry-row').on('click', (e) => {
            // Don't trigger row click if clicking on checkbox
            if ($(e.target).is('input[type="checkbox"]')) {
                return;
            }

            const inquiryId = $(e.currentTarget).data('inquiry-id');
            this.parent.inquiryManager.showArchivedInquiryDetails(inquiryId);
        });

        // Handle individual checkboxes
        $('.row-checkbox').on('change', () => {
            this.updateBulkActions();
            this.updateSelectAllState();
        });

        // Handle select all checkbox
        $('#selectAllCheckbox').on('change', (e) => {
            const isChecked = $(e.target).is(':checked');
            $('.row-checkbox').prop('checked', isChecked);
            this.updateBulkActions();
        });

        // Handle delete selected button
        $('#deleteSelectedBtn').on('click', () => {
            this.handleBulkDelete();
        });

        // Hover effects (avoid checkbox column)
        $('.inquiry-row').on('mouseenter', function () {
            $(this).css({
                'opacity': '0.8',
                'transform': 'translateX(2px)',
                'transition': 'all 0.2s ease'
            });
        }).on('mouseleave', function () {
            $(this).css({
                'opacity': '1',
                'transform': 'translateX(0)',
                'transition': 'all 0.2s ease'
            });
        });

        $('.inquiry-row').css('cursor', 'pointer');
    }



    showLoading() {
        $('#inquiryContent').html(`
            <div class="loading-state">
                <h3>⏳ Loading inquiries...</h3>
                <p>Please wait while we fetch the latest inquiries.</p>
            </div>
        `);
    }

    showInquiriesLoaded() {
        // Clear current inquiry when showing list
        this.parent.currentInquiryId = null;
        // Remove the updateHeaderMarkReadButton call since we removed that method

        if (this.parent.inquiries.length === 0) {
            $('#inquiryContent').html(`
                <div class="empty-state">
                    <h3>🔭 No inquiries yet</h3>
                    <p>New inquiries from clients will appear here.</p>
                </div>
            `);
        } else {
            this.displayInquiriesTable();
        }
    }

    displayInquiriesTable() {
        const tableRows = this.parent.inquiries.map(inquiry => {
            // Column 1: From (firstName + lastName)
            const fromName = inquiry.accountInfo ?
                `${inquiry.accountInfo.firstName || ''} ${inquiry.accountInfo.lastName || ''}`.trim() :
                'Unknown Client';

            // Column 2: Subject (requestDescription with truncation)
            const subject = inquiry.requestDescription ?
                (inquiry.requestDescription.length > 50 ?
                    inquiry.requestDescription.substring(0, 50) + '...' :
                    inquiry.requestDescription) :
                'No subject';

            // Column 3: Sent (dateSubmitted formatted)
            let sentDate = 'Unknown date';
            if (inquiry.dateSubmitted) {
                try {
                    let date;
                    if (typeof inquiry.dateSubmitted === 'string') {
                        date = new Date(inquiry.dateSubmitted);
                    } else if (inquiry.dateSubmitted.toDate) {
                        // Firestore Timestamp
                        date = inquiry.dateSubmitted.toDate();
                    } else {
                        date = inquiry.dateSubmitted;
                    }

                    const time = date.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                    });
                    const dateStr = date.toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric'
                    });
                    sentDate = `${time}<br>${dateStr}`;
                } catch (error) {
                    console.error('Error formatting date:', error);
                    sentDate = 'Invalid date';
                }
            }

            // Read status class
            const readClass = inquiry.read ? 'read' : 'unread';

            return `
                <tr class="inquiry-row ${readClass}" data-inquiry-id="${inquiry.id}">
                    <td class="from-column">
                        <div class="client-name">${fromName}</div>
                        ${inquiry.accountInfo?.email ? `<div class="client-email">${inquiry.accountInfo.email}</div>` : ''}
                    </td>
                    <td class="subject-column">
                        <div class="subject-text">${subject}</div>
                    </td>
                    <td class="sent-column">
                        <div class="sent-date">${sentDate}</div>
                    </td>
                </tr>
            `;
        }).join('');

        const tableHTML = `
            <div class="inquiries-table-container">
                <div class="table-header">
                    <div class="table-stats">
                        <span class="total-count">${this.parent.inquiries.length} Total</span>
                        <span class="unread-count">${this.parent.inquiries.filter(inq => !inq.read).length} Unread</span>
                    </div>
                </div>
                
                <div class="table-wrapper">
                    <table class="inquiries-table">
                        <thead>
                            <tr>
                                <th class="from-header">From</th>
                                <th class="subject-header">Subject</th>
                                <th class="sent-header">Sent</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        $('#inquiryContent').html(tableHTML);
        this.setupTableEventListeners();
    }

    setupTableEventListeners() {
        // Click event for inquiry rows - automatically marks as read and shows details
        $('.inquiry-row').on('click', async (e) => {
            const inquiryId = $(e.currentTarget).data('inquiry-id');
            const inquiry = this.parent.inquiries.find(inq => inq.id === inquiryId);

            // If inquiry is unread, mark it as read first
            if (inquiry && !inquiry.read) {
                await this.parent.inquiryManager.markAsRead(inquiryId);

                // Update the row visually to show it's now read
                $(e.currentTarget).removeClass('unread').addClass('read');
                $(e.currentTarget).find('.unread-indicator').remove();

                // Update the notification count
                this.parent.updateNotificationCount();
            }

            // Show inquiry details
            this.parent.inquiryManager.showInquiryDetails(inquiryId);
        });

        // Proper hover effects - only change opacity and transform, not background color
        $('.inquiry-row').on('mouseenter', function () {
            $(this).css({
                'opacity': '0.8',
                'transform': 'translateX(2px)',
                'transition': 'all 0.2s ease'
            });
        }).on('mouseleave', function () {
            $(this).css({
                'opacity': '1',
                'transform': 'translateX(0)',
                'transition': 'all 0.2s ease'
            });
        });

        // Add cursor pointer for better UX
        $('.inquiry-row').css('cursor', 'pointer');

        // Add padding and border to table cells for better appearance
        $('.inquiry-row td').css({
            'padding': '12px',
            'border-bottom': '1px solid #e9ecef',
            'transition': 'all 0.2s ease'
        });
    }

    showError(message) {
        $('#inquiryContent').html(`
            <div class="error-state">
                <h3>⚠ Error</h3>
                <p>${message}</p>
            </div>
        `);
    }

    showAccessDenied() {
        $('#inquiryContent').html(`
            <div class="error-state">
                <h3>🚫 Access Denied</h3>
                <p>You need admin privileges to view inquiries.</p>
                <button onclick="window.location.href='../login/adminLogin.html'" style="margin-top: 10px; padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Back to Login
                </button>
            </div>
        `);
    }
}

export default UIRenderer;