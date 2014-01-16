csvparser
=========

Drag 'n drop CSV parser

##Usage

Instantiate CSVParser with a config, the config should be structured as follows:

```javscript
var CSVParser = require('csvparser');

var myConfig = {
	rules: myRules,
	tests: myTests,

	loadData: myDataLoader,
	saveData: myDataSaver,

	target: myTarget,

	options: myOptions
}

var myParser = new CSVParser(myConfig);
```

###rules

CSVParser uses rules to test and parse all values in your CSV. For each field in your CSV you must define a rule to tell CSVParser how to handle it.

```javascript
var myRules = {
	id: 'string',
	name: 'string',
	age: 'number',
	married: 'boolean',
	birthday: 'date',
	department: 'departmentId'
}
```

###tests

CSVParser has a few built-in tests:

* boolean
* date
* number
* string

You are free to create your own.

```javascript
var myTests = {
	departmentId:
		test: function (value) { return departmentData.hasOwnProperty(value); },
		parse: function (value) { return value; }
	}
}
```

###loadData

CSVParser wants to display the data you already have, give it a function to call that returns data in a callback.

```javascript
var myDataLoader = function (cb) {
	dataSource.get('personnel', cb);
};
```

###saveData

CSVParser will save your data for you when you click on the save button. If you want to transform the data before you save it, you can do it inside the saveData function.

```javascript
var myDataSaver = function (data, cb) {
	dataSource.set('personnel', data, cb);
};
```

###target

CSVParser needs a DOM element to stick it's data in.

```javascript
var myTarget = document.getElementById('personnelTarget');
```

###options

CSVParser has a few options that you can set:

* allowNull: boolean, defaults to true - null values are acceptable in all fields.
* allowUndefined: boolean, defaults to true - undefined values are acceptable in all fields.
* empty: defaults to undefined - What you want to replace empty values with.
* optional: array of keys - Which keys are optional, by default all keys are required.
* unique: number, string, or array of strings. - which fields represent the unique key for a row. defaults to the first field.