const express = require('express');
const router = express.Router();
const superagent = require('superagent');
const { log } = require('./../../utils/logger');
const Endpoints = require('./../../conf/services-endpoints');

router.get('/', (req, res) => { res.sendStatus(200); });
router.post('/webhook', processCreateEntry);
router.put('/webhook', processUpdateEntry);
router.delete('/webhook', processDeleteEntry);

module.exports = router;

function getTime(data) {
  const start = new Date(data.timeInterval.start);
  const end = new Date(data.timeInterval.end);
  return (end - start) / 1000;
}

function processUpdateEntry(req, res) {
  const data = req.body;
  const time = getTime(data);
  superagent
  .put(Endpoints.clockify())
  .set('Authorization', Endpoints.authToken())
  .send({ id: data.id, time: time })
  .then(response => {
    console.log('clockify-update-entry', response.body);
    res.sendStatus(200);
  })
  .catch(error => {
    log('error', 'clockify-update-entry', error.message);
    res.sendStatus(error.status);
  });
}

function processDeleteEntry(req, res) {
  const data = req.body;
  superagent
  .delete(Endpoints.clockify())
  .set('Authorization', Endpoints.authToken())
  .send({ id: data.id })
  .then(response => {
    console.log('clockify-delete-entry', response.body);
    res.sendStatus(200);
  })
  .catch(error => {
    log('error', 'clockify-delete-entry', error.message);
    res.sendStatus(error.status);
  });
}

function processCreateEntry(req, res) {
  const data = req.body;
  const project = data.project;
  // Check if a project was defined
  if (project) {
    const workspaceId = data.workspaceId;
    const time = getTime(data);
    let user = data.user;

    // Get the user so we can get their email
    superagent.get(Endpoints.clockifyAPI(`workspaces/${workspaceId}/users`))
    .set('X-Api-Key', process.env.CLOCKIFY_KEY)
    .query({ name: user.name })
    .then((response) => {
      for (var userData of response.body) {
        if (userData.id === user.id) {
          user = userData;
          break;
        }
      }
      const entryData = {
        id: data.id,
        project: project.name,
        user: user.email,
        title: data.description,
        time: time,
      };
      superagent
      .post(Endpoints.clockify())
      .set('Authorization', Endpoints.authToken())
      .send(entryData)
      .then(response => {
        console.log('clockify-create-entry', response.body);
        res.sendStatus(200);
      })
      .catch(error => {
        log('error', 'clockify-create-entry', error.message);
        res.sendStatus(error.status);
      });
    })
    .catch(error => {
      log('error', 'clockify-api-call', error.message);
      res.sendStatus(error.status);
    });
  } else {
    res.sendStatus(422);
  }
}
