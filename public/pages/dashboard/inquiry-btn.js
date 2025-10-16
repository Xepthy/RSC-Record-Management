$(document).ready(function () {
    // Open modal
    $("#openModalBtn").on("click", function () {
        $('#useSameInfo').prop('checked', false);
        $('#modal').css('display', 'flex').hide().fadeIn();
    });

    // Close modal
    $(".close-btn").on("click", function () {
        $("#modal").fadeOut();
    });

    // Close if clicking outside the modal content
    $(window).on("click", function (e) {
        if ($(e.target).is("#modal")) {
            $("#modal").fadeOut();
        }
    });

    // Handle representative checkbox
    // Handle representative checkbox
    $('#enableRepresentative').on('change', function () {
        const isEnabled = this.checked;
        $('#representative').prop('disabled', !isEnabled);
        $('#repClassification').prop('disabled', !isEnabled);
        $('#repClassificationCustom').prop('disabled', !isEnabled);

        // Reset rep classification when disabled
        if (!isEnabled) {
            $('#representative').val('');
            $('#repClassification').val('noValue'); // Reset to default
            $('#repClassificationCustom').hide().val('');
        }
    });

    // Make sure rep classification is disabled on page load
    $('#repClassification').prop('disabled', true);
    $('#repClassificationCustom').prop('disabled', true);

    // Handle contractor checkbox
    $('#enableContractor').on('change', function () {
        const isEnabled = this.checked;
        $('#contractorName, #companyName').prop('disabled', !isEnabled);

        if (!isEnabled) {
            $('#contractorName, #companyName').val('');
            $('#contractorName').attr('placeholder', 'For contractors only');
        } else {
            $('#contractorName').attr('placeholder', 'Enter contractor name');
        }
    });

    // Handle "Same Info" checkbox
    $(document).on('change', '#useSameInfo', function () {
        const isChecked = this.checked;

        if (isChecked) {


            // Get account data from global scope (set in dashboard-table.js)
            if (window.userAccountData) {
                const account = window.userAccountData;

                // Fill in Client Name (combine first, middle, last names)
                const fullName = [
                    account.firstName || '',
                    account.middleName || '',
                    account.lastName || ''
                ].filter(n => n.trim()).join(' ').trim();

                // IMPORTANT: Set values FIRST, then disable
                $('#clientName').val(fullName);

                // Fill in Classification
                if (account.classification) {
                    $('#classification').val(account.classification);
                    // Trigger change event to handle "Others" case
                    $('#classification').trigger('change');
                }

                // Fill in Contact Number
                if (account.mobileNumber) {
                    $('#contact').val(account.mobileNumber);
                }

                // Disable these fields AFTER setting values
                // Use setTimeout to ensure values are rendered first
                setTimeout(() => {
                    $('#clientName, #classification, #contact').prop('disabled', true);
                }, 10);

            } else {
                alert('Unable to load your account information. Please fill manually.');
                $(this).prop('checked', false);
            }
        } else {
            // Re-enable fields FIRST, then clear
            $('#clientName, #classification, #contact').prop('disabled', false);

            // Clear fields
            $('#clientName').val('');
            $('#classification').val('');
            $('#classificationCustom').hide().val('');
            $('#contact').val('');
        }
    });

    // Handle main classification dropdown
    $('#classification').on('change', function () {
        const selectedValue = $(this).val();
        const customInput = $('#classificationCustom');

        if (selectedValue === 'Others') {
            customInput.show().focus();
        } else {
            customInput.hide().val('');
        }
    });

    // Handle rep classification dropdown
    $('#repClassification').on('change', function () {
        const selectedValue = $(this).val();
        const customInput = $('#repClassificationCustom');

        if (selectedValue === 'Others') {
            customInput.show().focus();
        } else {
            customInput.hide().val('');
        }
    });
});