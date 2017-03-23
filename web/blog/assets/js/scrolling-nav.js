$(document).ready(function () {
	$('body').scrollspy({target: ".navigation", offset: 80});

	$('a.page-scroll').bind('click', function (event) {
		var $anchor = $(this);
		$('html, body').stop().animate({
			scrollTop: $($anchor.attr('href')).offset().top - 30
		}, 1200, 'easeInOutExpo');
		event.preventDefault();
	});

	$('.hero-header').css('min-height', $(window).innerHeight());
	$(window).resize(function (e) {
		$('.hero-header').css('min-height', $(window).innerHeight());
	});


	$(".section-affix").affix({

		offset: {
			top: 700
		}

	});
});