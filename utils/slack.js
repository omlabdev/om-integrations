const superagent = require('superagent');
const Endpoints = require('../conf/services-endpoints');
const tokens = require('../conf/tokens');
const { log } = require('./logger');

/**
 * Sends a message to the given user id (as a private
 * message).
 * 
 * @param  {String}   userId  The slack user id
 * @param  {Object}   message Extends the basic message
 * @param  {Function} cb      (error, response)
 */
exports.sendMessage = function(userId, message, cb) {
	getChannelIdForUserId(userId, (error, channelId) => {
		const body = Object.assign({
			token : tokens.SLACK_BOT_TOKEN,
			channel : channelId,
			as_user : true 
		}, message);
		superagent
			.post(Endpoints.slackChatApi())
			.type('form')
			.send(body)
			.end(cb);
	})
}

/**
 * Fetches the channel Id of the private conversation with
 * the given user id in Slack.
 * 
 * @param  {String}   userId 
 * @param  {Function} cb     (error, channelId)
 */
function getChannelIdForUserId(userId, cb) {
	log('info', 'getChannelIdForUserId()', userId);
	superagent
		.get(Endpoints.getSlackChannelIdFromUserId())
		.end((error, response) => {
			if (error) return cb(error);
			const channels = response.body;
			log('info', 'slack-get-channels-response', JSON.stringify(channels));
			const channel = channels.ims.filter(im => im.user === userId)[0];
			return cb(null, channel.id);
		})
}

/**
 * Fetches the Slack's user id for the given username
 * 
 * @param  {String}   username 
 * @param  {Function} cb       (error, userId)
 */
exports.getUserIdFromUsername = function(username, cb) {
	log('info', 'getUserIdFromUsername()', username);
	superagent
		.get(Endpoints.getSlackUserIdFromUsername())
		.end((error, response) => {
			if (error) return cb(error);
			const members = response.body.members;
			log('info', 'slack-get-users-response', JSON.stringify(members));
			const user = members.filter(m => m.name === username)[0];
			log('info', 'member', JSON.stringify(user));
			cb(null, user.id);
		});
}