function get(o, path) {
	var key = path[0];

	if (!o.hasOwnProperty(key)) {
		return undefined;
	}

	if (path.length === 1) {
		return o[key];
	}

	return get(o[key], path.concat().splice(0, 1));
}

function set(o, path, value) {
	var key = path[0];

	if (!o.hasOwnProperty(key)) {
		o[key] = path.length === 1 ? value : {};
	}

	if (path.length > 1) {
		set(o[key], path.concat().splice(0, 1), value);
	}

	return o;
}

exports.get = get;
exports.set = set;
