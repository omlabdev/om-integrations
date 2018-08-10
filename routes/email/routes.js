const express = require('express');
const router = express.Router();
const superagent = require('superagent');
const { log, logRequest } = require('./../../utils/logger');
const Endpoints = require('./../../conf/services-endpoints');
const multer = require('multer');
const getIntegrationWithId = require('../../utils/get_integration');

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
router.post('/newemail/:integrationId', upload.any(), emailReceived);

module.exports = router;


function emailReceived(req, res) {
	// get the actual email body information from Zapier here.
	let email = req.body.data || req.body;
	if (email !== null && typeof email !== 'object') {
		email = JSON.parse(email);
	}

	const { fromEmail, subject, body } = email;
	log('info', 'email-newemail', 'Importing email with subject ' + subject + ' from ' + fromEmail);

	// remove Fwd: and Re: from subject to clean it up
	const title = subject.replace(/Fwd:/gi, '').replace(/Re:/gi, '').trim();

	const integrationId = req.params.integrationId;
	const auth = Endpoints.emailAuthToken(fromEmail);
	getIntegrationWithId(integrationId, auth, (error, integration) => {
		if (error) {
			return log('error', 'email-get-integration-response', JSON.stringify(error));
		}

		const newTask = {
			title : title, 
			description : body,
			tags : integration.auto_tags || [],
			project : integration.meta.importProject,
			origin : 'email'
		}

		if (req.files && req.files.length > 0) {
			const filesUrls = req.files.map(f => '/attachments/' + f.filename);
			newTask.attachments = filesUrls;
		}

		sendNewTask(newTask, fromEmail);
	});

	// respond immediately
	res.sendStatus(200);
}

function sendNewTask(task, email) {
	superagent
		.post(Endpoints.addTask())
		.set('Authorization', Endpoints.emailAuthToken(email))
		.send(task)
		.then(response => response.body)
		.then(body => log('info', 'email-newemail-response', JSON.stringify(body)))
		.catch(error => log('error', 'email-newemail-response', error.message));
}