module.exports = {

	/* slack app tokens used with Slack's API */

	SLACK_APP_TOKEN	: process.env.SLACK_APP_TOKEN, // This is a slack app with a bot

	SLACK_BOT_TOKEN : process.env.SLACK_BOT_TOKEN, // This is a bot within the app

	SLACK_CLIENT_ID	: process.env.SLACK_CLIENT_ID,

	SLACK_CLIENT_SECRET : process.env.SLACK_CLIENT_SECRET,

	/* tokens used to authenticate to OM */

	SLACK_TOKEN 	: process.env.SLACK_TOKEN,

	GIT_TOKEN 		: process.env.GIT_TOKEN,

	TRELLO_TOKEN 	: process.env.TRELLO_TOKEN,

	EMAIL_TOKEN		: process.env.EMAIL_TOKEN // just an ugly random string

}