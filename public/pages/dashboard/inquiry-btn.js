$(document).ready(function () {
    // Open modal
    $("#openModalBtn").on("click", function () {
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