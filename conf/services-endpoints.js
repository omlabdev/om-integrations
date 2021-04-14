const tokens = require('./tokens');
const moment = require('moment');

const BASE_URL = process.env.OM_SERVICES_URL;
const API_VERSION = process.env.OM_API_VERSION;

module.exports = {
	getAuthToken	: () => `${BASE_URL}/api/${API_VERSION}/users/auth-link`,
	addTask 		: () => `${BASE_URL}/api/${API_VERSION}/tasks/add`,
	getProjects 	: () => `${BASE_URL}/api/${API_VERSION}/projects`,
	getObjectives 	: () => `${BASE_URL}/api/${API_VERSION}/objectives/${getYear()}/${getMonth()}/${getDay()}/all`,
	addWorkEntry	: (objectiveId) => `${BASE_URL}/api/${API_VERSION}/objectives/${objectiveId}/work-entries/add`,
	deleteWorkEntry : (objectiveId, workEntryId) => `${BASE_URL}/api/${API_VERSION}/objectives/${objectiveId}/work-entries/${workEntryId}`,
	getUsers 		: () => `${BASE_URL}/api/${API_VERSION}/users`,
	getIntegrations	: () => `${BASE_URL}/api/${API_VERSION}/admin/integrations`,
	getTasks		: (query) => `${BASE_URL}/api/${API_VERSION}/tasks/1?${toQueryString(query)}`,
	createObjective : () => `${BASE_URL}/api/${API_VERSION}/objectives/add`,

	clockify : () => `${BASE_URL}/api/${API_VERSION}/clockify/work-entries`,
	clockifyAPI : (path) => `https://api.clockify.me/api/v1/${path}`,

	authToken 		: () => `Basic: ${tokens.INTEGRATION_USER_TOKEN}`,
	slackAuthToken  : (username) => `Slack: ${username}:${tokens.SLACK_TOKEN}`,
	gitAuthToken  	: (username) => `Git: ${username}:${tokens.GIT_TOKEN}`,
	trelloAuthToken : (username) => `Trello: ${username}:${tokens.TRELLO_TOKEN}`,
	emailAuthToken  : (email) => `Email: ${email}:${tokens.EMAIL_TOKEN}`,

	slackChatApi	: () => `https://slack.com/api/chat.postMessage?token=${tokens.SLACK_BOT_TOKEN}`,

	getTeamworkTask	: (account, apiUser, taskId) => `https://${apiUser}:xxx@${account}.teamwork.com/tasks/${taskId}.json`,

	getSlackUserIdFromUsername : () => `https://slack.com/api/users.list?token=${tokens.SLACK_BOT_TOKEN}`,
	getSlackChannelIdFromUserId : () => `https://slack.com/api/im.list?token=${tokens.SLACK_BOT_TOKEN}`
}

getYear = () => moment.utc().format('YYYY');
getMonth = () => moment.utc().format('MM');
getDay = () => moment.utc().format('DD');

toQueryString = (obj) => {
	// skip empty or null fields
	const validKeys = Object.keys(obj).filter(k => !!obj[k]);
	return validKeys.map(k => `${encodeURIComponent(k)}=${encodeURIComponent(obj[k])}`).join('&');
}
