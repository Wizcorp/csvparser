var EventEmitter = require('emitter');
var moment = require('moment');
var nesty = require('nesty');

function inherits(Child, Parent) {
	Child.prototype = Object.create(Parent.prototype, {
		constructor: { value: Child, enumerable: false, writable: true, configurable: true }
	});
}

function stringToMoment(value) {
	var split = value.toString().split(' ');
	return moment.duration(parseFloat(split[0], 10), split[1]);
}

function timeStringParse(value) {
	return stringToMoment(value).asSeconds();
}

function timeStringTest(value) {
	return stringToMoment(value).asSeconds() > 0;
}

function CSVParser(config) {
	EventEmitter.call(this);

	var defaultTests = {
		boolean: {
			test: function (value) { return typeof value === 'boolean'; },
			parse: function (value) { return value.toLowerCase() === 'true'; }
		},
		date: {
			test: function (value) { return !isNaN(new Date(value)); },
			parse: function (value) { return new Date(value); }
		},
		number: {
			test: function (value) { return !isNaN(value) && parseFloat(value).toString() === value.toString(); },
			parse: function (value) { return parseFloat(value); }
		},
		string: {
			test: function (value) { return typeof value === 'string'; }
		},
		timeString: {
			test: timeStringTest,
			parse: timeStringParse
		}
	};

	this.csvTarget = config.target;
	this.options = config.options || {};

	this.headers = [];
	this.values = [];
	this.parsed = {};

	this.options.allowNull = this.options.hasOwnProperty('allowNull') ? this.options.allowNull : true;
	this.options.allowUndefined = this.options.hasOwnProperty('allowUndefined') ? this.options.allowUndefined : true;
	this.options.empty = this.options.hasOwnProperty('empty') ? this.options.empty : undefined;
	this.options.unique = this.options.hasOwnProperty('unique') ? this.options.unique : 0;
	this.options.rotate = this.options.hasOwnProperty('rotate') ? this.options.rotate : false;

	this.isSafe = true;

	this.tests = defaultTests;

	this.createResultElement();

	this.rules = {};

	if (config.rules) {
		this.setRules(config.rules);
	}

	if (config.tests) {
		for (var id in config.tests) {
			this.tests[id] = config.tests[id];
		}
	}
}

inherits(CSVParser, EventEmitter);

CSVParser.prototype.getRows = function (csvData) {
	// http://stackoverflow.com/questions/1293147/javascript-code-to-parse-csv-data
	var strDelimiter = ",";

	// Create a regular expression to parse the CSV values.
	var objPattern = new RegExp(
		(
			// Delimiters.
			"(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +

				// Quoted fields.
				"(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +

				// Standard fields.
				"([^\"\\" + strDelimiter + "\\r\\n]*))"
			),
		"gi"
	);

	// Create an array to hold our data. Give the array
	// a default empty first row.
	var arrData = [[]];

	// Create an array to hold our individual pattern
	// matching groups.
	var arrMatches;

	// Keep looping over the regular expression matches
	// until we can no longer find a match.
	while ((arrMatches = objPattern.exec(csvData))) {

		// Get the delimiter that was found.
		var strMatchedDelimiter = arrMatches[1];

		// Check to see if the given delimiter has a length
		// (is not the start of string) and if it matches
		// field delimiter. If id does not, then we know
		// that this delimiter is a row delimiter.
		if (strMatchedDelimiter.length && (strMatchedDelimiter !== strDelimiter)) {
			// Since we have reached a new row of data,
			// add an empty row to our data array.
			arrData.push([]);
		}

		// Now that we have our delimiter out of the way,
		// let's check to see which kind of value we
		// captured (quoted or unquoted).
		var strMatchedValue;
		if (arrMatches[2]) {
			// We found a quoted value. When we capture
			// this value, unescape any double quotes.
			strMatchedValue = arrMatches[2].replace(new RegExp( "\"\"", "g" ), "\"");
		} else {
			// We found a non-quoted value.
			strMatchedValue = arrMatches[3];
		}

		// Now that we have our value string, let's add
		// it to the data array.
		arrData[arrData.length - 1].push(strMatchedValue);
	}

	// Return the parsed data.
	return arrData;
};

CSVParser.prototype.setRules = function (rules) {
	for (var ruleName in rules) {
		var rule = rules[ruleName];

		if (typeof rule === 'string') {
			rule = { type: rule };
		}

		this.rules[ruleName] = rule;
	}
};

CSVParser.prototype.parse = function (key, value) {

	//Check to see if rules exists, and that there is a rule for the specified key.
	//If not, there are no (valid) rules and should just return the value.

	if (this.rules.hasOwnProperty(key)) {
		// empty values
		if (!value.trim()) {
			// we use hasOwnProperty so that the user can use "undefined" as an empty value
			if (this.options.hasOwnProperty('empty')) {
				return this.options.empty;
			}
		}

		var type = this.rules[key].type;
		if (typeof this.tests[type].parse === 'function') {
			value = this.tests[type].parse.call(this, value);
		}

		// apply post parsing transformation
		if (this.options.transform) {
			value = this.options.transform.call(this, key, value);
		}
	}

	return value;
};

CSVParser.prototype.test = function (key, value) {
	// No rules, fail.
	if (!this.rules.hasOwnProperty(key)) {
		return false;
	}

	// Return true if null is allowed.
	if (this.options.allowNull === true && (value === 'null' || value === null)) {
		return true;
	}

	// Return true if undefined is allowed.
	if (this.options.allowUndefined === true && (value === 'undefined' || value === undefined)) {
		return true;
	}

	var type = this.rules[key].type;

	return this.tests[type].test.call(this, value);
};

