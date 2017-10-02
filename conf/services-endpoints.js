const slackConf = require('./slack');
const moment = require('moment');

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
	getAuthToken	: () => `${BASE_URL}/api/${API_VERSION}/users/auth-link`,
	addTask 		: () => `${BASE_URL}/api/${API_VERSION}/tasks/add`,
	getProjects 	: () => `${BASE_URL}/api/${API_VERSION}/projects`,
	getObjectives 	: () => `${BASE_URL}/api/${API_VERSION}/objectives/${getYear()}/${getMonth()}/${getDay()}/all`,
	addWorkEntry	: (objectiveId) => `${BASE_URL}/api/${API_VERSION}/objectives/${objectiveId}/work-entries/add`,
	deleteWorkEntry : (objectiveId, workEntryId) => `${BASE_URL}/api/${API_VERSION}/objectives/${objectiveId}/work-entries/${workEntryId}`,

	authToken 		: () => 'Basic: bmljbw==:bmljbw==',
	slackAuthToken  : (username) => `Slack: ${username}:${slackConf.APP_TOKEN}`
}

getYear = () => moment.utc().format('YYYY');
getMonth = () => moment.utc().format('MM');
getDay = () => moment.utc().format('DD');