const express = require('express');
const router = express.Router();
const superagent = require('superagent');
const { log } = require('./../../utils/logger');
const Endpoints = require('./../../conf/services-endpoints');
const TempConfig = require('./../../conf/tmp');
const getRandomColor = require('./../../utils/random_color');
const tokens = require('../../conf/tokens');

router.get('/', function(res,res) { res.sendStatus(200); });
router.post('/slash', flagInteractiveMessage, validateToken, resolveSlashCommand);

module.exports = router;


const usersToSlashCommand = {}

/**
 * When an interactive message action is tapped/selected,
 * the body if the request contains all data inside an 
 * encoded field named *payload*.
 * Here we just flag the message as is_callback to know we
 * need to go fetch the data from the payload.
 * The payload is also decoded into a JS object.
 * 
 * @param  {Object}   req  
 * @param  {Object}   res  
 * @param  {Function} next 
 */
function flagInteractiveMessage(req, res, next) {
	if (req.body.payload) {
		req.is_callback = true;
		req.body.payload = JSON.parse(req.body.payload);
		req.body.token = req.body.payload.token;
	}
	next();
} 

/**
 * Validates that this POST is coming from Slack
 */
function validateToken(req, res, next) {
	if (req.body.token !== tokens.SLACK_TOKEN) return res.sendStatus(403);
	next();
}

/**
 * Main entry point for slash commands.
 * Parses the command and calls the appropiate handler
 * 
 * @param  {Object}   req  
 * @param  {Object}   res  
 * @param  {Function} next 
 */
function resolveSlashCommand(req, res, next) {
	log('info', 'slack-slash-command', JSON.stringify(req.body, null, '\t'));

	if (req.is_callback === true) {
		return resolveCallback(req, res);
	}

	const username = req.body.user_name;
	if (!usersToSlashCommand[username]) usersToSlashCommand[username] = {};

	const command = req.body.text.trim().split(" ")[0].toLowerCase();
	switch (command) {
		case 'task': // creates a new tasl
			return createTask(req, res, next);
		case 'time': // adds a work entry
			return initAddEntryMenu(req, res);
		case 'auth': // get auth link
			return getAuthLink(req, res);
		default: // unknown command
			return unknownCommand(req, res);
	}
}

/**
 * Simple response when no known command is requested
 * @param  {Object} req 
 * @param  {Object} res 
 */
function unknownCommand(req, res) {
	res.json({
		text : "Unknown command"
	})
}


function getAuthLink(req, res) {
	const username = req.body.user_name;
	superagent
		.get(Endpoints.getAuthToken())
		.set('Authorization', Endpoints.slackAuthToken(username))
		.then(response => response.body)
		.then(body => {
			const link = body.link;
			res.json({
				text : link
			})
		})
		.catch(error => {
			log('error', 'get-auth-token-response', error.message);
			sendResponseToSlack(req.body.response_url, error.message);
		});

	res.json({ text : 'Please wait...' })
}

/**
 * When the request is the answer to an interactive message,
 * execute the appropiate handler based on the callback_id
 * 
 * @param  {Object} req 
 * @param  {Object} res 
 * @return {[type]}     
 */
function resolveCallback(req, res) {
	const cb_id = req.body.payload.callback_id;

	switch (cb_id) {
		// one of the option from the new entry menu has
		// been selected
		case 'work_entry_option_chosen':
			return onAddEntryOptionChosen(req, res);

		// the UNDO button of a work entry has been tapped
		case 'undo_last_work_entry':
			return undoLastWorkEntry(req, res);

		// one 'Add new work entry' CTA has been tapped
		case 'work_entry_cta':
			return initAddEntryMenu(req, res);

		default:
			return unknownCommand(req, res);
	}
}

/**
 * Initializes a work entry workflow. The intermediate data is 
 * persisted on a simple in-memory object indexed by username.
 * 
 * @param  {Object} req 
 * @param  {Object} res 
 */
function initAddEntryMenu(req, res) {
	const payload = req.body.payload || req.body;
	const username = payload.user ? payload.user.name : payload.user_name;

	usersToSlashCommand[username]['entry'] = {
		selection : {
			time : null,
			objective : null
		},
		options : { 
			objective : null,
			time : require('./time_options') 
		},
		response : null, // om-services responso to undo operation
		original_message : null // completed on first interaction
	}

	showAddEntryMenu(req, res);
}

/**
 * Returns a response to slack with the 2 combos: one to choose
 * an objective and another one to choose how much time is to
 * be added.
 * 
 * The objectives have to be retrieved from om-services. Once they're
 * fetched we call this funcition again to continue the rendering.
 * 
 * @param  {Object} req 
 * @param  {Object} res 
 */
