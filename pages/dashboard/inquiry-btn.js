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

    $('#enableRepresentative').on('change', function () {
        $('#representative').prop('disabled', !this.checked);
        $('#repClassification').prop('disabled', !this.checked);
    });

});
