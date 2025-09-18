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