function rotateTable(rows) {
	var newRowCount = rows[0].length;
	var newColCount = rows.length;

	var out = new Array(newRowCount);

	var i, j;

	for (i = 0; i < newRowCount; i += 1) {
		out[i] = new Array(newColCount);
	}

	for (i = 0; i < newColCount; i += 1) {
		var row = rows[i];

		for (j = 0; j < newRowCount; j += 1) {
			out[j][i] = row[j];
		}
	}

	return out;
}

CSVParser.prototype.parseCSV = function (csvData) {
	this.isSafe = true;
	this.headers = [];
	this.values = [];
	this.parsed = {};
	this.rowKey = [];
	this.rowMap = [];

	var rows = this.getRows(csvData);

	var i, j;

	if (this.options.rotate) {
		rows = rotateTable(rows);
	}

	this.headers = rows.splice(0, 1)[0];

	var unique, useRowNumber;

	if (typeof this.options.unique === 'number') {
		unique = [ this.headers[this.options.unique] ];
	} else if (typeof this.options.unique === 'string') {
		unique = [ this.options.unique ];
	} else if (Array.isArray(this.options.unique)) {
		unique = this.options.unique;
	} else {
		useRowNumber = true;
	}

	var parsedObject = {};

	for (i = 0; i < rows.length; i += 1) {
		var row = rows[i];

		var parsedRow = {};

		for (j = 0; j < row.length; j += 1) {
			var key = this.headers[j];

			var value = row[j];

			var parsedValue = this.parse(key, value);

			if (parsedValue !== undefined) {
				parsedRow[key] = parsedValue;
			}
		}

		var path = [];

		if (useRowNumber) {
			path.push(i);
		} else {
			for (var p = 0; p < unique.length; p += 1) {
				path.push(parsedRow[unique[p]]);
			}
		}

		this.rowKey.push(path);
		this.rowMap.push(path.join('\n'));

		nesty.set(parsedObject, path, parsedRow);

		this.values.push(row);
	}

	this.parsed = parsedObject;
	this.emit('parsed', parsedObject);
	renderResults(this);
};

function removeAllChildren(ele) {
	while (ele.childNodes.length) {
		ele.removeChild(ele.childNodes[0]);
	}
}

function hasAsterisk(str) {
	return str.indexOf('*') !== -1;
}

// When we render, we also test the data

function renderResults(that) {
	removeAllChildren(that.resultElement);

	var header = document.createElement('TR');
	header.className = 'resultHeader';

	var i, j, key;

	var keys = Object.keys(that.rules);
	for (i = 0; i < keys.length; i += 1) {
		key = keys[i];

		if (that.headers.indexOf(key) === -1 && (!that.options.optional || (Array.isArray(that.options.optional) && that.options.optional.indexOf(key) === -1))) {
			that.isSafe = false;
			that.headers.push(key);
		}
	}

	for (i = 0; i < that.headers.length; i += 1) {
		key = that.headers[i];

		if (hasAsterisk(key) || (that.options.ignore && that.options.ignore.indexOf(key) !== -1)) {
			continue;
		}

		var th = document.createElement('TH');
		th.className = 'resultKey';
		th.textContent = key;
		header.appendChild(th);
	}

	that.resultElement.appendChild(header);

	var unique;

	if (typeof that.options.unique === 'number') {
		unique = [ that.headers[that.options.unique] ];
	} else if (typeof that.options.unique === 'string') {
		unique = [ that.options.unique ];
	} else if (Array.isArray(that.options.unique)) {
		unique = that.options.unique;
	}

	for (i = 0; i < that.values.length; i += 1) {
		var row = document.createElement('TR');
		row.className = 'resultRow';

		var valueRow = that.values[i];

		if (unique === undefined) {
			unique = [ i ];
		}

		var path = that.rowKey[i];
		var parsedRow = nesty.get(that.parsed, path);

		for (j = 0; j < that.headers.length; j += 1) {
			key = that.headers[j];

			if (hasAsterisk(key) || (that.options.ignore && that.options.ignore.indexOf(key) !== -1)) {
				delete parsedRow[key];
				continue;
			}

			var eleValue = document.createElement('TD');
			var classes = [ 'rowValue' ];

			var value = parsedRow[key];

			var safe = that.test(key, value);

			safe = safe && that.rowMap.indexOf(path.join('\n')) === i;

			if (!that.options.optional || (Array.isArray(that.options.optional) && that.options.optional.indexOf(key) === -1)) {
				safe = safe && !(value === undefined || value === null);
			}

			if (!safe) {
				classes.push('invalid');
				that.isSafe = false;
			} else {
				classes.push('valid');
			}

			eleValue.className = classes.join(' ');
			eleValue.textContent = value === undefined ? '' : value;

			row.appendChild(eleValue);
		}

		that.resultElement.appendChild(row);
	}

	that.resultElement.show();
}


CSVParser.prototype.createResultElement = function () {
	var resultElement = this.resultElement = document.createElement('TABLE');
	resultElement.className = 'csvResults';

	resultElement.show = function () {
		resultElement.style.display = '';
	};

	resultElement.hide = function () {
		resultElement.style.display = 'none';
	};

	this.csvTarget.appendChild(resultElement);
};

module.exports = CSVParser;