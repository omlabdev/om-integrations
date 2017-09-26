const express = require('express');
const router = express.Router();
const superagent = require('superagent');
const log = require('./../../utils/logger');
const Endpoints = require('./../../conf/services-endpoints');
const TempConfig = require('./../../conf/tmp');

router.get('/', function(res,res) { res.sendStatus(200); });
router.post('/cardcreated', cardCreated);

module.exports = router;


function cardCreated(req, res) {
	log('info', 'trello-cardcreated', JSON.stringify(req.body));
	
	const { title, description, list, board, creator, cardUrl } = req.body;
	const listAsTag = list.replace(/\s/g, '-').toLowerCase();
	const boardAsTag = board.replace(/\s/g, '-').toLowerCase();

	const newTask = {
		title, 
		description,
		tags : ['trello', 'imported', listAsTag, boardAsTag],
		project : TempConfig.importTestProject, // TODO map from board? same name?
		created_by : TempConfig.importTestUser, // need to map creator by trello username. we should do this on the services project
		origin : 'trello',
		external_url : cardUrl
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