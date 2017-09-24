
const levelToFunction = {
	'error' : console.error,
	'info'  : console.info,
	'debug' : console.log
}

module.exports = function(level, event, body) {
	levelToFunction[level](`[${level.toUpperCase()}] [${event}] ${body}`);
}