const express = require('express');
const router = express.Router();
const superagent = require('superagent');
const { log } = require('./../../utils/logger');
const Endpoints = require('./../../conf/services-endpoints');
const TempConfig = require('./../../conf/tmp');

router.get('/', function(res,res) { res.sendStatus(200); });
router.post('/cardcreated/:integrationId', cardCreated);

module.exports = router;


function cardCreated(req, res) {
	log('info', 'trello-cardcreated', JSON.stringify(req.body));

	const integrationId = req.params.integrationId;
	const { title, description, list, board, creator, cardUrl } = req.body;
	const listAsTag = list.trim().replace(/\s/g, '-').toLowerCase();
	const boardAsTag = board.trim().replace(/\s/g, '-').toLowerCase();

	getIntegrationWithId(integrationId, creator, (error, integration) => {
		if (error) {
			console.log('ERROR IN getIntegrationWithId');
			return log('error', 'trello-get-integration-response', JSON.stringify(error));
		}

		console.log(integration);

		const newTask = {
			title, 
			tags : integration.auto_tags, // todo templating to include list
			project : integration.mappings.project,
			origin : 'trello',
			external_url : cardUrl
		}

		if (description && description.trim() !== '') {
			newTask.description = description;
		}

		sendNewTask(newTask, creator);
	})

	// respond immediately and continue
	res.sendStatus(200);
}

function sendNewTask(task, username) {
	console.log("SENDING NEW TASK");
	superagent
		.post(Endpoints.addTask())
		.set('Authorization', Endpoints.trelloAuthToken(username))
		.send(task)
		.then(response => response.body)
		.then(body => log('info', 'trello-cardcreated-response', JSON.stringify(body)))
		.catch(error => log('error', 'trello-cardcreated-response', error.message));
}

function getIntegrationWithId(integrationId, username, cb) {
	superagent
		.get(Endpoints.getIntegrations())
		.set('Authorization', Endpoints.trelloAuthToken(username))
		.end((error, response) => {
			if (error) return cb(error);
			const integrations = response.body.integrations;
			let integration = integrations.filter(i => i._id === integrationId);
			if (integration.length > 0) { 
				return cb(null, integration[0]);
			}
			return cb(new Error('Integration has no project'));
		})
}