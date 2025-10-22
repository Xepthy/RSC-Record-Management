import {
    db,
    auth,
    collection,
    setDoc,
    getDoc,
    doc,
    ref,
    uploadBytes,
    getDownloadURL,
    storage
} from '../../firebase-config.js';

import { sanitizeFormData, validateFormData, rateLimiter, handleError } from '../dashboard/inquiry-submit-utils.js';
import { maxSubmissionHandler } from '../dashboard/maxsub.js';

function collectFormData() {
    const isRepEnabled = !$('#representative').prop('disabled');
    const isContractorEnabled = !$('#contractorName').prop('disabled');

    // Handle classifications
    let classification = $('#classification').val();
    if (classification === 'Others') {
        classification = $('#classificationCustom').val().trim() || 'Others';
    }

    let repClassification = 'None';
    if (isRepEnabled) {
        repClassification = $('#repClassification').val();
        if (repClassification === 'Others') {
            repClassification = $('#repClassificationCustom').val().trim() || 'Others';
        }
    }

    const formData = {
        requestDescription: $('#requestDescription').val(),
        clientName: $('#clientName').val(),
        classification,
        representative: isRepEnabled ? $('#representative').val() : 'None',
        repClassification,
        contractorName: isContractorEnabled ? $('#contractorName').val() : 'None',
        companyName: isContractorEnabled ? $('#companyName').val() : 'None',
        location: $('#location').val(),
        contact: $('#contact').val(),
        dateSubmitted: new Date().toISOString(),
        status: 'pending',
        lastUpdated: new Date().toISOString(),
        remarks: ''
    };

    // Collect services
    formData.selectedServices = [];
    $('.checkbox-grid input[type="checkbox"]').each(function () {
        if ($(this).is(':checked')) {
            formData.selectedServices.push($(this).val());
        }
    });

    // Collect documents (minimal data only)
    if (window.documentUpload) {
        const uploadedFiles = window.documentUpload.getUploadedFiles();
        formData.documents = uploadedFiles.map(file => ({
            name: file.name,
            size: file.size,
            uploadDate: file.uploadDate
        }));
        formData.documentCount = uploadedFiles.length;
    } else {
        formData.documents = [];
        formData.documentCount = 0;
    }

    return formData;
}

async function submitFormData() {
    let loadingToastId;
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            if (window.showToast) {
                showToast('error', 'Authentication Required', 'Please log in first');
            } else {
                alert('Please log in first');
            }
            return false;
        }

        // ✅ Daily limit check
        const submissionStatus = await maxSubmissionHandler.canUserSubmit(currentUser.uid);
        if (!submissionStatus.canSubmit) {
            let message = `${submissionStatus.reason}`;
            if (submissionStatus.nextResetIn) {
                message += `\n\n⏰ Resets in: ${submissionStatus.nextResetIn}`;
            }
            message += `\n\n📊 Daily limit: ${maxSubmissionHandler.maxSubmissionsPerDay} per day`;
            if (window.showToast) {
                showToast('error', 'Submission Limit Reached', message, 8000);
            } else {
                alert(message);
            }
            return false;
        }

        // ✅ Warn if last submission
        if (submissionStatus.remainingSubmissions <= 1) {
            const warningMessage = `You have ${submissionStatus.remainingSubmissions} submission remaining today.\n\nDo you want to continue?`;
            let userConfirmed = window.showConfirmToast
                ? await showConfirmToast('Last Submission Warning', warningMessage, 'Continue', 'Cancel')
                : confirm(warningMessage);
            if (!userConfirmed) return false;
        }

        // ✅ Per-minute rate limit
        const rateLimitCheck = rateLimiter.canMakeRequest(currentUser.uid);
        if (!rateLimitCheck.allowed) {
            if (window.showToast) {
                showToast('warning', 'Rate Limit Exceeded', rateLimitCheck.message);
            } else {
                alert(rateLimitCheck.message);
            }
            return false;
        }

        // ✅ Collect + validate
        const rawFormData = collectFormData();
        const validation = validateFormData(rawFormData);
        if (!validation.isValid) {
            const errorMessage = validation.errors.join('\n• ');
            if (window.showToast) {
                showToast('error', 'Validation Errors', `Please fix:\n• ${errorMessage}`, 8000);
            } else {
                alert(`Please fix:\n• ${errorMessage}`);
            }
            return false;
        }

        // ✅ Final confirmation modal (custom terms)
        const userConfirmed = await showTermsModal();
        if (!userConfirmed) return false;

        // ✅ Show loading toast
        if (window.showToast) {
            loadingToastId = showToast('info', 'Submitting...', 'Please wait...', 0);
        }

        // ✅ Sanitize and record attempt
        const formData = sanitizeFormData(rawFormData);
        rateLimiter.recordAttempt(currentUser.uid);

        // ✅ Handle file uploads
        const uploadedFiles = window.documentUpload ? window.documentUpload.getUploadedFiles() : [];
        const storageRefs = [];
        if (uploadedFiles.length > 0 && window.toastManager && loadingToastId) {
            toastManager.remove(loadingToastId);
            loadingToastId = showToast('info', 'Uploading Files...', `Uploading ${uploadedFiles.length} file(s)...`, 0);
        }
        for (const file of uploadedFiles) {
            if (!file.rawFile) continue;
            const fileRef = ref(storage, `documents/${currentUser.uid}/${Date.now()}_${file.name}`);
            await uploadBytes(fileRef, file.rawFile);
            const url = await getDownloadURL(fileRef);
            storageRefs.push({ name: file.name, size: file.size, uploadDate: file.uploadDate, url });
        }
        formData.documents = storageRefs;
        formData.documentCount = storageRefs.length;

        // ✅ Dual-write to Firestore
        const userDocRef = doc(db, 'client', currentUser.uid);
        const pendingCollectionRef = collection(userDocRef, 'pending');
        const userDoc = await getDoc(userDocRef);
        const userData = userDoc.exists() ? userDoc.data() : {};

        const pendingDocRef = doc(pendingCollectionRef);
        const inquiryId = pendingDocRef.id;

        formData.pendingDocId = inquiryId;
        formData.accountInfo = {
            uid: currentUser.uid,
            email: userData.email || currentUser.email || "",
            firstName: userData.firstName || "",
            middleName: userData.middleName || "",
            lastName: userData.lastName || "",
            suffix: userData.suffix || "",
            mobileNumber: userData.mobileNumber || "",
            classification: userData.classification || ""
        };
        formData.dateSubmitted = new Date().toISOString();
        formData.lastUpdated = new Date().toISOString();
        formData.read = false;

        // write to client/{uid}/pending
        await setDoc(pendingDocRef, formData);

        // write to main inquiries collection
        const mainInquiryRef = doc(db, 'inquiries', inquiryId);
        await setDoc(mainInquiryRef, {
            ...formData,
            id: inquiryId
        });

        // ✅ Record in submission limits
        const recordResult = await maxSubmissionHandler.recordSubmission(currentUser.uid);

        // ✅ Remove loading toast
        if (window.toastManager && loadingToastId) {
            toastManager.remove(loadingToastId);
        }

        // ✅ Refresh submission counter
        await displaySubmissionStatus();

        // ✅ Success toast
        let message = formData.documentCount > 0
            ? `Form submitted successfully with ${formData.documentCount} document(s)!`
            : 'Form submitted successfully!';
        let submissionInfo = `You have ${recordResult.remainingSubmissions} submission(s) remaining today.`;
        if (window.showToast) {
            showToast('success', 'Submission Complete!', `${message}\n\n${submissionInfo}`, 6000);
        } else {
            alert(`✅ ${message}\n\n📊 ${submissionInfo}`);
        }

        // ✅ Reset and close
        resetForm();
        $('#modal').hide();
        if (typeof refreshTable === 'function') refreshTable();

        return true;

    } catch (error) {
        if (window.toastManager && loadingToastId) {
            toastManager.remove(loadingToastId);
        }
        console.error('Submission error:', error);
        const errorMessage = handleError(error);
        if (window.showToast) {
            showToast('error', 'Submission Failed', errorMessage, 6000);
        } else {
            alert(errorMessage);
        }
        return false;
    }
}

