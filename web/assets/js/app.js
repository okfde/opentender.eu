var app = angular.module('App', ['ngSanitize', 'ngAnimate', 'ngDialog']);

app.config(['$compileProvider', function ($compileProvider) {
	$compileProvider.debugInfoEnabled(false);
}]);

app.controller('IframeCtrl', function ($scope, $rootScope, data, $location) {
	$scope.view = {
		tables: [],
		table: null,
		showvalues: false,
		mode: 1,
		changeHoverEntry: function (entry) {
			$scope.view.hoverEntry = entry;
		},
		displayCountry: function (country) {
			if (!country.info) return;
			$scope.view.country = country;
			$scope.view.mode = 3;
		}
	};

	$rootScope.$on('$locationChangeSuccess', function (event) {
		display();
	});

	var display = function () {
		if (!$scope.view.tables) return;
		var searchObject = $location.search();

		var table = $scope.view.tables.filter(function (t) {
			return (searchObject.nr || 1) == t.nr;
		})[0];
		var nr = table ? $scope.view.tables.indexOf(table) : 0;
		$scope.view.table = $scope.view.tables[nr || 0];
		if ($scope.view.table) {
			if ($scope.view.table.values)
				$scope.view.current = $scope.view.table.values[searchObject.sub || 0];
			else
				$scope.view.current = $scope.view.table;
		}
	};

	data.init(function (d) {
		$scope.view.tables = d.tables;
		display();
	})
});

app.controller('ToolsCtrl', function ($scope, $document, $timeout, data) {

	$scope.exportTSV = function (table) {
		var tsv = data.toTSV(table);
		var filename = 'd1.1-' + table.nr + '.tsv';//name.toLowerCase().replace(/ /g, '_').replace(/,/g, '') + ".tsv";
		var charset = "utf-8";
		var blob = new Blob([tsv], {
			type: "text/tsv;charset=" + charset + ";"
		});
		if (window.navigator.msSaveOrOpenBlob) {
			navigator.msSaveBlob(blob, filename);
		} else {
			var downloadContainer = angular.element('<div data-tap-disabled="true"><a></a></div>');
			var downloadLink = angular.element(downloadContainer.children()[0]);
			downloadLink.attr('href', window.URL.createObjectURL(blob));
			downloadLink.attr('download', filename);
			downloadLink.attr('target', '_blank');
			$document.find('body').append(downloadContainer);
			$timeout(function () {
				downloadLink[0].click();
				downloadLink.remove();
			}, null);
		}
	};

});

app.controller('MainCtrl', function ($scope, $document, $timeout, data, ngDialog) {
	$scope.view = {
		tables: [],
		table: null,
		showvalues: false,
		changeHoverEntry: function (entry) {
			$scope.view.hoverEntry = entry;
		},
		displayCountry: function (country) {
			ngDialog.open({
				template: '../assets/partials/country.html',
				controller: function ($scope) {
					$scope.country = country;
					$scope.view = {section: 'Info'};
				}
			});
		}
	};

	$scope.setTable = function (table) {
		$scope.view.table = table;
	};

	$scope.$watch('view.table', function (table) {
		if (table) {
			if (table.values) $scope.view.current = table.values[0];
			else $scope.view.current = table;
		}
	});
	data.init(function (d) {
		$scope.view.tables = d.tables;
		$scope.view.table = d.tables[0];
	});
});