function showAddEntryMenu(req, res) {
	const payload = req.body.payload || req.body;
	const username = payload.user ? payload.user.name : payload.user_name;
	const data = usersToSlashCommand[username]['entry'];

	if (data.options.objective === null) {
		// go fetch the objectives and then try again this function
		fetchObjectivesForUsername(username)
			.then(objectives => {
				data.options.objective = objectives;
				showAddEntryMenu(req, res); // show again)
			})
			.catch(error => {
				log('error', 'slack-objectivessmenu-response', error.message);
				sendResponseToSlack(req.body.response_url, error.message);
			});

		res.json({ text : 'Please wait...' });
	}
	else {
		renderAddEntryMenuWithOptions(data.options, data.selection, res);
	}
}

/**
 * Renders (by sending a JSON to slack) the new work entry menu.
 * The menu consists on two combos: one for objectives and one for
 * time.
 *
 * Every time the user selects one of the two, this function is 
 * called with the options to display and the selected values so
 * they can be re-render into Slack.
 * 
 * @param  {Array} options   
 * @param  {Array} selection 
 * @param  {Object} res       
 */
function renderAddEntryMenuWithOptions(options, selection, res) {
	const attachments = [{
		text: 'Choose an objective and how much time to add',
		color : getRandomColor(),
		callback_id: 'work_entry_option_chosen',
		actions: [
			{
				name : 'objective',
				type : 'select',
				options : options.objective,
				selected_options : selection.objective ? [selection.objective] : []
			},
			{
				name : 'time',
				type : 'select',
				options : options.time,
				selected_options : selection.time ? [selection.time] : []
			}
		]
	}];
	// send response to slack
	res.json({
		response_type: 'in_channel',
		text : "Choose an objective and time",
		attachments : attachments
	})
}

/**
 * Fetches today objectives for the given slack username.
 * Returns a promise that resolves with a flattened list
 * of objectives.
 * 
 * @param  {String} username
 * @return {Promise}         
 */
function fetchObjectivesForUsername(username) {
	return superagent
		.get(Endpoints.getObjectives())
		.set('Authorization', Endpoints.slackAuthToken(username))
		.then(response => response.body)
		.then(body => body.objectives)
		.then(objectivesByLevel => {
			// flatten
			const objectives = [];
			['day','month','year'].forEach(level => {
				objectivesByLevel[level].forEach(o => {
					objectives.push({
						text : o.title,
						value : o._id
					});
				})
			})
			return objectives;
		})
}

/**
 * This function is called when the user selects either time or
 * objective from the new work entry menu.
 *
 * If the user has selected a value for both options, the work
 * entry is added and a success message is rendered. If not,
 * the value is added to the in-memory storage and the menu is
 * re-rendered again.
 * 
 * @param  {Object} req
 * @param  {Object} res 
 */
function onAddEntryOptionChosen(req, res) {
	const username = req.body.payload.user.name;
	const data = usersToSlashCommand[username]['entry'];

	// store original message to prevent future undos.
	if (!data.original_message) 
		data.original_message = req.body.payload.original_message;

	const selectedField = req.body.payload.actions[0].name;
	const value =  req.body.payload.actions[0].selected_options[0].value;
	const text = data.options[selectedField].filter(e => e.value === value)[0].text;

	// store selected value in in-memory storage
	data.selection[selectedField] = { value, text };

	// if user hasn't selected all values yet, keep rendering the menu
	if (!data.selection.time || !data.selection.objective) {
		return showAddEntryMenu(req, res);
	}

	// once the user has selected both values, add the new work entry
	doAddNewWorkEntry(data, username)
		.then(() => {
			// send response to slack
			res.json(getWorkEntryAddedSuccessMessage(data.selection, true));
		})
		.catch(error => {
			log('error', 'add-work-entry-response', error.message);
			sendResponseToSlack(req.body.payload.response_url, error.message);
		})
}

/**
 * Adds the new work entry using om-services work-entry API.
 * Returns a promise.
 * 
 * @param  {Object} data     
 * @param  {String} username 
 * @return {Promise}          
 */
function doAddNewWorkEntry(data, username) {
	const time = parseInt(data.selection.time.value);
	const objectiveId = data.selection.objective.value;
	const workEntry = { time };
	return superagent
		.post(Endpoints.addWorkEntry(objectiveId))
		.set('Authorization', Endpoints.slackAuthToken(username))
		.send(workEntry)
		.then((response) => {
			log('info', 'add-work-entry-response', JSON.stringify(response.body, null, '\t'));
			// save response in case the user want to undo it
			data.response = response.body;
		})
}

