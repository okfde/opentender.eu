const fs = require("fs");
const svg2png = require("svg2png");
const chroma = require('../web/assets/bower_components/chroma-js/chroma');

const tables = JSON.parse(fs.readFileSync("../web/assets/data/tables.json").toString());
const countries_ids = JSON.parse(fs.readFileSync("./countries_ids.json").toString());
countries_ids.forEach(function (c) {
	c.iso = c.iso.toLowerCase();
});

var size = 2;

const svg = fs.readFileSync("../web/assets/svg/borders_iso.svg").toString();
const svgslice = svg.split('css"><![CDATA[');
svgslice[0] = svgslice[0] + 'css"><![CDATA[ ';
const toPng = function (table) {
	console.log('image for table ' + table.nr);
	var scale = chroma.scale(['#2ca25f', '#e5f5f9']).domain([0, table.groups.length], table.groups.length);
	var css = [];
	css.push('svg {background-color:#fff;stroke:#fff;fill:#fff;} .country {stroke:#222;stroke-width: 0.5;fill:#b8b8b8;}');
	table.entries.forEach(function (e) {
		var c = countries_ids.filter(function (c) {
			return e.id == c.name;
		})[0];
		// console.log(c.iso);
		css.push('#' + c.iso + ' {fill:' + scale(e.group).hex() + ';}');
		// console.log();
	});
	const svgbuffer = new Buffer(svgslice[0] + css.join(' ') + svgslice[1]);
	const pngbuffer = svg2png.sync(svgbuffer, {width: 783 * size, height: 709 * size});
	fs.writeFileSync("../web/assets/images/d1.1-" + table.nr + ".svg", svgbuffer);
	fs.writeFileSync("../web/assets/images/d1.1-" + table.nr + ".png", pngbuffer);
};

tables.forEach(function (t) {
	if (t.entries) toPng(t);
	else {
		t.values.forEach(function (t2, i) {
			t2.nr = t.nr + '.' + i;
			t2.groups = t2.groups || t.groups;
			toPng(t2);
		})
	}
});
// drawtables.forEach(function (table) {
// 	countries_ids.forEach(function (c) {
// 		if (c.tables && c.tables[table.nr]) {
// 			var val =
// 				scale(entry.group).hex();
// 			console.log(c.tables[table.nr]);
//
// 		}
// 	});
// });


// const svg = fs.readFileSync("../web/assets/svg/borders_iso.svg").toString();
// const svgbuffer = new Buffer(svg);
// const pngbuffer = svg2png.sync(svgbuffer, { width: 3000, height: 3000 });
// fs.writeFileSync("dest.png", pngbuffer);

// fs.readFile("../web/assets/borders_iso.svg")
//     .then(sourceBuffer => svg2png(sourceBuffer, { width: 3000, height: 3000 }))
//     .then(buffer => fs.writeFile("dest.png", buffer))
//     .catch(e => console.error(e));
