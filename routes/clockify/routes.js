const express = require('express');
const router = express.Router();
const superagent = require('superagent');
const { log } = require('./../../utils/logger');
const Endpoints = require('./../../conf/services-endpoints');

router.get('/', (req, res) => { res.sendStatus(200); });
router.post('/webhook/newentry', processNewEntry);

module.exports = router;

function processNewEntry(req, res) {
  const data = req.body;
  const project = data.project;
  // Check if a project was defined
  if (project) {
    const workspaceId = data.workspaceId;
    const start = new Date(data.timeInterval.start);
    const end = new Date(data.timeInterval.end);
    const time = (end - start) / 1000;
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
      const email = response.body[0].email;
      const entryData = {
        project: project.name,
        user: user.email,
        title: data.description,
        time: time,
      };
      superagent
      .post(Endpoints.clockifyAddEntry())
      .set('Authorization', Endpoints.authToken())
      .send(entryData)
      .then(response => console.log(response.body))
      .catch(error => log('error', 'clockify-new-entry', error.message));
    })
    .catch(error => log('error', 'clockify-new-entry', error.message));
  }

  res.sendStatus(200);
}