/**
 * Returns the JSON to be used when a work entry has been
 * added.
 *
 * Shows an UNDO option to delete the newly-created work entry.
 *
 * This function is useful to interact with the user once
 * the work entry has been added. For example, if the user
 * decides to undo the operation.
 * 
 * @param  {Object} selection   
 * @param  {Array}  attachments Additional attachments other than UNDO
 * @return {Object}             The JSON response
 */
function getWorkEntryAddedSuccessMessage(selection, attachments = []) {
	const time = parseInt(selection.time.value);
	const objectiveTitle = selection.objective.text;
	return {
		text : ':heavy_check_mark: Work entry added',
		attachments : [{
			title : 'You\'ve registered ' + getFormattedTimeFromSeconds(time) + 'hrs for "' + objectiveTitle + '"',
			callback_id : 'undo_last_work_entry',
			color : getRandomColor(),
			actions : [{
				name : 'undo',
				text : ':no_entry_sign: Undo',
				type : 'button',
				value : 'undo'
			}]
		}].concat(attachments)
	}
}

/**
 * Returns the seconds formatted as HH:MM
 * 
 * @param  {Number} seconds
 * @return {String}        
 */
function getFormattedTimeFromSeconds(seconds) {
	return Math.floor(seconds/3600) + ":" + ((seconds%3600)/60);;
}

/**
 * Removes the newly-added work entry. Only goes thru if the
 * work entry to be deleted is the last one added by the user.
 * 
 * In any other case a message is returned and added to the
 * original success message under the UNDO button.
 * 
 * @param  {Object} req
 * @param  {Object} res 
 * @return {[type]}     
 */
function undoLastWorkEntry(req, res) {
	const username = req.body.payload.user.name;
	const data = usersToSlashCommand[username]['entry'];

	if (req.body.payload.original_message.ts !== data.original_message.ts) {
		return res.json(getWorkEntryAddedSuccessMessage(data.selection, [{
			title : 'Sorry, you can only undo your last entry',
			color : getRandomColor()
		}]));
	}

	const objectiveId = data.selection.objective.value;
	const workEntryId = data.response._id;
	superagent
		.delete(Endpoints.deleteWorkEntry(objectiveId, workEntryId))
		.set('Authorization', Endpoints.slackAuthToken(username))
		.then(response => {
			log('info', 'delete-work-entry-response', JSON.stringify(response.body, null, '\t'));
			res.json({
				text : ':heavy_check_mark::heavy_check_mark: Work entry deleted'
			})
		})
		.catch(error => {
			log('error', 'delete-work-entry-response', error.message);
			sendResponseToSlack(req.body.payload.response_url, error.message);
		})
}

/**
 * Adds a new task to OM.
 * 
 * @param  {Object} req 
 * @param  {Object} res 
 */
function createTask(req, res) {
	log('info', 'slack-createtask', JSON.stringify(req.body));

	// do slash comand
	const { text, user_name } = req.body;
	const tagsBlockRegex = /\[(.*)\]$/gi; 	// .... [tag1, tag2]
	const matches = tagsBlockRegex.exec(text);
	let tags = [];
	let title = text.replace(/^task\s/i, '').trim();

	if (matches && matches.length > 0) {
		title = title.replace(matches[0], '').trim();
		tags = matches[1].split(',').map(t => t.trim());
	}

	const newTask = {
		title, 
		tags : tags.concat(['imported']),
		project : TempConfig.importTestProject, // TODO map from board? same name?
		created_by : TempConfig.importTestUser, // need to map creator by slack username. we should do this on the services project
		origin : 'slack'
	}

	superagent
		.post(Endpoints.addTask())
		.send(newTask)
		.set('Authorization', Endpoints.authToken())
		.then(response => response.body)
		.then(body => {
			log('info', 'slack-createtask-response', JSON.stringify(body));
			// send response to slack
			sendResponseToSlack(req.body.response_url, 'Done!');
		})
		.catch(error => {
			log('error', 'slack-createtask-response', error.message);
			sendResponseToSlack(req.body.response_url, error.message);
		})

	const formattedTags = tags.map(t => "`"+t+"`").join(" ");
	let responseText = "Creating task *_" + newTask.title + "_*";
	if (tags.length > 0) responseText += " with tags " + formattedTags;

	res.json({
		"response_type" : "in_channel",
	    "text" 			: responseText
	});
}

/**
 * Sends an async response to slack
 * 
 * @param  {String} url  Response URL
 * @param  {String} text Response text
 */
function sendResponseToSlack(url, text, attachments = []) {
	superagent
		.post(url)
		.send({
			"response_type" : "in_channel",
			"text" : text,
			attachments
		})
		.then(response => response.body)
		.then(body => log('info', 'slack-slackresponse', JSON.stringify(body)))
		.catch(error => {
			log('error', 'slack-slackresponse', error.message)
			console.error(error);
		})
}