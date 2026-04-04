$(document).ready(function() {
	const authForms = $('#signupForm, #loginForm');

	$('.message a').on('click', function(event) {
		event.preventDefault();
		authForms.animate({
			height: "toggle",
			opacity: "toggle"
		}, "fast");
	});
});
