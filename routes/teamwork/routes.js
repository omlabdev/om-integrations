const express = require('express');
const router = express.Router();
const superagent = require('superagent');
const { log } = require('./../../utils/logger');
const Endpoints = require('./../../conf/services-endpoints');
const getIntegrationWithId = require('../../utils/get_integration');

router.get('/', function(res,res) { res.sendStatus(200); });
router.post('/webhook/:integrationId', webhook);

module.exports = router;


function webhook(req, res) {
	log('info', 'teamwork-webhook', JSON.stringify(req.body));

	const { id, name, priority, status, tags, projectId, description } = req.body.task;
	const listName = req.body.taskList.name;

	if (status !== "new") {
		log('info', 'teamwork-webhook-status', 'Status is NOT new. Status = ' + status + '. FINISHING HERE');
		return;
	}

	const integrationId = req.params.integrationId;
	const auth = Endpoints.authToken();
	getIntegrationWithId(integrationId, auth, (error, integration) => {
		if (error) {
			return log('error', 'teamwork-get-integration-response', JSON.stringify(error));
		}

		// get project _id
		const mappingKey = projectId.toString();
		const project = integration.mappings[mappingKey];
		if (!project) {
			return log('error', 'teamwork-integration-mapping-missing', 'Mapping for project ' + mappingKey + ' does not exist on integration ' + integration._id);
		}

		const site = `https://${integration.meta.account}.teamwork.com`;
		const link = site + '/index.cfm#tasks/' + id;
		const newTask = {
			title : name, 
			description : description ? description : '',
			tags : tags.concat(integration.auto_tags || []),
			project,
			origin : 'teamwork',
			external_url : link,
			external_id : id
		}

		sendNewTask(newTask);
	})
	
	// respond immediately
	res.sendStatus(200);
}

function sendNewTask(task) {
	superagent
		.post(Endpoints.addTask())
		.set('Authorization', Endpoints.authToken())
		.send(task)
		.then(response => response.body)
		.then(body => log('info', 'teamwork-webhook-response', JSON.stringify(body)))
		.catch(error => log('error', 'teamwork-webhook-response', error.message));
}
