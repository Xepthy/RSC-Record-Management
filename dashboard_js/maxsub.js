// maxsub.js - Rolling 24h submission limit handler
import {
    db,
    doc,
    getDoc,
    updateDoc
} from '../firebase-config_js/firebase-config.js';

class MaxSubmissionHandler {
    constructor() {
        this.maxSubmissionsPerDay = 3;
        this.resetInterval = null; // watcher reference
    }

    async getUserSubmissionData(userId) {
        try {
            // Use existing client collection instead of submission_limits
            const userDoc = doc(db, 'client', userId);
            const docSnap = await getDoc(userDoc);

            if (docSnap.exists()) {
                const data = docSnap.data();
                return {
                    userId: userId,
                    submissionCount: data.dailySubmissionCount || 0,
                    lastSubmissionTime: data.lastSubmissionTime || null,
                    createdAt: data.createdAt || new Date().toISOString()
                };
            } else {
                // If client doc doesn't exist, return default values
                return {
                    userId: userId,
                    submissionCount: 0,
                    lastSubmissionTime: null,
                    createdAt: new Date().toISOString()
                };
            }
        } catch (error) {
            console.error('Error getting user submission data:', error);
            throw new Error('Failed to check submission limits');
        }
    }

    async canUserSubmit(userId) {
        try {
            if (!userId) {
                return {
                    canSubmit: false,
                    reason: 'User not authenticated',
                    remainingSubmissions: 0,
                    resetTime: null
                };
            }

            const submissionData = await this.getUserSubmissionData(userId);

            // If no last submission, allow full quota
            if (!submissionData.lastSubmissionTime) {
                return {
                    canSubmit: true,
                    reason: 'No prior submissions',
                    remainingSubmissions: this.maxSubmissionsPerDay,
                    resetTime: null
                };
            }

            const lastTime = new Date(submissionData.lastSubmissionTime).getTime();
            const now = Date.now();

            // If 24h passed, reset counter
            if (now - lastTime >= 24 * 60 * 60 * 1000) {
                await this.resetCounter(userId);
                return {
                    canSubmit: true,
                    reason: '24h window passed - counter reset',
                    remainingSubmissions: this.maxSubmissionsPerDay,
                    resetTime: null
                };
            }

            const remainingSubmissions = this.maxSubmissionsPerDay - (submissionData.submissionCount || 0);

            if (remainingSubmissions <= 0) {
                const resetTime = lastTime + 24 * 60 * 60 * 1000;

                // 🚀 Start watching until reset
                this.startResetWatcher(resetTime);

                return {
                    canSubmit: false,
                    reason: `Limit of ${this.maxSubmissionsPerDay} submissions reached`,
                    remainingSubmissions: 0,
                    resetTime: resetTime,
                    nextResetIn: this.getTimeUntilReset(lastTime)
                };
            }

            return {
                canSubmit: true,
                reason: 'Within rolling 24h limit',
                remainingSubmissions: remainingSubmissions,
                resetTime: lastTime + 24 * 60 * 60 * 1000
            };

        } catch (error) {
            console.error('Error checking submission limit:', error);
            return {
                canSubmit: true,
                reason: 'Error checking limits - allowing submission',
                remainingSubmissions: 'unknown',
                resetTime: null
            };
        }
    }

    async recordSubmission(userId) {
        try {
            const submissionData = await this.getUserSubmissionData(userId);
            const now = new Date().toISOString();
            let newCount;

            if (!submissionData.lastSubmissionTime) {
                newCount = 1;
            } else if (Date.now() - new Date(submissionData.lastSubmissionTime).getTime() >= 24 * 60 * 60 * 1000) {
                newCount = 1;
            } else {
                newCount = (submissionData.submissionCount || 0) + 1;
            }

            const updateData = {
                dailySubmissionCount: newCount, 
                lastSubmissionTime: now,
                lastUpdated: now
            };

            // Update the existing client document
            const userDoc = doc(db, 'client', userId);
            await updateDoc(userDoc, updateData);

            const remainingSubmissions = this.maxSubmissionsPerDay - newCount;

            return {
                success: true,
                newCount: newCount,
                remainingSubmissions: Math.max(0, remainingSubmissions),
                resetTime: new Date(updateData.lastSubmissionTime).getTime() + 24 * 60 * 60 * 1000
            };

        } catch (error) {
            console.error('Error recording submission:', error);
            throw new Error('Failed to record submission');
        }
    }

    async resetCounter(userId) {
        try {
            const userDoc = doc(db, 'client', userId);
            const resetData = {
                dailySubmissionCount: 0, // Reset the existing field
                lastSubmissionTime: null,
                lastUpdated: new Date().toISOString()
            };
            await updateDoc(userDoc, resetData);
        } catch (error) {
            console.error('Error resetting counter:', error);
        }
    }

    // ✅ Time until rolling reset
    getTimeUntilReset(lastTime) {
        const resetTime = lastTime + 24 * 60 * 60 * 1000;
        const diffMs = resetTime - Date.now();

        if (diffMs <= 0) return 'Ready now';

        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);

        return `${diffHours}h ${diffMinutes}m ${diffSeconds}s`;
    }

    async getSubmissionStatus(userId) {
        const status = await this.canUserSubmit(userId);
        return {
            ...status,
            maxDaily: this.maxSubmissionsPerDay,
            usedToday: this.maxSubmissionsPerDay - (status.remainingSubmissions || 0)
        };
    }

    // 🚀 New watcher for auto UI reset
    startResetWatcher(resetTime) {
        if (this.resetInterval) clearInterval(this.resetInterval);

        this.resetInterval = setInterval(() => {
            const now = Date.now();
            const diff = resetTime - now;

            if (diff <= 0) {
                clearInterval(this.resetInterval);
                this.resetInterval = null;

                // Update UI immediately
                const el = document.getElementById("submission-count");
                if (el) el.textContent = `0/${this.maxSubmissionsPerDay}`;

                // Remove limit toast if still visible
                const toast = document.querySelector(".toast.limit-reached");
                if (toast) toast.remove();
            }
        }, 1000);
    }
}

const maxSubmissionHandler = new MaxSubmissionHandler();
export { maxSubmissionHandler, MaxSubmissionHandler };
window.maxSubmissionHandler = maxSubmissionHandler;