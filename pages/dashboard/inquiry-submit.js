import {
    db,
    auth,
    collection,
    addDoc,
    doc,
    ref,
    uploadBytes,
    getDownloadURL,
    storage,
    getDoc,
    serverTimestamp  // Add this import
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

        // Use server timestamp for proper Firestore ordering
        dateSubmitted: serverTimestamp(),
        lastUpdated: serverTimestamp(),

        // Add missing fields that admin expects
        read: false,  // Initialize as unread
        status: 'pending',
        remarks: '',
        projectFiles: null
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

async function getAccountInformation(uid) {
    try {
        const userDocRef = doc(db, 'client', uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();
            return {
                uid: userData.uid || uid,
                firstName: userData.firstName || '',
                lastName: userData.lastName || '',
                middleName: userData.middleName || '',
                suffix: userData.suffix || '',
                email: userData.email || '',
                mobileNumber: userData.mobileNumber || '',
                classification: userData.classification || '',
                createdAt: userData.createdAt || null,
                lastLoginAt: userData.lastLoginAt || null
            };
        } else {
            console.warn('User document not found');
            return {
                uid: uid,
                firstName: '',
                lastName: '',
                middleName: '',
                suffix: '',
                email: '',
                mobileNumber: '',
                classification: '',
                emailVerified: false,
                profileComplete: false,
                createdAt: null,
                lastLoginAt: null
            };
        }
    } catch (error) {
        console.error('Error fetching account information:', error);
        throw error;
    }
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

        // Get account information
        const accountInfo = await getAccountInformation(currentUser.uid);

        const uploadedFiles = window.documentUpload ? window.documentUpload.getUploadedFiles() : [];
        const storageRefs = [];

        for (const file of uploadedFiles) {
            if (!file.rawFile) {
                console.warn("Missing raw File object for upload:", file.name);
                continue;
            }
            const fileRef = ref(storage, `documents/${currentUser.uid}/${Date.now()}_${file.name}`);
            await uploadBytes(fileRef, file.rawFile);
            const url = await getDownloadURL(fileRef);

            storageRefs.push({
                name: file.name,
                size: file.size,
                uploadDate: file.uploadDate,
                url
            });
        }

        formData.documents = storageRefs;
        formData.documentCount = storageRefs.length;

        // Submit to client/{uid}/pending collection
        const userDocRef = doc(db, 'client', currentUser.uid);
        const pendingCollectionRef = collection(userDocRef, 'pending');
        const pendingDocRef = await addDoc(pendingCollectionRef, formData);

        // Prepare data for inquiries collection (includes account information)
        const inquiryData = {
            ...formData,
            accountInfo: accountInfo,
            clientUid: currentUser.uid,
            pendingDocId: pendingDocRef.id, // Reference to the pending document

            // Ensure these fields are present for admin compatibility
            read: false,
            dateSubmitted: serverTimestamp(),
            lastUpdated: serverTimestamp()
        };

        // Submit to root inquiries collection
        const inquiriesCollectionRef = collection(db, 'inquiries');
        await addDoc(inquiriesCollectionRef, inquiryData);

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
        console.error('Form submission error:', error);
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