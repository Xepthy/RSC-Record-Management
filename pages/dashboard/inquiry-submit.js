// formSubmission.js
import {
    db,
    auth,
    collection,
    addDoc,
    doc
} from '../../firebase-config.js';
import { sanitizeFormData, validateFormData, rateLimiter, handleError } from './inquiry-submit-utils.js';


function collectFormData() {
    // Check if representative fields are enabled
    const isRepresentativeEnabled = !$('#representative').prop('disabled');

    // Handle main classification
    let classification = $('#classification').val();
    if (classification === 'Others') {
        const customValue = $('#classificationCustom').val().trim();
        classification = customValue || 'Others'; // fallback to 'Others' if custom input is empty
    }

    // Handle rep classification
    let repClassification = 'None';
    if (isRepresentativeEnabled) {
        repClassification = $('#repClassification').val();
        if (repClassification === 'Others') {
            const customValue = $('#repClassificationCustom').val().trim();
            repClassification = customValue || 'Others'; // fallback to 'Others' if custom input is empty
        }
    }

    const formData = {
        requestDescription: $('#requestDescription').val(),
        clientName: $('#clientName').val(),
        classification: classification,
        representative: isRepresentativeEnabled ? $('#representative').val() : 'None',
        repClassification: repClassification,
        location: $('#location').val(),
        contact: $('#contact').val(),
        dateSubmitted: new Date().toISOString(),
        status: 'pending',
        lastUpdated: new Date().toISOString(),
        remarks: ''
    };

    // Collect checkbox data for services using jQuery
    const selectedServices = [];
    const serviceLabels = [
        'Relocation Survey',
        'Boundary Survey',
        'Subdivision Survey',
        'Topographic Survey',
        'Engineering Services',
        'As-Built Survey',
        'Tilting Assistance',
        'All'
    ];

    $('.checkbox-group input[type="checkbox"]').each(function (index) {
        if ($(this).is(':checked')) {
            selectedServices.push(serviceLabels[index]);
        }
    });

    formData.selectedServices = selectedServices;

    return formData;
}

// Function to submit form data to Firestore
async function submitFormData() {
    try {
        // Get current user
        const currentUser = auth.currentUser;
        if (!currentUser) {
            alert('Please log in first');
            return false;
        }

        // Check rate limiting
        const rateLimitCheck = rateLimiter.canMakeRequest(currentUser.uid);
        if (!rateLimitCheck.allowed) {
            alert(rateLimitCheck.message);
            return false;
        }

        // Collect form data
        const rawFormData = collectFormData();

        // Validate form data using security utils
        const validation = validateFormData(rawFormData);
        if (!validation.isValid) {
            alert('Please fix the following errors:\n• ' + validation.errors.join('\n• '));
            return false;
        }

        // Sanitize form data using security utils
        const formData = sanitizeFormData(rawFormData);


        // Record rate limit attempt
        rateLimiter.recordAttempt(currentUser.uid);

        // Create reference to user's pending collection
        const userDocRef = doc(db, 'client', currentUser.uid);
        const pendingCollectionRef = collection(userDocRef, 'pending');

        // Add document to pending collection (Firestore will auto-generate the random ID)
        const docRef = await addDoc(pendingCollectionRef, formData);

        // console.log('Document written with ID: ', docRef.id); FOR TESTING 
        // alert('Form submitted successfully!');

        // Reset form and close modal using jQuery
        resetForm();
        $('#modal').hide();

        // Refresh the table if you have a function for that
        if (typeof refreshTable === 'function') {
            refreshTable();
        }

        return true;

    } catch (error) {
        // Use security utils error handler
        const errorMessage = handleError(error);
        alert(errorMessage);
        return false;
    }
}

// Function to reset form with custom input handling
function resetForm() {
    // Reset the form
    $('#requestForm')[0].reset();

    // Hide custom input fields
    $('#classificationCustom').hide().val('');
    $('#repClassificationCustom').hide().val('');

    // Reset representative fields
    $('#representative').prop('disabled', true);
    $('#repClassification').prop('disabled', true);
    $('#repClassificationCustom').prop('disabled', true);

}

// jQuery document ready with async/await for form submission
$(document).ready(function () {


    $('#requestForm').on('submit', async function (e) {
        e.preventDefault(); // Prevent default form submission
        await submitFormData();
    });
});

// Export the function if you need to use it elsewhere
export { submitFormData };