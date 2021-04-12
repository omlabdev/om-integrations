var express = require('express');
var router = express.Router();

var trello = require('./trello/routes');
var teamwork = require('./teamwork/routes');
var email = require('./email/routes');
var slack = require('./slack/routes');
var git = require('./git/routes');
var clockify = require('./clockify/routes');

router.use('/trello', trello);
router.use('/teamwork', teamwork);
router.use('/email', email);
router.use('/slack', slack);
router.use('/git', git);
router.use('/clockify', clockify);

module.exports = router;
