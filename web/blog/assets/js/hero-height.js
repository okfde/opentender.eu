$(document).ready(function () {

	$('.hero-header').css('min-height', $(window).innerHeight());
	$(window).resize(function (e) {
		$('.hero-header').css('min-height', $(window).innerHeight());
	});

});
