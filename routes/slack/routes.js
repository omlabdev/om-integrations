const express = require('express');
const router = express.Router();
const superagent = require('superagent');
const log = require('./../../utils/logger');
const Endpoints = require('./../../conf/services-endpoints');
const TempConfig = require('./../../conf/tmp');

router.get('/', function(res,res) { res.sendStatus(200); });
router.post('/task', validateToken, createTask);

module.exports = router;

const SLACK_TOKEN = 'w4SggKCqxLSQK6ZvLInBOmUE';

/**
 * Validates that this POST is coming from Slack
 */
function validateToken(req, res, next) {
	if (req.body.token !== SLACK_TOKEN) return res.sendStatus(403);
	next();
}

function createTask(req, res) {
	// log('info', 'slack-createtask', JSON.stringify(req.body));
	console.log(req.body);

	// do slash comand
	const { text, user_name } = req.body;
	const tagsBlockRegex = /\[(.*)\]$/gi; 	// .... [tag1, tag2]
	const matches = tagsBlockRegex.exec(text);
	let tags = [];
	let title = text.trim();

	if (matches && matches.length > 0) {
		title = title.replace(matches[0], '').trim();
		tags = matches[1].split(',').map(t => t.trim());
	}

	const newTask = {
		title, 
		tags : tags.concat(['imported']),
		project : TempConfig.importTestProject, // TODO map from board? same name?
		created_by : TempConfig.importTestUser, // need to map creator by slack username. we should do this on the services project
		origin : 'slack'
	}

	superagent
		.post(Endpoints.addTask)
		.send(newTask)
		.set('Authorization', Endpoints.authToken)
		.then(response => response.body)
		.then(body => {
			log('info', 'slack-createtask-response', JSON.stringify(body))
			// send response to slack
			superagent
				.post(req.body.response_url)
				.send({
					"response_type" : "in_channel",
					"text" : 'Done!'
				})
				.then(response => response.body)
				.then(body => log('info', 'slack-createtask-slackresponse', JSON.stringify(body)))
				.catch(error => log('error', 'slack-createtask-slackresponse', error.message))		
		})
		.catch(error => log('error', 'slack-createtask-response', error.message))


	const formattedTags = tags.map(t => "`"+t+"`").join(" ");
	res.json({
		"response_type" : "in_channel",
	    "text" 			: "Creating task *_" + newTask.title + "_* with tags " + formattedTags + ' for you...'
	});
}