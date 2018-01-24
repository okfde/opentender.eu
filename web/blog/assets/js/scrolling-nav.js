$(document).ready(function () {
	$('body').scrollspy({target: ".navigation", offset: 80});

	$('a.page-scroll').bind('click', function (event) {
		var $anchor = $(this);
		$('html, body').stop().animate({
			scrollTop: $($anchor.attr('href')).offset().top - 30
		}, 1200, 'easeInOutExpo');
		event.preventDefault();
	});

	$(".section-affix").affix({

		offset: {
			top: 700
		}

	});
});