app.factory('data', function ($http) {

	var data = {
		countries: [],
		tables: []
	};

	var countryByIso = function (iso) {
		return data.countries.filter(function (c) {
			return iso == c.iso;
		})[0];
	};

	var prepareTable = function (table) {
		table.entries = [];
		data.countries.forEach(function (country) {
			if (country.tables && country.tables[table.nr]) {
				var val = country.tables[table.nr];
				if (!isNaN(val)) {
					table.entries.push({id: country.iso, group: val});
				} else {
					if (val.length == 2)
						table.entries.push({id: country.iso, group: val[0], value: val[1]});
					else if (val.length == 3)
						table.entries.push({id: country.iso, group: val[0], value: val[1], info: val[2]});
				}
			}
		});
		if (!table.groups) {
			var groups = [];

			table.entries.forEach(function (entry) {
				if (groups.indexOf(entry.value) < 0) groups.push(entry.value);
			});
			table.entries.forEach(function (entry) {
				entry.group = groups.indexOf(entry.value);
			});
			table.groups = groups.sort(function (a, b) {
				if (a < b) return -1;
				if (a > b) return 1;
				return 0;
			});
		}
		if (!table.groups.length) {
			table.groups = ['Value'];
			table.entries.forEach(function (entry) {
				entry.group = 0;
			});
		}
		var scale = chroma.scale(['#2ca25f', '#e5f5f9']).domain([0, table.groups.length], table.groups.length);//, 'quantiles');
		table.entries.forEach(function (entry) {
			var country = countryByIso(entry.id);
			if (!country) {
				console.log('country not found', entry.id);
			} else {
				entry.country = country;
			}
			if (entry.group == undefined) {
				entry.group = table.groups.indexOf(entry.value);
			}
			entry.color = scale(entry.group).hex();
		});

		var rd = {};
		table.groups = table.groups.map(function (group, i) {
			var items = table.entries.filter(function (entry) {
				return entry.country && ((entry.group === i));
			}).map(function (entry) {
				var value = {
					value: entry,
					country: entry.country
				};
				rd[entry.country.iso] = value;
				return value;
			});
			return {name: group, color: scale(i).hex(), items: items};
		});

		var pt = [];
		table.groups.forEach(function (group, col) {
			group.items.forEach(function (item, row) {
				while (pt.length <= row) pt.push([]);
				while (pt[row].length <= col) pt[row].push(false);
				pt[row][col] = item;
			});
		});
		table.regions = rd;
		table.view = pt;
	};

	var prepareData = function (d) {
		data = d;
		data.tables.forEach(function (table) {
			if (table.values) {
				table.values.forEach(function (t) {
					t.groups = t.groups || table.groups;
					t.unit = t.unit || table.unit;
					prepareTable(t);
				});
			}
			else prepareTable(table);
		});
	};

	return {
		countryByIso: countryByIso,
		toTSV: function (table) {
			var rows = [];
			rows.push([table.nr + '. ' + table.name]);
			rows.push([]);
			if (table.entries) {
				rows.push(['Country', 'Value', 'Group', 'Info']);
				rows.push([]);
				table.entries.forEach(function (entry) {
					var row = [];
					row.push(entry.country.name);
					row.push(entry.value);
					row.push(table.groups[entry.group].name);
					row.push(entry.info);
					rows.push(row);
				})
			} else {
				var cols = [];
				var c = {};
				table.values.forEach(function (t, i) {
					cols.push(t.name);
					cols.push('Info - ' + t.name);
					t.entries.forEach(function (e) {
						c[e.id] = c[e.id] || [];
						while (c[e.id].length < cols.length) {
							c[e.id].push('');
						}
						if (e.value == null) {
							c[e.id][cols.length - 2] = t.groups[e.group].name;
						} else {
							c[e.id][cols.length - 2] = e.value;
						}
						c[e.id][cols.length - 1] = e.info;
					});
				});
				rows.push(['Country'].concat(cols));
				Object.keys(c).forEach(function (key) {
					rows.push([key].concat(c[key]));
				});
			}
			var tsv = rows.map(function (row) {
				return row.join('\t')
			}).join('\n');
			return tsv;
		},
		init: function (cb) {
			$http.get('../assets/data/data.json')
				.then(function (result) {
					prepareData(result.data);
					cb(data);
				});
		}
	};
});

function isCrapBrowser() {
	var ua = window.navigator.userAgent;
	if (ua.indexOf('Trident/7.0') > 0) {
		return true;
	} else if (ua.indexOf('Trident/6.0') > 0) {
		return true;
	} else if (ua.indexOf('Trident/5.0') > 0) {
		return true;
	} else if ((nua.indexOf('Mozilla/5.0') > -1 && nua.indexOf('Android ') > -1 && nua.indexOf('AppleWebKit') > -1) && !(nua.indexOf('Chrome') > -1)) {
		return true;
	}
	return false;  // not IE9, 10 or 11
}

function fixThisSVG(svg) {
	if (!isCrapBrowser()) return;
	var width = svg.getAttribute('width');
	var height = svg.getAttribute('height');
	if (width && height && !svg.getAttribute('data-ignore-svg-polyfill')) {
		var ratio = (parseInt(height, 10) / parseInt(width, 10) * 100) + '%';
		var wrapper = document.createElement('div');
		var spacer = document.createElement('div');
		spacer.setAttribute('style', 'display: block; padding-bottom: ' + ratio);
		wrapper.setAttribute('style', 'position: relative;');
		wrapper.appendChild(spacer);
		svg.parentNode.appendChild(wrapper);
		svg.setAttribute('style', 'display: block; width: 100%; position: absolute; top: 0; left: 0; bottom: 0;');
		wrapper.appendChild(svg);
	}
}

