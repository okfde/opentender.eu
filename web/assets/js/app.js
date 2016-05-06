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

	data.tables(function (err, tables) {
		$scope.view.tables = tables;
		display();
	})
});

app.controller('ToolsCtrl', function ($scope, $document, $timeout, data) {

	$scope.exportTSV = function (table) {
		var tsv = data.toTSV(table);
		var filename = table.name.toLowerCase().replace(/ /g, '_').replace(/,/g, '') + ".tsv";
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

	data.tables(function (err, tables) {
		$scope.view.tables = tables;
		$scope.view.table = tables[0];
	})
});

app.factory('data', function (countries, $http) {

	var prepareTable = function (table) {
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
			var country = countries.byName(entry.id);
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

	return {
		toTSV: function (table) {
			var rows = [];
			rows.push([table.nr + '. ' + table.name]);
			rows.push([]);
			if (table.entries) {
				rows.push(['Country', 'Value', 'Group', 'Info']);
				rows.push([]);
				table.entries.forEach(function (entry) {
					var row = [];
					row.push(entry.id);
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
		tables: function (cb) {
			$http.get('../assets/data/tables.json')
				.then(function (result) {
					result.data.forEach(function (table) {
						if (table.values) {
							table.values.forEach(function (t) {
								t.groups = t.groups || table.groups;
								t.unit = t.unit || table.unit;
								prepareTable(t);
							});
						}
						else prepareTable(table);
					});
					cb(null, result.data);
				})
		}
	};
});

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
		}
	}
});

app.directive('region', function ($compile, countries) {
	return {
		restrict: 'A',
		scope: {
			mapData: "="
		},
		link: function (scope, element, attrs) {
			scope.elementId = element.attr("id").slice(0, 2);
			scope.country = countries.byId(scope.elementId);
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

app.factory('countries', function ($http) {
	var me = this;
	var countries = [
		{name: "Albania", iso: "AL"},
		{name: "Algeria", iso: "DZ"},
		{name: "Andorra", iso: "AD"},
		{name: "Armenia", iso: "AM"},
		{name: "Austria", iso: "AT"},
		{name: "Belarus", iso: "BY"},
		{name: "Belgium", iso: "BE"},
		{name: "Bosnia and Herzegovina", iso: "BA"},
		{name: "Bulgaria", iso: "BG"},
		{name: "Croatia", iso: "HR"},
		{name: "Cyprus", iso: "CY"},
		{name: "Czech Republic", iso: "CZ"},
		{name: "Denmark", iso: "DK"},
		{name: "EC", iso: "EC"},
		{name: "Egypt", iso: "EG"},
		{name: "Estonia", iso: "EE"},
		{name: "Finland", iso: "FI"},
		{name: "France", iso: "FR"},
		{name: "Georgia", iso: "GE"},
		{name: "Germany", iso: "DE"},
		{name: "Greece", iso: "GR"},
		{name: "Hungary", iso: "HU"},
		{name: "Iceland", iso: "IS"},
		{name: "Ireland", iso: "IE"},
		{name: "Italy", iso: "IT"},
		{name: "Jersey", iso: "JE"},
		{name: "Latvia", iso: "LV"},
		{name: "Libya", iso: "LY"},
		{name: "Israel", iso: "IL"},
		{name: "Liechtenstein", iso: "LI"},
		{name: "Lithuania", iso: "LT"},
		{name: "Luxembourg", iso: "LU"},
		{name: "Macedonia, the Former Yugoslav Republic of", iso: "MK"},
		{name: "Malta", iso: "MT"},
		{name: "Moldova, Republic of", iso: "MD"},
		{name: "Monaco", iso: "MC"},
		{name: "Lebanon", iso: "LB"},
		{name: "Montenegro", iso: "ME"},
		{name: "Morocco", iso: "MA"},
		{name: "Netherlands", iso: "NL"},
		{name: "Norway", iso: "NO"},
		{name: "Poland", iso: "PL"},
		{name: "Saudi Arabia", iso: "SA"},
		{name: "Jordan", iso: "JO"},
		{name: "Kazakhstan", iso: "KZ"},
		{name: "Iraq", iso: "IQ"},
		{name: "Iran", iso: "IR"},
		{name: "Azerbaijan", iso: "AZ"},
		{name: "Portugal", iso: "PT"},
		{name: "Romania", iso: "RO"},
		{name: "Russian Federation", iso: "RU"},
		{name: "San Marino", iso: "SM"},
		{name: "Serbia", iso: "RS"},
		{name: "Syria", iso: "SY"},
		{name: "Slovakia", iso: "SK"},
		{name: "Slovenia", iso: "SI"},
		{name: "Spain", iso: "ES"},
		{name: "Suriname", iso: "SR"},
		{name: "Sweden", iso: "SE"},
		{name: "Switzerland", iso: "CH"},
		{name: "Tunisia", iso: "TN"},
		{name: "Turkey", iso: "TR"},
		{name: "Ukraine", iso: "UA"},
		{name: "United Kingdom", iso: "GB"}
	];

	countries.forEach(function (c) {
		c.iso = c.iso.toLowerCase();
	});

	$http.get('../assets/data/countries.json').then(function (result) {
		result.data.forEach(function (d) {
			if (d.name == 'European Commission') d.name = 'EC';
			var c = me.byName(d.name);
			if (!c) console.log('missing country info', d.name);
			else c.info = d.values;
		});
	});

	me.byName = function (name) {
		return countries.filter(function (c) {
			return name == c.name;
		})[0];
	};

	me.byId = function (id) {
		return countries.filter(function (c) {
			return id == c.iso;
		})[0];
	};

	return me;
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
