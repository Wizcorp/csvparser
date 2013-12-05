var EventEmitter = require('emitter');

function inherits(Child, Parent) {
	Child.prototype = Object.create(Parent.prototype, {
		constructor: { value: Child, enumerable: false, writable: true, configurable: true }
	});
}

var defaultTests = {
	bool: {
		test: function (value) { return value.toLowerCase() === 'true' || value.toLowerCase() === 'false'; },
		parse: function (value) { return value.toLowerCase() === 'true'; }
	},
	date: {
		test: function (value) { return !isNaN(new Date(value).getDate()); },
		parse: function (value) { return new Date(value); }
	},
	number: {
		test: function (value) { return !isNaN(value) && parseFloat(value).toString() === value.toString(); },
		parse: function (value) { return parseFloat(value); }
	},
	string: {
		test: function (value) { return typeof value === 'string'; },
		parse: function (value) { return value; }
	}
};

var CSVParser = function (config) {
	this.loadData = config.loadData;
	this.saveData = config.saveData;
	this.csvTarget = config.target;
	this.options = config.options || {};

	this.headers = [];
	this.values = [];
	this.parsed = {};

	this.allowNull = true;
	this.isSafe = true;

	this.tests = defaultTests;

	this.createButtons();
	this.createDropElement();
	this.createResultElement();
	this.createDataDisplay();

	this.rules = {};

	if (config.rules) {
		this.setRules(config.rules);
	}

	if (config.tests) {
		for (var id in config.tests) {
			this.tests[id] = config.tests[id];
		}
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

CSVParser.prototype.setRules = function (rules) {
	for (var ruleName in rules) {
		var rule = rules[ruleName];

		if (typeof rule === "string") {
			rule = { type: rule };
		}

		this.rules[ruleName] = rule;
	}
};

CSVParser.prototype.setUniques = function (ids) {
	this.uniques = Array.isArray(ids) ? ids : [ ids ];
};

CSVParser.prototype.parse = function (key, value) {

	//Check to see if rules exists, and that there is a rule for the specified key.
	//If not, there are no (valid) rules and should thus return true.

	if (this.rules[key]) {
		// empty values
		if (!value.trim()) {
			// we use hasOwnProperty so that the user can use "undefined" as an empty value
			if (this.rules[key].hasOwnProperty('empty')) {
				return this.rules[key].empty;
			}

			if (this.options.hasOwnProperty('empty')) {
				return this.options.empty;
			}
		}

		var type = this.rules[key].type;
		value = this.tests[type].parse.call(this, value);

		// apply post parsing transformation
		if (this.rules[key].transform) {
			value = this.rules[key].transform.call(this, key, value);
		} else if (this.options.transform) {
			value = this.options.transform.call(this, key, value);
		}

	} else {
		if (this.options.hasOwnProperty('empty')) {
			return this.options.empty;
		}

		if (this.options.transform) {
			value = this.options.transform.call(this, key, value);
		}
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
		return true;
	}

	if (this.rules[key] === undefined) {
		return false;
	}

	var type = this.rules[key].type;

	return this.tests[type].test.call(this, value);
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

function removeAllChildren(ele) {
	while (ele.childNodes.length) {
		ele.removeChild(ele.childNodes[0]);
	}
}

function renderResults(that) {
	that.saveButton.show();
	that.cancelButton.show();
	that.dropElement.hide();

	removeAllChildren(that.resultElement);

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
		var parsedRow = that.parsed[uniqueId];

		uniqueIds[uniqueId] = uniqueIds.hasOwnProperty(uniqueId) ? uniqueIds[uniqueId] + 1 : 1;

		for (i = 0; i < valueRow.length; i += 1) {
			var value = document.createElement('td');
			var classes = 'rowValue valid';

			if (!that.test(that.headers[i], parsedRow[that.headers[i]]) || uniqueIds[uniqueId] > 1) {
				classes = 'rowValue invalid';
				that.isSafe = false;
			}

			value.className = classes;
			value.textContent = parsedRow[that.headers[i]];

			row.appendChild(value);
		}

		that.resultElement.appendChild(row);
	}

	that.resultElement.show();
}


CSVParser.prototype.createResultElement = function () {
	var resultElement = this.resultElement = document.createElement('table');
	resultElement.className = 'csvResults';

	resultElement.show = function () {
		resultElement.style.display = '';
	};

	resultElement.hide = function () {
		resultElement.style.display = 'none';
	};

	this.csvTarget.appendChild(resultElement);
};

CSVParser.prototype.createDropElement = function () {
	var that = this;
	
	var dropElement = this.dropElement = document.createElement('DIV');
	dropElement.className = 'dropElement';
	dropElement.textContent = 'Drop CSV file here';

	dropElement.addEventListener('dragover', function (e) {
		e.stopPropagation();
		e.preventDefault();
	});

	dropElement.addEventListener('drop', function (e) {
		var files = e.dataTransfer.files;

		e.stopPropagation();
		e.preventDefault();

		if (files.length) {
			if (files[0].type !== 'text/csv') {
				return alert('That file is not a csv.');
			}

			that.once('parsed', function () {
				renderResults(that);
			});

			that.parseCSV(files[0]);
		}
	}, false);

	dropElement.hide = function () {
		dropElement.style.display = 'none';
	}

	dropElement.show = function () {
		dropElement.style.display = '';
	}

	this.csvTarget.appendChild(dropElement);
};

function createButton(value) {
	var button = document.createElement('INPUT');
	button.type = 'button';
	button.value = value;

	button.show = function () {
		button.style.display = '';
	};

	button.hide = function () {
		button.style.display = 'none';
	};

	return button;
}

CSVParser.prototype.createButtons = function () {
	var that = this;

	var saveButton = this.saveButton = createButton('Save');
	var cancelButton = this.cancelButton = createButton('Cancel');

	function saveClicked() {
		if (!this.isSafe && !confirm('There were errors with your data, are you sure you want to save?')) {
			return;
		}

		saveButton.hide();
		cancelButton.hide();
		that.resultElement.hide();
		that.dropElement.show();

		that.emit('save');
	}

	function cancelClicked() {
		saveButton.hide();
		cancelButton.hide();
		that.resultElement.hide();
		that.dropElement.show();
	}

	saveButton.addEventListener('click', saveClicked, false);
	cancelButton.addEventListener('click', cancelClicked, false);

	this.csvTarget.appendChild(saveButton);
	this.csvTarget.appendChild(cancelButton);

	saveButton.hide();
	cancelButton.hide();
};

CSVParser.prototype.createDataDisplay = function () {
	var dataDisplay = this.dataDisplay = document.createElement('DIV');

	var data = {};

	dataDisplay.hide = function () {
		dataDisplay.style.display = 'none';
	};

	dataDisplay.show = function () {
		dataDisplay.style.display = '';
	};

	dataDisplay.update = function (newData) {
		data = newData;
		removeAllChildren(dataDisplay);
		dataDisplay.render();
	};

	dataDisplay.render = function () {
		for (var dataId in data) {
			var div = document.createElement('DIV');

			var elm = document.createElement('H3');
			elm.textContent = dataId;

			div.appendChild(elm);

			var dataObject = data[dataId];
			for (var prop in dataObject) {
				elm = document.createElement('SPAN');
				elm.textContent = prop + ': ';

				div.appendChild(elm);

				elm = document.createElement('SPAN');
				elm.textContent = dataObject[prop];

				div.appendChild(elm);

				elm = document.createElement('BR');

				div.appendChild(elm);
			}

			dataDisplay.appendChild(div);
		}
	};

	if (this.loadData) {
		console.log('gonna load some data');
		this.loadData(function (error, newData) {
			if (error) {
				console.error(error);
			}

			console.log(newData);
			dataDisplay.update(newData);
		});
	}

	this.csvTarget.appendChild(dataDisplay);
};

module.exports = CSVParser;
