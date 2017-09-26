const express = require('express');
const router = express.Router();
const superagent = require('superagent');
const log = require('./../../utils/logger');
const Endpoints = require('./../../conf/services-endpoints');
const TempConfig = require('./../../conf/tmp');

router.get('/', function(res,res) { res.sendStatus(200); });
router.post('/taskcreated', taskCreated);

module.exports = router;


function taskCreated(req, res) {
	log('info', 'teamwork-taskcreated', JSON.stringify(req.body));
	
	const { project, list, title, description, tags, assignedTo, id, site } = req.body;
	const listAsTag = list.trim().replace(/\s/g, '-').toLowerCase();
	const projectAsTag = project.trim().replace(/\s/g, '-').toLowerCase();
	const link = site + '/index.cfm#tasks/' + id;

	let taskTags = ['p/'+projectAsTag, listAsTag, 'imported'];
	if (tags && tags.length > 0) {
		taskTags = taskTags.concat(tags);
	}

	const newTask = {
		title, 
		description,
		tags : taskTags,
		project : TempConfig.importTestProject, // TODO map from board? same name?
		created_by : TempConfig.importTestUser, // need to map creator by trello username. we should do this on the services project
		origin : 'teamwork',
		external_url : link,
		external_id : id
	}

	superagent
		.post(Endpoints.addTask)
		.send(newTask)
		.set('Authorization', Endpoints.authToken)
		.then(response => response.body)
		.then(body => log('info', 'trello-cardcreated-response', JSON.stringify(body)))
		.catch(error => log('error', 'trello-cardcreated-response', error.message))

	res.sendStatus(200);
}