// function fixSizes() {
// 	[...document.querySelectorAll('svg')].forEach(fixThisSVG);
// }
//
// export default function init() {
// 	fixSizes();
// }

app.directive('svgMap', function ($compile) {
	return {
		restrict: 'A',
		templateUrl: '../assets/svg/borders_iso.svg',
		scope: {
			mapData: "="
		},
		link: function (scope, element, attrs) {
			var regions = element[0].querySelectorAll('.country');
			angular.forEach(regions, function (path, key) {
				var regionElement = angular.element(path);
				regionElement.attr("region", "");
				regionElement.attr("fill", '#b8b8b8');
				regionElement.attr("map-data", "mapData");
				$compile(regionElement)(scope);
			});
			var svgs = element[0].querySelectorAll('svg');
			angular.forEach(svgs, function (svg, key) {
				fixThisSVG(svg);
			});
		}
	}
});

app.directive('region', function ($compile, data) {
	return {
		restrict: 'A',
		scope: {
			mapData: "="
		},
		link: function (scope, element, attrs) {
			scope.elementId = element.attr("id").slice(0, 2);
			scope.country = data.countryByIso(scope.elementId);
			if (scope.country)
				element.attr("title", scope.country.name);
			else {
				console.log('country not found', scope.elementId);
			}

			scope.regionMouseOver = function () {
				if (scope.mapData && scope.mapData.current && scope.mapData.current.regions[scope.elementId])
					scope.mapData.changeHoverEntry(scope.mapData.current.regions[scope.elementId].value);
			};
			scope.regionMouseLeave = function () {
				scope.mapData.changeHoverEntry();
			};
			scope.$watch('mapData.hoverEntry', function (hoverEntry) {
				if (hoverEntry && hoverEntry.country && (hoverEntry.country.iso == scope.elementId)) {
					element[0].parentNode.appendChild(element[0]);
				}
			});
			element.attr("ng-click", "mapData.displayCountry(country)");
			element.attr("ng-attr-fill", "{{mapData.current.regions[elementId].value.color || '#b8b8b8'}}");
			element.attr("ng-mouseover", "regionMouseOver()");
			element.attr("ng-mouseleave", "regionMouseLeave()");
			element.attr("ng-class", "{active:mapData.hoverEntry.country.iso == elementId}");
			element.removeAttr("region");
			$compile(element)(scope);
		}
	}
});

app.directive('backcolor', function () {
	return function (scope, element, attrs) {
		attrs.$observe('backcolor', function (value) {
			element.css({
				'background-color': value
			});
		});
	};
});

app.filter('tablename', function () {
	return function (table) {
		if (table == null) return '[no table]';
		return table.nr + '. ' + table.name;
	};
});

app.filter('map_colour', [function () {
	return function (input) {
		if (input == null) return '#b8b8b8';
		return input;
	}
}]);

app.filter('linkify', function () {
	'use strict';

	function linkify(_str, type) {
		if (!_str) {
			return;
		}

		var _text = _str.replace(/(?:https?\:\/\/|www\.)+(?![^\s]*?")([\w.,@?!^=%&amp;:\/~+#-]*[\w@?!^=%&amp;\/~+#-])?/ig, function (url) {
			var wrap = document.createElement('div');
			var anch = document.createElement('a');
			anch.href = url;
			anch.target = "_blank";
			anch.innerHTML = url;
			wrap.appendChild(anch);
			return wrap.innerHTML;
		});

		// bugfix
		if (!_text) {
			return '';
		}

		// Twitter
		if (type === 'twitter') {
			_text = _text.replace(/(|\s)*@([\u00C0-\u1FFF\w]+)/g, '$1<a href="https://twitter.com/$2" target="_blank">@$2</a>');
			_text = _text.replace(/(^|\s)*#([\u00C0-\u1FFF\w]+)/g, '$1<a href="https://twitter.com/search?q=%23$2" target="_blank">#$2</a>');
		}


		// Github
		if (type === 'github') {
			_text = _text.replace(/(|\s)*@(\w+)/g, '$1<a href="https://github.com/$2" target="_blank">@$2</a>');
		}

		return _text;
	}

	//
	return function (text, type) {
		return linkify(text, type);
	};
});
