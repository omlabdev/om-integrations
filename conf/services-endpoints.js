let BASE_URL;
let API_VERSION;

if (process.env.NODE_ENV === 'production') {
	BASE_URL = 'https://om-services.herokuapp.com';
	API_VERSION = '1.0';
} else {
	BASE_URL = 'http://localhost:3000';
	API_VERSION = '1.0';
}


module.exports = {
	addTask 	: `${BASE_URL}/api/${API_VERSION}/tasks/add`,

	authToken 	: 'Basic: bmljbw==:bmljbw=='
}