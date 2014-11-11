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

	options: myOptions // optional
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
* timeString

You are free to create your own. It will need a test and parse function.

```javascript
var myTests = {
	departmentId:
		test: function (value) { return departmentData.hasOwnProperty(value); },
		parse: function (value) { return value; }
	}
}
```

###options

CSVParser has a few options that you can set:

* allowNull: boolean, defaults to true - null values are acceptable in all fields.
* allowUndefined: boolean, defaults to true - undefined values are acceptable in all fields.
* empty: defaults to undefined - What you want to replace empty values with.
* optional: array of keys - Which keys are optional, by default all keys are required.
* rotate: boolean, defaults to false - treats rows as columns and columns as rows.
* unique: number, string, or array of strings. - which fields represent the unique key for a row. defaults to the first field.
