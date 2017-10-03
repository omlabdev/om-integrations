const tokens = require('./tokens');
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
	getUsers 		: () => `${BASE_URL}/api/${API_VERSION}/users`,

	authToken 		: () => 'Basic: bmljbw==:bmljbw==',
	slackAuthToken  : (username) => `Slack: ${username}:${tokens.SLACK_TOKEN}`,
	gitAuthToken  	: (username) => `Git: ${username}:${tokens.GIT_TOKEN}`,

	slackWebhook	: () => 'https://hooks.slack.com/services/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',
	slackChatApi	: () => `https://slack.com/api/chat.postMessage?token=${tokens.SLACK_APP}`,

	getSlackUserIdFromUsername : () => `https://slack.com/api/users.list?token=${tokens.SLACK_APP}`,
	getSlackChannelIdFromUserId : () => `https://slack.com/api/im.list?token=${tokens.SLACK_APP}`
}

getYear = () => moment.utc().format('YYYY');
getMonth = () => moment.utc().format('MM');
getDay = () => moment.utc().format('DD');