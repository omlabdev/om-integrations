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

/**
 * Called when the git hook detects a new push.
 * 
 * Sends a private message to the author's Slack
 * account to offer to enter a new work entry in OM.
 * 
 * @param  {Object} req
 * @param  {Object} res
 */
function onPushReceived(req, res) {
	log('info', 'git-push', JSON.stringify(req.body, null, '\t'));
	res.sendStatus(200); // respond to the caller immediately

	const gitAccount = req.body.actor.username;
	const gitRepo = req.body.repository.name;

	console.log("--- account: " + gitAccount);
	console.log("--- repo: " + gitRepo);
	
	const commitMessages = [];
	req.body.push.changes.forEach(change => {
		change.commits.forEach(commit => {
			commitMessages.push(commit.message); 
		})
	})
	const commitSummary = commitMessages.map(m => '* ' + m).join('\n');

	getSlackUsernameForGitAccount(gitAccount, (error, slackAccount) => {
		if (error) return console.error(error);
		// get slack id from slack username using Slack's API
		getUserIdFromUsername(slackAccount, (error, slackId) => {
			if (error) return console.error(error);
			// send message to user suggesting to add a new work entry
			sendSlackMessageOfferingWorkEntry(slackId, commitSummary);
		})
	})
}

/**
 * Sends a private slack message to the user with the
 * given id offering to add a work entry in OM.
 * 
 * @param  {String} slackId The id of the user in Slack
 */
function sendSlackMessageOfferingWorkEntry(slackId, summary) {
	sendMessage(slackId, {
		text : 'Looks like you just pushed some new code!',
		attachments : JSON.stringify([
			{
				text : summary,
				color : getRandomColor()
			},
			{
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
			}
		])
	}, (error, response) => {
		if (error) return console.error(error);
		if (!response.body.ok) return console.error(response.body.error);
	})
}

/**
 * Returns the slack username for the user with the given
 * git account in OM.
 * 
 * @param  {String}   gitAccount 
 * @param  {Function} cb         (error, slack_account)
 */
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

/**
 * Returns the list of users in OM with all their fields.
 * Uses the git account in OM to authenticate to OM.
 * 
 * @param  {String} username This users' git username in OM
 * @return {Promise}          
 */
function getUsers(username) {
	return superagent
		.get(Endpoints.getUsers())
		.set('Authorization', Endpoints.gitAuthToken(username))
}