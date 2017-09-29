const express = require('express');
const router = express.Router();
const superagent = require('superagent');
const { log, logRequest } = require('./../../utils/logger');
const Endpoints = require('./../../conf/services-endpoints');
const TempConfig = require('./../../conf/tmp');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/attachments')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
})
let upload = multer({ storage });

router.get('/', function(res,res) { res.sendStatus(200); });
router.post('/newemail', upload.any(), logRequest, emailReceived);

module.exports = router;


function emailReceived(req, res) {
	const { fromEmail, subject, body } = JSON.parse(req.body.data);
	log('info', 'email-newemail', 'Importing email with subject ' + subject);

	// remove Fwd: and Re: from subject to clean it up
	const title = subject.replace(/Fwd:/gi, '').replace(/Re:/gi, '').trim();
	
	const newTask = {
		title : title, 
		description : body,
		tags : ['imported'],
		project : TempConfig.importTestProject, // TODO map from board? same name?
		created_by : TempConfig.importTestUser, // need to map creator by trello username. we should do this on the services project
		origin : 'email'
	}

	if (req.files && req.files.length > 0) {
		const filesUrls = req.files.map(f => '/attachments/' + f.filename);
		newTask.attachments = filesUrls;
	}

	superagent
		.post(Endpoints.addTask)
		.send(newTask)
		.set('Authorization', Endpoints.authToken)
		.then(response => response.body)
		.then(body => log('info', 'email-newemail-response', JSON.stringify(body)))
		.catch(error => log('error', 'email-newemail-response', error.message))

	res.sendStatus(200);
}