const express = require('express');
const router = express.Router();
const superagent = require('superagent');
const { log } = require('./../../utils/logger');
const Endpoints = require('./../../conf/services-endpoints');
const getIntegrationWithId = require('../../utils/get_integration');

router.get('/', function(res,res) { res.sendStatus(200); });
router.post('/webhook/task-create/:integrationId', taskCreated);
router.post('/webhook/task-update/:integrationId', taskCreated);

module.exports = router;

/**
 * TASK.CREATED webhook
 * 
 * @param  {Objecy} req 
 * @param  {Objecy} res 
 */
function taskCreated(req, res) {
	log('info', 'teamwork-webhook', JSON.stringify(req.body));

	// respond immediately
	res.sendStatus(200);

	const integrationId = req.params.integrationId;

	const auth = Endpoints.authToken();
	getIntegrationWithId(integrationId, auth, (error, integration) => {
		if (error) return log('error', 'teamwork-get-integration-response', JSON.stringify(error));

		const task = getTaskFromRequestBody(req.body, integration);
		if (!task) return;

		onTaskCreatedOrUpdated(task, integration);
	})	
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

function onTaskCreatedOrUpdated(taskData, integration) {
	console.log('onTaskCreatedOrUpdated()');
	// fetch the task from TW to check whether is complete.
	// if not, check if it is assigned to someone we care
	fetchTaskFromTeamwork(taskData.external_id, integration, (error, task) => {
		if (error) {
			return log('error', 'teamwork-fetch-task-response-1', JSON.stringify(error));
		}

		log('info', 'teamwork-fetch-task-response-2', JSON.stringify(task));
		console.log('ACA');

		if (task.completed)
			return log('info', 'teamwork-webhook-3', 'Task is already completed');

		console.log('ACA 2');
		
		let assigned = task['responsible-party-ids'] !== undefined;
		if (!assigned)
			return log('info', 'teamwork-webhook-4', 'Task is not assigned to anyone');


		console.log('ACA 3');
		
		// split assigned in case there's more than one
		assigned = assigned.split(',').map(u => u.replace(/\s/g, '')).filter(u => u !== '');

		console.log(assigned);

		// update description with the fetched description from TW
		taskData = Object.assign(taskData, {
			title: task.content,
			description: task.description
		})
		
		let mappedUsers = integration.meta['users'];
		// no mapped users to look for. just create
		if (!mappedUsers) return sendNewTask(taskData);

		console.log(mappedUsers);

		// check if the task is assigned to a user we care
		mappedUsers = mappedUsers.split(',').map(u => u.replace(/\s/g, '')).filter(u => u !== '');
		for (var i = 0; i < assigned.length; i++) {
			if (mappedUsers.indexOf(assigned[i]) >= 0)
				return sendNewTask(taskData);
		}

		log('info', 'teamwork-webhook', 'Task is not assigned to any mapped user');
	})
}

/**
 * Fetches the task from TW using the API
 * 
 * @param  {Integer}   taskId      
 * @param  {Object}   integration 
 * @param  {Function} cb          
 */
function fetchTaskFromTeamwork(taskId, integration, cb) {
	const { account, token } = integration.meta;
	const url = Endpoints.getTeamworkTask(account, token, taskId);
	log('info', 'teamwork-fetch-task-from-teamwork', url);
	superagent
		.get(url)
		.end((error, response) => {
			if (error) return cb(error);
			if (!response.body['todo-item']) return cb(new Error('task not found on TW'));
			
			console.log(response);

			cb(null, response.body['todo-item']);
		})
}

/**
 * Sends the task to OM Services
 * 
 * @param  {Object} task
 */
function sendNewTask(task) {
	log('info', 'teamwork-webhook', 'Task will be created or updated');
	superagent
		.post(Endpoints.addTask())
		.set('Authorization', Endpoints.authToken())
		.send(task)
		.then(response => response.body)
		.then(body => log('info', 'teamwork-webhook-response', JSON.stringify(body)))
		.catch(error => log('error', 'teamwork-webhook-response', error.message));
}
