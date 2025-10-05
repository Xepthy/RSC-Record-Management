class UIRenderer {
    constructor(parentInstance) {
        this.parent = parentInstance;

        this.itemsPerPage = 5;
        this.inquiriesCurrentPage = 1;
        this.archiveCurrentPage = 1;
        this.inProgressCurrentPage = 1;
        this.completedCurrentPage = 1;
        this.setupGlobalSearchListeners();
        this.setupClearButtonListeners();
    }

    setupClearButtonListeners() {
        document.addEventListener('input', (e) => {
            const searchInput = e.target;
            console.log('Input detected:', searchInput.id); // DEBUG
            if (searchInput.id && searchInput.id.includes('Search')) {
                const clearBtn = searchInput.nextElementSibling;
                console.log('Clear button found:', clearBtn);
                console.log('Has search-clear-btn class?', clearBtn?.classList.contains('search-clear-btn')); // ADD THIS
                if (clearBtn && clearBtn.classList.contains('search-clear-btn')) {
                    if (searchInput.value.length > 0) {
                        clearBtn.classList.add('visible');
                    } else {
                        clearBtn.classList.remove('visible');
                    }
                }
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('search-clear-btn')) {
                const searchInput = e.target.previousElementSibling;
                if (searchInput) {
                    searchInput.value = '';
                    e.target.classList.remove('visible');

                    // Trigger search with empty value
                    if (searchInput.id === 'inquiriesSearch') {
                        this.lastInquiriesSearch = '';
                        this.inquiriesCurrentPage = 1;
                        this.displayInquiriesTable();
                    } else if (searchInput.id === 'archiveSearch') {
                        this.lastArchiveSearch = '';
                        this.archiveCurrentPage = 1;
                        this.showArchivedInquiries();
                    } else if (searchInput.id === 'inProgressSearch') {
                        this.lastInProgressSearch = '';
                        this.inProgressCurrentPage = 1;
                        this.showInProgressItems();
                    } else if (searchInput.id === 'completedSearch') {
                        this.lastCompletedSearch = '';
                        this.completedCurrentPage = 1;
                        this.showCompletedItems();
                    }
                }
            }
        });
    }

    setupGlobalSearchListeners() {
        let searchTimeout;

        document.addEventListener('input', (e) => {
            if (e.target.id === 'inquiriesSearch') {
                this.lastInquiriesSearch = e.target.value;
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {  // Change 300 to 600 or 800
                    this.inquiriesCurrentPage = 1;
                    this.displayInquiriesTable();
                }, 900);  // <-- Changed from 300 to 600
            } else if (e.target.id === 'archiveSearch') {
                this.lastArchiveSearch = e.target.value;
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.archiveCurrentPage = 1;
                    this.showArchivedInquiries();
                }, 900);  // <-- Changed from 300 to 600
            } else if (e.target.id === 'inProgressSearch') {
                this.lastInProgressSearch = e.target.value;
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.inProgressCurrentPage = 1;
                    this.showInProgressItems();
                }, 900);  // <-- Changed from 300 to 600
            }

            else if (e.target.id === 'completedSearch') {
                this.lastCompletedSearch = e.target.value;
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.completedCurrentPage = 1;
                    this.showCompletedItems();
                }, 900);
            }

        });
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

    generatePaginationControls(totalPages, tableType) {
        if (totalPages <= 1) return '';

        const currentPage = this.getCurrentPage(tableType);
        let paginationHTML = '<div class="pagination-container">';

        // Previous button
        if (currentPage > 1) {
            paginationHTML += `<button class="page-btn" data-page="${currentPage - 1}" data-table="${tableType}">Previous</button>`;
        }

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            const activeClass = i === currentPage ? 'active' : '';
            paginationHTML += `<button class="page-btn ${activeClass}" data-page="${i}" data-table="${tableType}">${i}</button>`;
        }

        // Next button
        if (currentPage < totalPages) {
            paginationHTML += `<button class="page-btn" data-page="${currentPage + 1}" data-table="${tableType}">Next</button>`;
        }

        paginationHTML += '</div>';
        return paginationHTML;
    }

    setupPaginationEventListeners() {
        $('.page-btn').on('click', (e) => {
            const page = parseInt($(e.target).data('page'));
            const tableType = $(e.target).data('table');

            this.setCurrentPage(tableType, page);
            this.refreshTable(tableType);
        });
    }

    getCurrentPage(tableType) {
        switch (tableType) {
            case 'inquiries': return this.inquiriesCurrentPage;
            case 'archive': return this.archiveCurrentPage;
            case 'inprogress': return this.inProgressCurrentPage;
            case 'completed': return this.completedCurrentPage;
        }
    }

    setCurrentPage(tableType, page) {
        switch (tableType) {
            case 'inquiries': this.inquiriesCurrentPage = page; break;
            case 'archive': this.archiveCurrentPage = page; break;
            case 'inprogress': this.inProgressCurrentPage = page; break;
            case 'completed': this.completedCurrentPage = page; break;
        }
    }

    refreshTable(tableType) {
        switch (tableType) {
            case 'inquiries': this.showInquiriesLoaded(); break;
            case 'archive': this.showArchivedInquiries(); break;
            case 'inprogress': this.showInProgressItems(); break;
            case 'completed': this.showCompletedItems(); break;
        }
    }

    getTeamColorClass(item) {
        // If schedule is done, always return green
        if (item.isScheduleDone) {
            return 'team-done';
        }

        // If no schedule set, return default
        if (!item.schedule) {
            return '';
        }

        // Parse schedule date (assuming format is dd/mm/yyyy)
        const scheduleParts = item.schedule.split('/');
        if (scheduleParts.length !== 3) return '';

        const scheduleDate = new Date(scheduleParts[2], scheduleParts[1] - 1, scheduleParts[0]);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        scheduleDate.setHours(0, 0, 0, 0);

        if (scheduleDate < today) {
            return 'team-overdue'; // Gray - deadline passed
        } else if (scheduleDate.getTime() === today.getTime()) {
            return 'team-today'; // Red - deadline today
        } else {
            return 'team-pending'; // Yellow - not deadline yet
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

        const searchQuery = this.lastInProgressSearch || $('#inProgressSearch').val() || '';
        const filteredItems = this.filterItems(this.parent.inProgressItems, searchQuery, 'inprogress');

        if (filteredItems.length === 0) {
            const emptyHTML = `
            <div class="inquiries-table-container">
                <div class="table-header">
                    <div class="search-bar">
                        <input type="text" id="inProgressSearch" placeholder="🔍 Search by client, plan name, or services..." value="${searchQuery}" />
                        <button class="search-clear-btn" id="clearInProgressSearch">×</button>
                    </div>
                </div>
                <div class="empty-state">
                    <h3>⚙️ No items ${searchQuery ? 'found' : 'in progress'}</h3>
                    <p>${searchQuery ? 'Try a different search term.' : 'Approved inquiries will appear here.'}</p>
                </div>
            </div>
            `;
            $('#inquiryContent').html(emptyHTML);

            // Restore search value after render
            if (this.lastInProgressSearch) {
                const $searchInput = $('#inProgressSearch');
                $searchInput.val(this.lastInProgressSearch);
                if (this.lastInProgressSearch.length > 0) {
                    $searchInput.next('.search-clear-btn').addClass('visible');
                }
            }
            return;
        }

        const totalItems = filteredItems.length;
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        const startIndex = (this.inProgressCurrentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const currentItems = filteredItems.slice(startIndex, endIndex);

        const tableRows = currentItems.map(item => {
            // Client Name & Contact
            const clientName = item.clientInfo?.clientName || 'Unknown Client';
            const contact = item.clientInfo?.contact || '';

            // Plan Name
            const planName = item.planName || 'Not specified';

            // Services (formatted to prevent overflow)
            const services = this.parent.inProgressManager.formatServices(item.selectedServices);

            const team = item.selectedTeam || 'Not assigned';

            // Schedule
            // Schedule - show "--" if schedule is done, otherwise show actual schedule
            const schedule = item.isScheduleDone ? '--' : (item.schedule || 'Not scheduled');

            // Quotation & Payments
            const totalAmount = item.totalAmount || 0;
            const quotation = this.parent.inProgressManager.formatCurrency(totalAmount);
            const downPayment = this.parent.inProgressManager.formatCurrency(totalAmount * 0.40);
            const uponDelivery = this.parent.inProgressManager.formatCurrency(totalAmount * 0.60);

            // Remarks
            const remarks = item.remarks || '--';

            // Read status
            const readClass = item.read ? 'read' : 'unread';

            const tooltipPlanName = planName.split(' ').reduce((acc, word, index) => {
                return acc + word + (index % 4 === 3 ? '\n' : ' '); // Break every 4 words
            }, '').trim();

            const tooltipRemarks = remarks.split(' ').reduce((acc, word, index) => {
                return acc + word + (index % 4 === 3 ? '\n' : ' '); // Break every 4 words
            }, '').trim();



            return `
            <tr class="progress-row ${readClass}" data-item-id="${item.id}">
                <td class="client-column">
                    <div class="client-name">${clientName}</div>
                    ${contact ? `<div class="client-contact">${contact}</div>` : ''}
                </td>
                <td class="plan-column">
                    <div class="plan-name" title="${tooltipPlanName}">${planName.length > 15 ? planName.substring(0, 15) + '...' : planName}</div>
                </td>
                <td class="services-column">
                    <div class="services-text" title="${item.selectedServices?.join('\n') || 'None'}">${services}</div>
                </td>
                <td class="schedule-column">
                    <div class="schedule-text">${schedule}</div>
                </td>

                <td class="team-column">
                <div class="team-text ${this.getTeamColorClass(item)}">${team}</div>
                </td>

                ${this.parent.isSuperAdmin ? `
                <td class="quotation-column">
                    <div class="quotation-amount">${quotation}</div>
                </td>

                <td class="payment-column ${item.is40 ? 'payment-paid' : 'payment-unpaid'}">
                    <div class="payment-amount">${downPayment}</div>
                </td>

                <td class="payment-column ${item.is60 ? 'payment-delivered' : 'payment-unpaid'}">
                    <div class="payment-amount">${uponDelivery}</div>
                </td>
                ` : `
                <td class="payment-status-column">
                    <div class="payment-status ${item.is60 ? 'fully-paid' : (item.is40 ? 'partially-paid' : 'unpaid')}">
                        ${item.is60 ? 'Fully Paid' : (item.is40 ? 'Partially' : 'Unpaid')}
                    </div>
                </td>
                `}

                <td class="remarks-column">
                    <div class="remarks-text" title="${tooltipRemarks}">${remarks.length > 20 ? remarks.substring(0, 20) + '...' : remarks}</div>
                </td>
            </tr>
        `;
        }).join('');

        const paginationHTML = this.generatePaginationControls(totalPages, 'inprogress');

        const tableHTML = `
        <div class="inquiries-table-container">
            <div class="table-header">
                <div class="search-bar">
                    <input type="text" id="inProgressSearch" placeholder="Search by client, plan name, or services..." />
                    <button class="search-clear-btn" id="clearInProgressSearch">×</button>
                </div>
                <div class="table-stats">
                    <span class="total-count">${this.parent.inProgressItems.length} In Progress</span>
                    <span class="unread-count">${this.parent.inProgressItems.filter(item => !item.read).length} Unread</span>
                    <span class="page-info">Page ${this.inProgressCurrentPage} of ${totalPages}</span>
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
                            <th class="team-header">Team</th>

                            ${this.parent.isSuperAdmin ? `
                            <th class="quotation-header">Quotation</th>
                            <th class="payment-header">Downpayment (40%)</th>
                            <th class="payment-header">Upon Delivery (60%)</th>
                            ` : `
                            <th class="payment-status-header">Payment Status</th>`}

                            <th class="remarks-header">Remarks</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
            ${paginationHTML}
        </div>
    `;

        $('#inquiryContent').html(tableHTML);
        this.setupInProgressTableEventListeners();

        if (this.lastInProgressSearch) {
            const $searchInput = $('#inProgressSearch');
            $searchInput.val(this.lastInProgressSearch);
            if (this.lastInProgressSearch.length > 0) {
                $searchInput.next('.search-clear-btn').addClass('visible');
            }
        }

        this.setupPaginationEventListeners();
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

            this.parent.inProgressManager.showInProgressDetails(itemId);
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

    filterItems(items, searchQuery, type) {
        if (!searchQuery.trim()) return items;

        const query = searchQuery.toLowerCase();

        return items.filter(item => {
            if (type === 'inquiries' || type === 'archive') {
                const name = item.accountInfo ?
                    `${item.accountInfo.firstName || ''} ${item.accountInfo.lastName || ''}`.toLowerCase() : '';
                const email = item.accountInfo?.email?.toLowerCase() || '';
                const subject = item.requestDescription?.toLowerCase() || '';
                const status = item.status?.toLowerCase() || '';

                return name.includes(query) ||
                    email.includes(query) ||
                    subject.includes(query) ||
                    status.includes(query);
            }

            if (type === 'inprogress') {
                const clientName = item.clientInfo?.clientName?.toLowerCase() || '';
                const planName = item.planName?.toLowerCase() || '';
                const services = item.selectedServices?.join(' ').toLowerCase() || '';
                const team = item.selectedTeam?.toLowerCase() || '';

                return clientName.includes(query) ||
                    planName.includes(query) ||
                    services.includes(query) ||
                    team.includes(query);
            }

            if (type === 'completed') {
                const referenceCode = item.referenceCode?.toLowerCase() || '';
                const clientName = item.clientInfo?.clientName?.toLowerCase() || '';
                const planName = item.planName?.toLowerCase() || '';
                const services = item.selectedServices?.join(' ').toLowerCase() || '';
                const location = item.clientInfo?.location?.toLowerCase() || '';

                // Format the date for searching (mm/dd/yyyy format)
                let formattedDate = '';
                if (item.completedDate) {
                    const parts = item.completedDate.split('-');
                    if (parts.length === 3) {
                        const [year, month, day] = parts;
                        formattedDate = `${month}/${day}/${year}`;
                    }
                }

                // Also search the raw date format
                const rawDate = item.completedDate?.toLowerCase() || '';

                return referenceCode.includes(query) ||
                    clientName.includes(query) ||
                    planName.includes(query) ||
                    services.includes(query) ||
                    location.includes(query) ||
                    formattedDate.includes(query) ||
                    rawDate.includes(query);
            }


            return false;
        });
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

        const searchQuery = this.lastArchiveSearch || $('#archiveSearch').val() || '';
        const filteredItems = this.filterItems(this.parent.archivedInquiries, searchQuery, 'archive');

        if (filteredItems.length === 0) {
            const emptyHTML = `
            <div class="inquiries-table-container">
                <div class="table-header">
                    <div class="search-bar">
                        <input type="text" id="archiveSearch" placeholder="🔍 Search by name, email, subject, or status..." value="${searchQuery}" />
                        <button class="search-clear-btn" id="clearArchiveSearch">×</button>
                    </div>
                </div>
                <div class="empty-state">
                    <h3>📦 No archived inquiries ${searchQuery ? 'found' : ''}</h3>
                    <p>${searchQuery ? 'Try a different search term.' : 'Processed inquiries will appear here.'}</p>
                </div>
            </div>
            `;
            $('#inquiryContent').html(emptyHTML);

            // Restore search value after render
            if (this.lastArchiveSearch) {
                const $searchInput = $('#archiveSearch');
                $searchInput.val(this.lastArchiveSearch);
                if (this.lastArchiveSearch.length > 0) {
                    $searchInput.next('.search-clear-btn').addClass('visible');
                }
            }
            return;
        }

        const totalItems = filteredItems.length;
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        const startIndex = (this.archiveCurrentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const currentItems = filteredItems.slice(startIndex, endIndex);

        const tableRows = currentItems.map(inquiry => {
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

        const paginationHTML = this.generatePaginationControls(totalPages, 'archive');

        const tableHTML = `
        <div class="inquiries-table-container">
            <div class="table-header">

                <div class="search-bar">
                    <input type="text" id="archiveSearch" placeholder="🔍 Search by name, email, subject, or status..." />
                    <button class="search-clear-btn" id="clearArchiveSearch">×</button>
                </div>

                <div class="table-stats">
                    <span class="total-count">${totalItems} Archived</span>
                    <span class="page-info">Page ${this.archiveCurrentPage} of ${totalPages}</span>
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
            ${paginationHTML}
        </div>
    `;

        $('#inquiryContent').html(tableHTML);
        this.setupArchiveTableEventListeners();

        if (this.lastArchiveSearch) {
            const $searchInput = $('#archiveSearch');
            $searchInput.val(this.lastArchiveSearch);
            if (this.lastArchiveSearch.length > 0) {
                $searchInput.next('.search-clear-btn').addClass('visible');
            }
        }

        this.setupPaginationEventListeners();
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
        const searchQuery = this.lastInquiriesSearch || $('#inquiriesSearch').val() || '';
        const filteredItems = this.filterItems(this.parent.inquiries, searchQuery, 'inquiries');

        if (this.parent.inquiries.length > 0 && filteredItems.length === 0) {
            const emptyHTML = `
            <div class="inquiries-table-container">
                <div class="table-header">
                    <div class="search-bar">
                        <input type="text" id="inquiriesSearch" placeholder="🔍 Search by name, email, or subject..." value="${searchQuery}" />
                        <button class="search-clear-btn" id="clearInquiriesSearch">×</button>
                    </div>
                </div>
                <div class="empty-state">
                    <h3>📭 No inquiries found</h3>
                    <p>Try a different search term.</p>
                </div>
            </div>
        `;
            $('#inquiryContent').html(emptyHTML);

            if (this.lastInquiriesSearch) {
                const $searchInput = $('#inquiriesSearch');
                $searchInput.val(this.lastInquiriesSearch);
                if (this.lastInquiriesSearch.length > 0) {
                    $searchInput.next('.search-clear-btn').addClass('visible');
                }
            }
            return;


        }

        const totalItems = filteredItems.length;
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        const startIndex = (this.inquiriesCurrentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const currentItems = filteredItems.slice(startIndex, endIndex);

        const tableRows = currentItems.map(inquiry => {
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

        const paginationHTML = this.generatePaginationControls(totalPages, 'inquiries');

        const tableHTML = `
            <div class="inquiries-table-container">
                <div class="table-header">
                    <div class="search-bar">
                        <input type="text" id="inquiriesSearch" placeholder="🔍 Search by name, email, or subject..." value="${searchQuery}" />
                        <button class="search-clear-btn" id="clearInquiriesSearch">×</button>
                    </div>
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
                ${paginationHTML}
            </div>
        `;

        $('#inquiryContent').html(tableHTML);
        this.setupTableEventListeners();

        if (this.lastInquiriesSearch) {
            const $searchInput = $('#inquiriesSearch');
            $searchInput.val(this.lastInquiriesSearch);
            if (this.lastInquiriesSearch.length > 0) {
                $searchInput.next('.search-clear-btn').addClass('visible');
            }
        }

        this.setupPaginationEventListeners();
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

    showCompletedItems() {
        if (this.parent.completedItems.length === 0) {
            $('#inquiryContent').html(`
            <div class="empty-state">
                <h3>✅ No completed projects</h3>
                <p>Completed projects will appear here.</p>
            </div>
        `);
            return;
        }

        const searchQuery = this.lastCompletedSearch || $('#completedSearch').val() || '';
        const filteredItems = this.filterItems(this.parent.completedItems, searchQuery, 'completed');

        if (filteredItems.length === 0) {
            const emptyHTML = `
            <div class="inquiries-table-container">
                <div class="table-header">
                    <div class="search-bar">
                        <input type="text" id="completedSearch" placeholder="🔍 Search by reference code, client, or plan name..." value="${searchQuery}" />
                        <button class="search-clear-btn" id="clearCompletedSearch">×</button>
                    </div>
                </div>
                <div class="empty-state">
                    <h3>✅ No completed projects found</h3>
                    <p>Try a different search term.</p>
                </div>
            </div>
        `;
            $('#inquiryContent').html(emptyHTML);

            if (this.lastCompletedSearch) {
                const $searchInput = $('#completedSearch');
                $searchInput.val(this.lastCompletedSearch);
                if (this.lastCompletedSearch.length > 0) {
                    $searchInput.next('.search-clear-btn').addClass('visible');
                }
            }
            return;
        }

        const totalItems = filteredItems.length;
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        const startIndex = (this.completedCurrentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const currentItems = filteredItems.slice(startIndex, endIndex);

        const tableRows = currentItems.map(item => {
            const referenceCode = item.referenceCode || 'N/A';
            const clientName = item.clientInfo?.clientName || 'Unknown Client';
            const contact = item.clientInfo?.contact || '';
            const planName = item.planName || 'Not specified';
            const services = this.parent.completedManager.formatServices(item.selectedServices);
            const completedDate = this.parent.completedManager.formatDateDisplay(item.completedDate);
            const location = item.clientInfo?.location || 'Not provided';
            const readClass = item.read ? 'read' : 'unread';

            return `
            <tr class="completed-row ${readClass}" data-item-id="${item.id}">
                <td class="checkbox-column">
                    <input type="checkbox" class="completed-row-checkbox" value="${item.id}">
                </td>
                <td class="reference-column">
                    <div class="reference-code">${referenceCode}</div>
                </td>
                <td class="client-column">
                    <div class="client-name">${clientName}</div>
                    ${contact ? `<div class="client-contact">${contact}</div>` : ''}
                </td>
                <td class="plan-column">
                    <div class="plan-name">${planName}</div>
                </td>
                <td class="services-column">
                    <div class="services-text" title="${item.selectedServices?.join('\n') || 'None'}">${services}</div>
                </td>
                <td class="date-column">
                    <div class="date-text">${completedDate}</div>
                </td>
                <td class="location-column">
                    <div class="location-text">${location}</div>
                </td>
            </tr>
        `;
        }).join('');

        const paginationHTML = this.generatePaginationControls(totalPages, 'completed');

        const tableHTML = `
        <div class="inquiries-table-container">
            <div class="table-header">
                <div class="search-bar">
                    <input type="text" id="completedSearch" placeholder="🔍 Search by reference code, client, or plan name..." />
                    <button class="search-clear-btn" id="clearCompletedSearch">×</button>
                </div>
                <div class="table-stats">
                    <span class="total-count">${this.parent.completedItems.length} Completed</span>
                    <span class="unread-count">${this.parent.completedItems.filter(item => !item.read).length} Unread</span>
                    <span class="page-info">Page ${this.completedCurrentPage} of ${totalPages}</span>
                </div>
                <div class="bulk-actions" style="display: none;">
                    <span class="selected-count">0 selected</span>
                    <button class="mark-read-btn" id="markCompletedReadBtn">Mark as Read</button>
                </div>
            </div>
            
            <div class="table-wrapper">
                <table class="inquiries-table completed-table">
                    <thead>
                        <tr>
                            <th class="checkbox-header">
                                <input type="checkbox" id="selectAllCompletedCheckbox">
                            </th>
                            <th class="reference-header">Reference Code</th>
                            <th class="client-header">Client</th>
                            <th class="plan-header">Plan Name</th>
                            <th class="services-header">Services</th>
                            <th class="date-header">Completed Date</th>
                            <th class="location-header">Location</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
            ${paginationHTML}
        </div>
    `;

        $('#inquiryContent').html(tableHTML);
        this.setupCompletedTableEventListeners();

        if (this.lastCompletedSearch) {
            const $searchInput = $('#completedSearch');
            $searchInput.val(this.lastCompletedSearch);
            if (this.lastCompletedSearch.length > 0) {
                $searchInput.next('.search-clear-btn').addClass('visible');
            }
        }

        this.setupPaginationEventListeners();
    }

    updateCompletedBulkActions() {
        const selectedCount = $('.completed-row-checkbox:checked').length;
        const $bulkActions = $('.bulk-actions');
        const $selectedCount = $('.selected-count');

        if (selectedCount > 0) {
            $bulkActions.show();
            $selectedCount.text(`${selectedCount} selected`);
        } else {
            $bulkActions.hide();
        }
    }

    updateCompletedSelectAllState() {
        const totalRows = $('.completed-row-checkbox').length;
        const selectedRows = $('.completed-row-checkbox:checked').length;
        const $selectAll = $('#selectAllCompletedCheckbox');

        if (selectedRows === 0) {
            $selectAll.prop('checked', false).prop('indeterminate', false);
        } else if (selectedRows === totalRows) {
            $selectAll.prop('checked', true).prop('indeterminate', false);
        } else {
            $selectAll.prop('checked', false).prop('indeterminate', true);
        }
    }

    async handleCompletedMarkAsRead() {
        const selectedIds = $('.completed-row-checkbox:checked').map(function () {
            return $(this).val();
        }).get();

        if (selectedIds.length === 0) return;

        try {
            for (const id of selectedIds) {
                await this.parent.completedManager.markAsRead(id);
            }

            this.parent.inquiryManager.showToast(`${selectedIds.length} item(s) marked as read`, 'success');

            // Refresh the table
            this.showCompletedItems();
        } catch (error) {
            console.error('Error marking as read:', error);
            this.parent.inquiryManager.showToast('Failed to mark items as read', 'error');
        }
    }



    setupCompletedTableEventListeners() {
        // Handle row clicks (avoid checkbox column)
        $('.completed-row').on('click', async (e) => {
            if ($(e.target).is('input[type="checkbox"]')) {
                return;
            }
            const itemId = $(e.currentTarget).data('item-id');
            const item = this.parent.completedItems.find(item => item.id === itemId);

            if (item && !item.read) {
                await this.parent.completedManager.markAsRead(itemId);
                $(e.currentTarget).removeClass('unread').addClass('read');
                this.parent.updateCompletedNotificationCount();
            }

            this.parent.completedManager.showCompletedDetails(itemId);
        });

        // Handle individual checkboxes
        $('.completed-row-checkbox').on('change', () => {
            this.updateCompletedBulkActions();
            this.updateCompletedSelectAllState();
        });

        // Handle select all checkbox
        $('#selectAllCompletedCheckbox').on('change', (e) => {
            const isChecked = $(e.target).is(':checked');
            $('.completed-row-checkbox').prop('checked', isChecked);
            this.updateCompletedBulkActions();
        });

        // Handle mark as read button
        $('#markCompletedReadBtn').on('click', () => {
            this.handleCompletedMarkAsRead();
        });

        // Hover effects (KEEP THIS)
        $('.completed-row').on('mouseenter', function () {
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

        $('.completed-row').css('cursor', 'pointer');
    }



}

export default UIRenderer;