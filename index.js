var EventEmitter;

try {
	EventEmitter = typeof require === 'function' ? require('emitter') : EventEmitter;
} catch (e) {
	EventEmitter = typeof require === 'function' ? require('events').EventEmitter : EventEmitter;
}

function inherits(Child, Parent) {
	Child.prototype = Object.create(Parent.prototype, {
		constructor: { value: Child, enumerable: false, writable: true, configurable: true }
	});
}

var CSVParser = function (rules) {
	this.rules = null;
	this.dropElement = null;
	this.resultElement = null;

	this.headers = [];
	this.values = [];
	this.parsed = {};

	this.allowNull = true;
	this.isSafe = true;

	this.types = {
		string: 'Text',
		int:    'Number',
		bool:   'Boolean'
	};

	this.tests = {
		bool: {
			test: function (value) { return value.toLowerCase() === 'true' || value.toLowerCase() === 'false'; },
			parse: function (value) { return value.toLowerCase() === 'true'; }
		},
		date: {
			test: function (value) { return !isNaN(new Date(value).getDate()); },
			parse: function (value) { return new Date(value); }
		},
		int: {
			test: function (value) { return !isNaN(value) && parseInt(value, 10).toString() === value.toString(); },
			parse: function (value) { return parseInt(value, 10); }
		},
		string: {
			test: function (value) { return typeof value === 'string'; },
			parse: function (value) { return value; }
		}
	};

	this.createDropField();
	this.createResultElement();

	if (rules !== undefined) {
		this.setRules(rules);
	}
};

inherits(CSVParser, EventEmitter);

CSVParser.prototype.getRows = function (file) {
	var universalNewline = /\r\n|\r|\n/g;
	var rows = (file + '\n').split(universalNewline);
	var csvRows = [];
	var sep = ",";

	for (var i = 0; i < rows.length; i += 1) {
		if (!rows[i].length) {
			continue;
		}

		for (var f = rows[i].split(sep), x = f.length - 1, tl; x >= 0; x--) {

			if (f[x].replace(/"\s+$/, '"').charAt(f[x].length - 1) === '"') {

				if ((tl = f[x].replace(/^\s+"/, '"')).length > 1 && tl.charAt(0) === '"') {

					f[x] = f[x].replace(/^\s*"|"\s*$/g, '').replace(/""/g, '"');

				} else if (x) {

					f.splice(x - 1, 2, [f[x - 1], f[x]].join(sep));

				} else {

					f = f.shift().split(sep).concat(f);
				}

			} else {

				f[x].replace(/""/g, '"');

			}

		}

		csvRows.push(f);

	}

	return csvRows;

};

CSVParser.prototype.createResultElement = function () {

	var wrapper = document.createElement('table');
	wrapper.className = 'csvResults';

	this.resultElement = wrapper;

};

CSVParser.prototype.addTest = function (id, test) {
	this.tests[id] = test;
};

CSVParser.prototype.setRules = function (rules) {
	this.rules = rules;
};

CSVParser.prototype.setUniques = function (ids) {
	this.uniques = Array.isArray(ids) ? ids : [ ids ];
};

CSVParser.prototype.parse = function (key, value) {

	//Check to see if rules exists, and that there is a rule for the specified key.
	//If not, there are no (valid) rules and should thus return true.

	if (this.rules && this.rules[key]) {

		var type = this.rules[key];
		return this.tests[type].parse(value);

	}

	return value;

};

CSVParser.prototype.test = function (key, value) {

	//Always return true if rules are not defined.
	if (this.rules === null) {
		return value;
	}

	//Return true if null is allowed.
	if (this.allowNull === true && (value === 'null' || value === null)) {
		return null;
	}

	if (this.rules[key] === undefined) {
		return false;
	}

	var type = this.rules[key];

	return this.tests[type].test(value) ? this.tests[type].parse(value) : false;
};

CSVParser.prototype.parseCSV = function (file) {
	this.isSafe = true;
	this.headers = [];
	this.values = [];
	this.parsed = {};

	var that = this;

	var reader = new FileReader();

	reader.onload = function (file) {
		file = file.target.result;

		var rows = that.getRows(file);
		var row = rows[0];

		for (var j = 0; j < row.length; j += 1) {
			that.headers.push(row[j]);
		}

		var parsedObject = {};

		for (var i = 1; i < rows.length; i += 1) {
			row = rows[i];

			var id = row[0];
			parsedObject[id] = {};

			for (j = 0; j < row.length; j += 1) {
				parsedObject[id][that.headers[j]] = that.parse(that.headers[j], row[j]);
			}

			that.values.push(row);
		}

		that.parsed = parsedObject;
		that.emit('parsed', parsedObject);
	};

	reader.readAsText(file);
};

CSVParser.prototype.resetResultElement = function () {
	var rE = this.resultElement;

	while (rE.childNodes.length) {
		rE.removeChild(rE.childNodes[0]);
	}
};

function renderResults(that) {
	that.resetResultElement();

	var header = document.createElement('tr');
	header.className = 'resultHeader';

	for (var i = 0; i < that.headers.length; i += 1) {
		var key = document.createElement('th');
		key.className = 'resultKey';
		key.textContent = that.headers[i];
		header.appendChild(key);
	}

	that.resultElement.appendChild(header);

	var uniqueIds = {};

	for (var j = 0; j < that.values.length; j += 1) {
		var row = document.createElement('tr');
		row.className = 'resultRow';

		var valueRow = that.values[j];

		var uniqueId = valueRow[0];
		uniqueIds[uniqueId] = uniqueIds.hasOwnProperty(uniqueId) ? uniqueIds[uniqueId] + 1 : 1;

		for (i = 0; i < valueRow.length; i += 1) {
			var value = document.createElement('td');
			var classes = 'rowValue valid';


			if (!that.test(that.headers[i], valueRow[i]) || uniqueIds[uniqueId] > 1) {
				classes = 'rowValue invalid';
				that.isSafe = false;
			}

			value.className = classes;
			value.textContent = valueRow[i];

			row.appendChild(value);
		}

		that.resultElement.appendChild(row);
	}
}

CSVParser.prototype.createDropField = function () {

	var that = this;
	this.dropElement = document.createElement('div');
	this.dropElement.className = 'dropElement';
	this.dropElement.textContent = 'Drop CSV file here';

	this.dropElement.addEventListener('dragover', function (e) {

		e.stopPropagation();
		e.preventDefault();

	});

	this.dropElement.addEventListener('drop', function (e) {
		e.stopPropagation();
		e.preventDefault();

		var files = e.dataTransfer.files;

		if (files.length) {
			that.parseCSV(files[0]);
			that.once('parsed', function () {
				renderResults(that);
			});
		}
	}, false);
};

module.exports = CSVParser;
