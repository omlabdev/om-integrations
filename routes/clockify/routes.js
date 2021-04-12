const express = require('express');
const router = express.Router();
const superagent = require('superagent');
const { log } = require('./../../utils/logger');
const Endpoints = require('./../../conf/services-endpoints');

router.get('/', (req, res) => { res.sendStatus(200); });
router.post('/webhook/newentry', processNewEntry);

module.exports = router;

function processNewEntry(req, res) {
  console.log(req.body);

  const data = req.body;
  const project = data.project;
  if (project) {
    const user = data.user;
    const start = new Date(data.timeInterval.start);
    const end = new Date(data.timeInterval.end);
    const time = (end - start) / 1000;
    const entryData = {
      project: project.name.toLowerCase(),
      user: user.name.toLowerCase(),
      time: time,
    };
  	superagent
  		.post(Endpoints.clockifyAddEntry())
  		.set('Authorization', Endpoints.authToken())
  		.send(entryData)
  		.then(response => console.log(response.body))
  		.catch(error => log('error', 'clockify-new-entry', error.message));
  }

  res.sendStatus(200);
}
