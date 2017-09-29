
const levelToFunction = {
	'error' : console.error,
	'info'  : console.info,
	'debug' : console.log
}

exports.log = function(level, event, body) {
	levelToFunction[level](`[${level.toUpperCase()}] [${event}] ${body}`);
}

exports.logRequest = function(req, _, next) {
	exports.log('info', 'request-url', JSON.stringify(req.url));
	exports.log('info', 'request-body', JSON.stringify(req.body));
	exports.log('info', 'request-files', JSON.stringify(req.files));
	exports.log('info', 'request-headers', JSON.stringify(req.headers));
	next();
}