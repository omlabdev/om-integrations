
const hourOptions = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];
const options = hourOptions.map(o => { 
	const seconds = o * 3600;
	const formattedHour = String(Math.floor(o) + 100).substring(1);
	const formattedMinutes = String(((o - Math.floor(o)) * 60) + 100).substring(1);
	const formatted = formattedHour + ':' + formattedMinutes;
	return { text: formatted, value: String(seconds) }
})

module.exports = options;