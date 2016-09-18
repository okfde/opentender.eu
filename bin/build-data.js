const fs = require('fs');
const countries = JSON.parse(fs.readFileSync("../web/assets/data/countries.json").toString());
const tables = JSON.parse(fs.readFileSync("../web/assets/data/tables.json").toString());

var countries_ids = [
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
	{name: "European Commission", iso: "EC"},
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

countries_ids.forEach(function (c) {
	c.iso = c.iso.toLowerCase();
});

countries.forEach(function (d) {
	var c = countries_ids.filter(function (c) {
		return d.name == c.name;
	})[0];
	if (!c) console.log('missing country info', d.name);
	else {
		c.info = d.values;
	}
});

const storeTable = function (id, table) {
	console.log('table', id);
	table.entries.forEach(function (e) {
		var c = countries_ids.filter(function (c) {
			return e.id == c.name;
		})[0];
		if (!c) {
			if (!c) console.log('missing country', e.id);
		}
		c.tables = c.tables || {};

		if (e.hasOwnProperty('info'))
			c.tables[id] = [e.group, e.value, e.info];
		else if (e.hasOwnProperty('value'))
			c.tables[id] = [e.group, e.value];
		else
			c.tables[id] = e.group;
	});
	delete table.entries;
};

tables.forEach(function (table) {
	table.nr = table.nr.toString();
	if (table.entries) {
		if (table.entries[0].id) {
			storeTable(table.nr, table);
		} else {
			console.log('error' + table.nr);
		}
	} else if (table.values) {
		table.values.forEach(function (t, i) {
			var id = table.nr + '.' + (i + 1);
			t.nr = id;
			if (t.entries) {
				if (t.entries[0].id) {
					storeTable(id, t);
				} else {
					console.log('error' + t.nr);
				}
			} else {
				console.log('unkown value');
			}
		})
	} else {
		console.log('unkown data');
	}
});

fs.writeFileSync('../web/assets/data/data.json', JSON.stringify({countries: countries_ids, tables: tables}));