function showTermsModal() {
  return new Promise(resolve => {
    const modal = document.getElementById('termsModal');
    const agreeBtn = document.getElementById('agreeButton');
    const cancelBtn = document.getElementById('cancelButton');

    modal.classList.remove('hidden');

    const closeModal = (result) => {
      modal.classList.add('hidden');
      agreeBtn.removeEventListener('click', onAgree);
      cancelBtn.removeEventListener('click', onCancel);
      resolve(result);
    };

    const onAgree = () => closeModal(true);
    const onCancel = () => closeModal(false);

    agreeBtn.addEventListener('click', onAgree);
    cancelBtn.addEventListener('click', onCancel);
  });
}

// NEW: Function to display current submission status
async function displaySubmissionStatus() {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const status = await maxSubmissionHandler.getSubmissionStatus(currentUser.uid);

        // Update UI element if it exists
        const statusElement = $('#submissionStatus');
        if (statusElement.length) {
            // REPLACE THIS ENTIRE BLOCK ↓
            const statusHTML = `
                    <div class="submission-status-badge">
                        <span class="status-dot ${status.canSubmit ? 'can-submit' : 'limit-reached'}"></span>
                        ${status.usedToday}/${status.maxDaily} submissions used 
                        (${status.remainingSubmissions} remaining)
                    </div>
                `;
            statusElement.html(statusHTML);
        }

        // Disable submit button if limit reached
        const submitButton = $('#submitFormBtn, input[type="submit"]');
        if (!status.canSubmit) {
            submitButton.prop('disabled', true)
                .attr('title', `Daily limit reached. Resets in ${status.nextResetIn || 'a few hours'}`);
        } else {
            submitButton.prop('disabled', false)
                .removeAttr('title');
        }

    } catch (error) {
        console.error('Error displaying submission status:', error);
    }
}

function resetForm() {
    $('#requestForm')[0].reset();
    $('#classificationCustom, #repClassificationCustom').hide().val('');
    $('#representative, #repClassification, #repClassificationCustom').prop('disabled', true);
    $('#contractorName, #companyName').prop('disabled', true);
    $('#contractorName').attr('placeholder', 'For contractors only');

    // afely clear uploaded files after form reset
    if (window.documentUpload) {
        window.documentUpload.uploadedFiles = [];
        window.documentUpload.updateDisplay();
    }

    // Update submission status after successful submission
    if (window.displaySubmissionStatus) {
        displaySubmissionStatus();
    }
}

$(document).ready(function () {

    // Form submission handler
    $('#requestForm').on('submit', async function (e) {
        e.preventDefault();
        await submitFormData();
    });

    // Authentication state change listener
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log('User authenticated, displaying submission status');
            await displaySubmissionStatus(); // This will update the status when user logs in
        } else {
            console.log('User not authenticated');
            // Optional: Hide status element when user is not logged in
            const statusElement = $('#submissionStatus');
            if (statusElement.length) {
                statusElement.html('');
            }
        }
    });
});

export { submitFormData, displaySubmissionStatus };