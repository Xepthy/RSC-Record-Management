class ToastManager {
    constructor() {
        this.container = document.getElementById('toast-container');
        this.toasts = new Map();
        this.toastCounter = 0;
        // NEW: Add this line for confirmation support
        this.confirmationPromises = new Map();
    }

    show(type = 'info', title = '', message = '', duration = 4000) {
        const toastId = ++this.toastCounter;
        const toast = this.createToast(toastId, type, title, message, duration);
        
        this.container.appendChild(toast);
        this.toasts.set(toastId, toast);

        setTimeout(() => toast.classList.add('show'), 100);

        if (duration > 0) {
            setTimeout(() => this.remove(toastId), duration);
        }

        return toastId;
    }

    // NEW: Add this entire method for confirmation toasts
    showConfirm(title = 'Confirm', message = 'Are you sure?', confirmText = 'Yes', cancelText = 'No', duration = 0) {
        const toastId = ++this.toastCounter;
        
        return new Promise((resolve) => {
            const toast = this.createConfirmToast(toastId, title, message, confirmText, cancelText, resolve);
            
            this.container.appendChild(toast);
            this.toasts.set(toastId, toast);
            this.confirmationPromises.set(toastId, resolve);

            setTimeout(() => toast.classList.add('show'), 100);

            if (duration > 0) {
                setTimeout(() => {
                    if (this.toasts.has(toastId)) {
                        this.resolveConfirmation(toastId, false);
                    }
                }, duration);
            }
        });
    }

    createToast(id, type, title, message, duration) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.dataset.toastId = id;

        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };

        toast.innerHTML = `
            <div class="toast-icon">${icons[type] || 'ℹ'}</div>
            <div class="toast-content">
                ${title ? `<div class="toast-title">${title}</div>` : ''}
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="toastManager.remove(${id})">&times;</button>
            ${duration > 0 ? '<div class="toast-progress"></div>' : ''}
        `;

        return toast;
    }

    // NEW: Add this entire method for creating confirmation toasts
    createConfirmToast(id, title, message, confirmText, cancelText, resolve) {
        const toast = document.createElement('div');
        toast.className = 'toast confirm';
        toast.dataset.toastId = id;

        toast.innerHTML = `
            <div class="confirm-header">
                <div class="toast-icon">⚠</div>
                <div class="toast-title">${title}</div>
            </div>
            <div class="confirm-message">${message}</div>
            <div class="confirm-buttons">
                <button class="confirm-btn secondary" onclick="toastManager.resolveConfirmation(${id}, false)">${cancelText}</button>
                <button class="confirm-btn primary" onclick="toastManager.resolveConfirmation(${id}, true)">${confirmText}</button>
            </div>
        `;

        return toast;
    }

    // NEW: Add this entire method to handle confirmation responses
    resolveConfirmation(toastId, result) {
        const resolve = this.confirmationPromises.get(toastId);
        if (resolve) {
            resolve(result);
            this.confirmationPromises.delete(toastId);
        }
        this.remove(toastId);
    }

    remove(toastId) {
        const toast = this.toasts.get(toastId);
        if (!toast) return;

        toast.classList.add('hide');
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
            this.toasts.delete(toastId);
            
            // NEW: Add this cleanup for confirmation promises
            if (this.confirmationPromises.has(toastId)) {
                const resolve = this.confirmationPromises.get(toastId);
                resolve(false); // Default to cancel/false if removed
                this.confirmationPromises.delete(toastId);
            }
        }, 400);
    }
}

// Global instance
window.toastManager = new ToastManager();

// Convenient functions
window.showToast = function(type, title, message, duration = 4000) {
    return window.toastManager.show(type, title, message, duration);
};

// NEW: Add this global function for confirmation toasts
window.showConfirmToast = function(title, message, confirmText = 'Yes', cancelText = 'No', duration = 0) {
    return window.toastManager.showConfirm(title, message, confirmText, cancelText, duration);
};