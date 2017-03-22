const fs = require('fs');
const countries = JSON.parse(fs.readFileSync("../web/mapping/assets/data/countries.json").toString());
const tables = JSON.parse(fs.readFileSync("../web/mapping/assets/data/tables.json").toString());
const countries_ids = JSON.parse(fs.readFileSync("./countries_ids.json").toString());
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

var drawtables = [];

tables.forEach(function (table) {
	table.nr = table.nr.toString();
	if (table.entries) {
		if (table.entries[0].id) {
			storeTable(table.nr, table);
			drawtables.push(table);
		} else {
			console.log('error' + table.nr);
		}
	} else if (table.values) {
		table.values.forEach(function (t, i) {
			var id = table.nr + '.' + (i + 1);
			t.nr = id;
			drawtables.push(t);
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

fs.writeFileSync('../web/mapping/assets/data/data.json', JSON.stringify({countries: countries_ids, tables: tables}));
