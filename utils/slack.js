const superagent = require('superagent');
const Endpoints = require('../conf/services-endpoints');
const tokens = require('../conf/tokens');

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
	superagent
		.get(Endpoints.getSlackChannelIdFromUserId())
		.end((error, response) => {
			if (error) return cb(error);
			const channel = response.body.ims.filter(im => im.user === userId)[0];
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
	superagent
		.get(Endpoints.getSlackUserIdFromUsername())
		.end((error, response) => {
			if (error) return cb(error);
			const user = response.body.members.filter(m => m.name === username)[0];
			cb(null, user.id);
		});
}