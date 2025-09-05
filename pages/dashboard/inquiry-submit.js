// inquiry-submit.js
// Simplified form submission

import {
    db,
    auth,
    collection,
    addDoc,
    doc
} from '../../firebase-config.js';
import { sanitizeFormData, validateFormData, rateLimiter, handleError } from './inquiry-submit-utils.js';

function collectFormData() {
    const isRepEnabled = !$('#representative').prop('disabled');

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
        location: $('#location').val(),
        contact: $('#contact').val(),
        dateSubmitted: new Date().toISOString(),
        status: 'pending',
        lastUpdated: new Date().toISOString(),
        remarks: ''
    };

    // Collect services
    const serviceLabels = [
        'Relocation Survey', 'Boundary Survey', 'Subdivision Survey',
        'Topographic Survey', 'Engineering Services', 'As-Built Survey',
        'Tilting Assistance', 'All'
    ];

    formData.selectedServices = [];
    $('.checkbox-group input[type="checkbox"]').each(function (index) {
        if ($(this).is(':checked')) {
            formData.selectedServices.push(serviceLabels[index]);
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
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            alert('Please log in first');
            return false;
        }

        // Rate limiting
        const rateLimitCheck = rateLimiter.canMakeRequest(currentUser.uid);
        if (!rateLimitCheck.allowed) {
            alert(rateLimitCheck.message);
            return false;
        }

        // Collect and validate
        const rawFormData = collectFormData();
        const validation = validateFormData(rawFormData);

        if (!validation.isValid) {
            alert('Please fix the following errors:\n• ' + validation.errors.join('\n• '));
            return false;
        }

        // Sanitize and submit
        const formData = sanitizeFormData(rawFormData);
        rateLimiter.recordAttempt(currentUser.uid);

        const userDocRef = doc(db, 'client', currentUser.uid);
        const pendingCollectionRef = collection(userDocRef, 'pending');

        await addDoc(pendingCollectionRef, formData);

        // Success message
        const docCount = formData.documentCount;
        const message = docCount > 0
            ? `Form submitted successfully with ${docCount} document${docCount > 1 ? 's' : ''}!`
            : 'Form submitted successfully!';

        alert(message);

        // Reset and close
        resetForm();
        $('#modal').hide();

        if (typeof refreshTable === 'function') {
            refreshTable();
        }

        return true;

    } catch (error) {
        alert(handleError(error));
        return false;
    }
}

function resetForm() {
    $('#requestForm')[0].reset();
    $('#classificationCustom, #repClassificationCustom').hide().val('');
    $('#representative, #repClassification, #repClassificationCustom').prop('disabled', true);

    if (window.documentUpload) {
        window.documentUpload.clearAllFiles();
    }
}

$(document).ready(function () {
    $('#requestForm').on('submit', async function (e) {
        e.preventDefault();
        await submitFormData();
    });
});

export { submitFormData };