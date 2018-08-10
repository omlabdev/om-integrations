const express = require('express');
const router = express.Router();
const superagent = require('superagent');
const { log } = require('./../../utils/logger');
const Endpoints = require('./../../conf/services-endpoints');
const getIntegrationWithId = require('../../utils/get_integration');

router.get('/', function(res,res) { res.sendStatus(200); });
router.post('/cardcreated/:integrationId', cardCreated);

module.exports = router;


function cardCreated(req, res) {
	log('info', 'trello-cardcreated', JSON.stringify(req.body));

	const integrationId = req.params.integrationId;
	const { title, description, list, board, creator, cardUrl } = req.body;
	const listAsTag = list.trim().replace(/\s/g, '-').toLowerCase();
	const boardAsTag = board.trim().replace(/\s/g, '-').toLowerCase();

	const auth = Endpoints.trelloAuthToken(creator);
	getIntegrationWithId(integrationId, auth, (error, integration) => {
		if (error) {
			return log('error', 'trello-get-integration-response', JSON.stringify(error));
		}

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
	superagent
		.post(Endpoints.addTask())
		.set('Authorization', Endpoints.trelloAuthToken(username))
		.send(task)
		.then(response => response.body)
		.then(body => log('info', 'trello-cardcreated-response', JSON.stringify(body)))
		.catch(error => log('error', 'trello-cardcreated-response', error.message));
}
