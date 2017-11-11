const express = require('express');
const router = express.Router();
const superagent = require('superagent');
const { log } = require('./../../utils/logger');
const Endpoints = require('./../../conf/services-endpoints');
const getIntegrationWithId = require('../../utils/get_integration');

router.get('/', function(res,res) { res.sendStatus(200); });
router.post('/webhook/task-create/:integrationId', taskCreated);
router.post('/webhook/task-update/:integrationId', taskUpdated);

module.exports = router;

/**
 * TASK.CREATED webhook
 * 
 * @param  {Objecy} req 
 * @param  {Objecy} res 
 */
function taskCreated(req, res) {
	log('info', 'teamwork-webhook-task-create', JSON.stringify(req.body));

	const integrationId = req.params.integrationId;

	// respond immediately
	res.sendStatus(200);

	const auth = Endpoints.authToken();
	getIntegrationWithId(integrationId, auth, (error, integration) => {
		if (error) return log('error', 'teamwork-get-integration-response', JSON.stringify(error));

		const task = getTaskFromRequestBody(req.body, integration);
		if (!task) return;

		onTaskCreatedOrUpdated(task, integration);
	}


	// const integrationId = req.params.integrationId;
	// const auth = Endpoints.authToken();
	// getIntegrationWithId(integrationId, auth, (error, integration) => {
	// 	if (error) {
	// 		return log('error', 'teamwork-get-integration-response', JSON.stringify(error));
	// 	}

	// 	onTaskCreatedOrUpdated(id, integration)

	// 	// get project _id
	// 	const mappingKey = projectId.toString();
	// 	const project = integration.mappings[mappingKey];
	// 	if (!project) {
	// 		return log('error', 'teamwork-integration-mapping-missing', 'Mapping for project ' + mappingKey + ' does not exist on integration ' + integration._id);
	// 	}

	// 	const site = `https://${integration.meta.account}.teamwork.com`;
	// 	const link = site + '/index.cfm#tasks/' + id;
	// 	const newTask = {
	// 		title : name, 
	// 		description : description ? description : '',
	// 		tags : tags.concat(integration.auto_tags || []),
	// 		project,
	// 		origin : 'teamwork',
	// 		external_url : link,
	// 		external_id : id
	// 	}

	// 	sendNewTask(newTask);
	// })
	
}

function getTaskFromRequestBody(body, integration) {
	const { id, name, priority, status, tags, projectId, description } = body.task;
	const listName = body.taskList.name;

	const site = `https://${integration.meta.account}.teamwork.com`;
	const link = site + '/index.cfm#tasks/' + id;

	const mappingKey = projectId.toString();
	const project = integration.mappings[mappingKey];

	if (!project) {
		log('error', 'teamwork-integration-mapping-missing', 'Mapping for project ' 
			+ mappingKey + ' does not exist on integration ' + integration._id);
		return null;
	}
	
	return {
		title : name, 
		description : description ? description : '',
		tags : tags.concat(integration.auto_tags || []),
		origin : 'teamwork',
		external_url : link,
		external_id : id,
		project : project
	}
}

function taskUpdated(req, res) {
	log('info', 'teamwork-webhook-task-update', JSON.stringify(req.body));
	res.sendStatus(200);
}

function onTaskCreatedOrUpdated(taskData, integration) {
	// fetch the task from TW to check whether is complete.
	// if not, check if it is assigned to someone we care
	fetchTaskFromTeamwork(taskData.id, integration, (error, task) => {
		log('info', 'teamwork-fetch-task-response', JSON.stringify(task));

		if (task.completed)
			return log('info', 'teamwork-fetch-task-response', 'Task is already completed');
		
		const assigned = task['responsible-party-ids'] !== undefined;
		if (!assigned) {
			return log('info', 'teamwork-fetch-task-response', 'Task is not assigned to anyone');
		} else {
			log('info', 'teamwork-fetch-task-response', 'Task will be created');
			sendNewTask(taskData);
		}
	})
}

function fetchTaskFromTeamwork(taskId, integration, cb) {
	const { account, token } = integration.meta;
	superagent
		.get(Endpoints.getTeamworkTask(account, token, taskId))
		.end((error, response) => {
			if (error) return cb(error);
			cb(null, response.body['todo-item']);
		})
}

/*
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
*/

function sendNewTask(task) {
	superagent
		.post(Endpoints.addTask())
		.set('Authorization', Endpoints.authToken())
		.send(task)
		.then(response => response.body)
		.then(body => log('info', 'teamwork-webhook-response', JSON.stringify(body)))
		.catch(error => log('error', 'teamwork-webhook-response', error.message));
}
