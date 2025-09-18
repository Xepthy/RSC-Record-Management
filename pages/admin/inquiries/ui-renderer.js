class UIRenderer {
    constructor(parentInstance) {
        this.parent = parentInstance;
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

        if (!this.parent.inquiries.length === 0) {
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
                        ${inquiry.read ? '' : '<span class="unread-indicator">●</span>'}
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