const express = require('express');
const router = express.Router();
const { log } = require('./../../utils/logger');
const tokens = require('../../conf/tokens');
const Endpoints = require('./../../conf/services-endpoints');
const superagent = require('superagent');
const { sendMessage, getUserIdFromUsername } = require('../../utils/slack');
const getRandomColor = require('./../../utils/random_color');

router.post('/push', onPushReceived);

module.exports = router;

function onPushReceived(req, res) {
	log('info', 'git-push', JSON.stringify(req.body, null, '\t'));
	res.sendStatus(200); // respond to the caller immediately

	const gitAccount = req.body.username;
	getSlackUsernameForGitAccount(gitAccount, (error, slackAccount) => {
		if (error) return console.error(error);
		// get slack id from slack username using Slack's API
		getUserIdFromUsername(slackAccount, (error, slackId) => {
			if (error) return console.error(error);
			// send message to user suggesting to add a new work entry
			sendSlackMessageOfferingWorkEntry(slackId);
		})
	})
}

function sendSlackMessageOfferingWorkEntry(slackId) {
	sendMessage(slackId, {
		text : 'Looks like you just pushed some new code! Wanna add a work entry?',
		attachments : JSON.stringify([{
			text : 'Add work entry?',
			color : getRandomColor(),
			callback_id : 'work_entry_cta',
			actions : [
				{
					name  : 'yes',
					type  : 'button',
					text  : 'Yeah!',
					value : 'yes'
				},
				{
					name  : 'no',
					type  : 'button',
					text  : 'Nope',
					value : 'no'
				}
			]
		}])
	}, (error, response) => {
		if (error) return console.error(error);
		if (!response.body.ok) return console.error(response.body.error);
	})
}

function getSlackUsernameForGitAccount(gitAccount, cb) {
	getUsers(gitAccount).end((error, response) => {
		if (error) return cb(error);
		// get user slack account from git account
		const _users = response.body.users.filter(u => u.git_account === gitAccount);
		if (_users.length === 0) {
			return console.error('User with git account %s not found', gitAccount);
		}
		const user = _users[0];
		return cb(null, user.slack_account);
	});
}

function getUsers(username) {
	return superagent
		.get(Endpoints.getUsers())
		.set('Authorization', Endpoints.gitAuthToken(username))
}