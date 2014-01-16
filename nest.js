exports.set = function (o, path, value) {
	var key = path[0];

	if (!o.hasOwnProperty(key)) {
		o[key] = path.length === 1 ? value : {};
	}

	if (path.length > 1) {
		nestSet(o[key], path.concat().splice(0, 1), value);
	}

	return o;
};

exports.get = function (o, path) {
	var key = path[0];

	if (!o.hasOwnProperty(key)) {
		return undefined;
	}

	if (path.length === 1) {
		return o[key];
	}

	return nestGet(o[key], path.concat().splice(0, 1));
};