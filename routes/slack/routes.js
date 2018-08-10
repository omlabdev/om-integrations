const express = require('express');
const router = express.Router();
const superagent = require('superagent');
const { log } = require('./../../utils/logger');
const Endpoints = require('./../../conf/services-endpoints');
const getRandomColor = require('./../../utils/random_color');
const tokens = require('../../conf/tokens');
const getIntegrationWithId = require('../../utils/get_integration');

router.get('/', function(res,res) { res.sendStatus(200); });
// router.get('/auth', auth);
router.post('/slash/:integrationId', validateToken, resolveSlashCommand);
router.post('/callback/:integrationId', parsePayload, validateToken, resolveCallback);

module.exports = router;

const usersToSlashCommand = {}


/**
 * When an interactive message is sent, the body contains just
 * a json encoded string with all data under the key 'payload'.
 * Here we decode it and assigns it to the req.body object.
 * 
 * @param  {Object}   req 
 * @param  {Object}   res 
 * @param  {Function} next
 */
function parsePayload(req, res, next) {
	req.body = JSON.parse(req.body.payload);
	next();
}

/**
 * Validates that this POST is coming from Slack
 */
function validateToken(req, res, next) {
	if (process.env.NODE_ENV !== 'production') next();

	const token = req.body.token;
	if (token !== tokens.SLACK_TOKEN) return res.sendStatus(403);
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

	const command = req.body.text.trim().split(" ")[0].toLowerCase();
	switch (command) {
		case 'task': // creates a new task
			return initCreateTask(req, res, next);
		case 'time': // adds a work entry
			return initAddEntryMenu(req, res);
		case 'auth': // get auth link
			return getAuthLink(req, res);
		case 'objective': // create objective
			return initCreateObjective(req, res, next);
		default: // unknown command
			return unknownCommand(req, res);
	}
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
	const cb_id = req.body.callback_id;

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

		// project selected for new task
		case 'add_task_project_selected':
			return createTaskOnProjectSelected(req, res);

		case 'objective_option_chosen':
			return onCreateObjectiveOptionChosen(req, res);

		default:
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

/**
 * Shows the create objective menu with a projects combo
 * and a tasks combo that loads based on the selected project
 * 
 * @param  {Object} req 
 * @param  {Object} res 
 */
function initCreateObjective(req, res) {
	const username = req.body.user_name;
	const response_url = req.body.response_url;

	if (!usersToSlashCommand[username]) // init if not exists
		usersToSlashCommand[username] = {};

	// respond fast in the meantime...
	res.json({ text : 'Please wait...', "response_type" : "in_channel" });

	usersToSlashCommand[username]['objective'] = {
		selection : {
			project : null,
			task : null
		},
		options : { 
			project : null,
			task : null
		}
	}

	showCreateObjectiveMenu(req, res);
}

/**
 * Returns a response to slack with initially 1 combo to choose
 * a project, and after a project is chosen shows another one
 * containing available tasks.
 * 
 * The projects and tasks have to be retrieved from om-services. 
 * Once they're fetched we call this funcition again to continue 
 * the rendering.
 * 
 * @param  {Object} req 
 * @param  {Object} res 
 */
function showCreateObjectiveMenu(req, res) {
	const payload = req.body;
	const username = payload.user ? payload.user.name : payload.user_name;
	const response_url = payload.response_url;
	const data = usersToSlashCommand[username]['objective'];

	if (data.options.project === null) {
		// go fetch the projects and then try again this function
		return fetchProjects(username, (error, projects) => {
			if (error) return sendResponseToSlack(response_url, { text: error.message });
			data.options.project = projects.map(p => {return { text: p.name, value: p._id }});
			showCreateObjectiveMenu(req, res); // show again
		})
	}
	else if (data.selection.project && data.options.task === null) {
		// go fetch the tasks for the selected project and try
		// again this function
		return fetchTasksForProject(data.selection.project.value, username, (error, tasks) => {
			if (error) return sendResponseToSlack(response_url, { text: error.message });
			data.options.task = tasks.map(t => {return { text: t.title, value: t._id }});
			showCreateObjectiveMenu(req, res); // show again
		})		
	}
	else {
		renderCreateObjectiveMenuWithOptions(data.options, data.selection, response_url);
	}
}

/**
 * Renders (by sending a JSON to slack) the new objective menu.
 * The menu consists on two combos: one for rojects and one for
 * tasks.
 *
 * When the user selects the project, the tasks are loaded with
 * tasks belonging to that project.
 * 
 * @param  {Array} options   
 * @param  {Array} selection 
 * @param  {Object} res       
 */
function renderCreateObjectiveMenuWithOptions(options, selection, response_url) {
	const actions = [{
		name : 'project',
		type : 'select',
		options : options.project,
		selected_options : selection.project ? [selection.project] : []
	}]
	if (selection.project !== null) { // if project selected, show tasks combo
		actions.push({
			name : 'task',
			type : 'select',
			options : options.task,
			selected_options : selection.task ? [selection.task] : []
		});
	}
	if (selection.task !== null) { // if everything has been selected, show create button
		actions.push({
			name : 'create',
			type : 'button',
			text : 'Create objective',
			value : 'create'
		});
	}
	const attachments = [{
		text: 'Choose a project',
		color : getRandomColor(),
		callback_id: 'objective_option_chosen',
		actions
	}];
	// send response to slack
	sendResponseToSlack(response_url, { text: "Let's create your new objective", attachments });
}

/**
 * This function is called when the user selects either a project or
 * a task from the new objective menu.
 *
 * If the user has selected a value for both options, the objective
 * objective is created and a success message is rendered. If not,
 * the value is added to the in-memory storage and the menu is
 * re-rendered again.
 * 
 * @param  {Object} req
 * @param  {Object} res 
 */
function onCreateObjectiveOptionChosen(req, res) {
	const username = req.body.user.name;
	const data = usersToSlashCommand[username]['objective'];
	const response_url = req.body.response_url;

	// respond fast in the meantime...
	res.json({ text : 'Please wait...', "response_type" : "in_channel" });

	const selectedField = req.body.actions[0].name;

	// if create button has been clicked, create task and
	// finish process
	if (selectedField === 'create') {
		return createObjective(data.selection.task.value, username, response_url);
	}

	const value =  req.body.actions[0].selected_options[0].value;
	const text = data.options[selectedField].filter(e => e.value === value)[0].text;

	// store selected value in in-memory storage
	data.selection[selectedField] = { value, text };

	// if project was selected, reset tasks
	if (selectedField === 'project') {
		data.options.task = null;
		data.selection.task = null;
	}

	return showCreateObjectiveMenu(req, res);
}

function createObjective(taskId, username, response_url) {
	superagent
		.post(Endpoints.createObjective())
		.set('Authorization', Endpoints.slackAuthToken(username))
		.send({
			related_task 	: taskId,
			level 		 	: 'day',
			objective_date 	: Date.now()
		})
		.then(() => {
			sendResponseToSlack(response_url, { text: ':heavy_check_mark: Objective created' });
		})
		.catch((error) => {
			log('error', 'slack-create-objective-response', error.message);
			sendResponseToSlack(response_url, { text: error.message });
		})
}

/**
 * Responds the command with the auth link the user
 * should use to access OM.
 * 
 * @param  {Object} req
 * @param  {Object} res
 */
function getAuthLink(req, res) {
	const username = req.body.user_name;
	const response_url = req.body.response_url;
	superagent
		.get(Endpoints.getAuthToken())
		.set('Authorization', Endpoints.slackAuthToken(username))
		.then(response => response.body)
		.then(body => {
			const link = body.link;
			sendResponseToSlack(response_url, { text: link });
		})
		.catch(error => {
			log('error', 'get-auth-token-response', error.message);
			sendResponseToSlack(response_url, { text: error.message });
		});

	// respond immediately
	res.json({ text : 'Please wait...', "response_type" : "in_channel" })
}

/**
 * Initializes a work entry workflow. The intermediate data is 
 * persisted on a simple in-memory object indexed by username.
 *
 * Sends a Please wait message while all the background logic
 * runs.
 * 
 * @param  {Object} req 
 * @param  {Object} res 
 */
function initAddEntryMenu(req, res) {
	const payload = req.body;
	const username = payload.user ? payload.user.name : payload.user_name;

	if (!usersToSlashCommand[username]) // init if not exists
		usersToSlashCommand[username] = {};

	// respond fast in the meantime...
	res.json({ text : 'Please wait...', "response_type" : "in_channel" });

	usersToSlashCommand[username]['entry'] = {
		selection : {
			time : null,
			objective : null
		},
		options : { 
			objective : null,
			time : require('./time_options') 
		},
		response : null, // om-services response to undo operation
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
	const payload = req.body;
	const username = payload.user ? payload.user.name : payload.user_name;
	const response_url = payload.response_url;
	const data = usersToSlashCommand[username]['entry'];

	if (data.options.objective === null) {
		// go fetch the objectives and then try again this function
		return fetchObjectivesForUsername(username, (error, objectives) => {
			if (error) {
				log('error', 'slack-objectives-menu-response', error.message);
				return sendResponseToSlack(response_url, { text: error.message });
			}
			data.options.objective = objectives;
			return showAddEntryMenu(req, res); // show again
		})
	}
	else {
		renderAddEntryMenuWithOptions(data.options, data.selection, response_url);
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
function renderAddEntryMenuWithOptions(options, selection, response_url) {
	const attachments = [{
		text: 'Choose an objective and how much time to add:',
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
	sendResponseToSlack(response_url, { text: "Let's create your work entry", attachments });
}

/**
 * Fetches today objectives for the given slack username.
 * Returns a promise that resolves with a flattened list
 * of objectives.
 * 
 * @param  {String} username
 * @return {Promise}         
 */
function fetchObjectivesForUsername(username, cb) {
	return superagent
		.get(Endpoints.getObjectives())
		.set('Authorization', Endpoints.slackAuthToken(username))
		.end((error, response) => {
			if (error) return cb(error);
			const objectivesByLevel = response.body.objectives;
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
			return cb(null, objectives);
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
	const username = req.body.user.name;
	const data = usersToSlashCommand[username]['entry'];
	const response_url = req.body.response_url;

	log('info', 'slack-add-entry-option-slected', JSON.stringify(req.body));

	// respond fast in the meantime...
	res.json({ text : 'Please wait...', "response_type" : "in_channel" });

	// store original message to prevent future undos.
	if (!data.original_message) 
		data.original_message = req.body.original_message;

	const selectedField = req.body.actions[0].name;
	const value =  req.body.actions[0].selected_options[0].value;
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
			sendResponseToSlack(response_url,
				getWorkEntryAddedSuccessMessage(data.selection, true));
		})
		.catch(error => {
			log('error', 'add-work-entry-response', error.message);
			sendResponseToSlack(response_url, { text: error.message });
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
	const username = req.body.user.name;
	const data = usersToSlashCommand[username]['entry'];
	const response_url = req.body.response_url;

	if (req.body.original_message.ts !== data.original_message.ts) {
		return res.json(getWorkEntryAddedSuccessMessage(data.selection, [{
			title : 'Sorry, you can only undo your last entry',
			color : getRandomColor()
		}]));
	}

	// responde immediately
	res.json({ text: 'Please wait...', "response_type" : "in_channel" });

	const objectiveId = data.selection.objective.value;
	const workEntryId = data.response._id;
	superagent
		.delete(Endpoints.deleteWorkEntry(objectiveId, workEntryId))
		.set('Authorization', Endpoints.slackAuthToken(username))
		.then(response => {
			log('info', 'delete-work-entry-response', JSON.stringify(response.body, null, '\t'));
			sendResponseToSlack(response_url, {
				text : ':heavy_check_mark::heavy_check_mark: Work entry deleted'
			})
		})
		.catch(error => {
			log('error', 'delete-work-entry-response', error.message);
			sendResponseToSlack(response_url, { text: error.message });
		})
}

/**
 * Adds a new task to OM.
 * 
 * @param  {Object} req 
 * @param  {Object} res 
 */
function initCreateTask(req, res) {
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

	const newTask = { title, tags, origin : 'slack' };

	// add task infomation to on-memory temp storage
	if (!usersToSlashCommand[user_name]) usersToSlashCommand[user_name] = {};
	usersToSlashCommand[user_name]['create-task'] = {
		task : newTask
	}

	// respond immediately
	// create a base response text
	const formattedTags = tags.map(t => "`"+t+"`").join(" ");
	let responseText = "Creating task *_" + newTask.title + "_*";
	if (tags.length > 0) responseText += " with tags " + formattedTags;
	res.json({
		"response_type" : "in_channel",
	    "text" 			: responseText
	});

	// fetch projects and show combo to select one
	showProjectSelection(req.body.response_url, responseText, user_name);
}

/**
 * Fetches the available list of projects from ON and
 * sends back to slack the message and a combo to select
 * a project.
 * 
 * @param  {String} response_url 
 * @param  {String} responseText Main message
 */
function showProjectSelection(response_url, responseText, username) {
	fetchProjects(username, (error, projects) => {
		if (error) return sendResponseToSlack(response_url, { text: error.message });
		sendResponseToSlack(response_url, {
			text : '',
			"attachments"   : [{
				text: 'Choose a project',
				color : getRandomColor(),
				callback_id: 'add_task_project_selected',
				actions: [{
					name : 'project',
					type : 'select',
					options : projects.map(p => { return { text: p.name, value: p._id } })
				}]
			}]
		})
	})
}

/**
 * Fetches projects from OM
 *
 * @param  {String} username 
 * @param  {Function} cb (error, projects)
 */
function fetchProjects(username, cb) {
	log('info', 'slack-request-fetch-projects', 'username: ' + username);
	superagent
		.get(Endpoints.getProjects())
		.set('Authorization', Endpoints.slackAuthToken(username))
		.end((error, response) => {
			log('info', 'slack-response-fetch-projects', JSON.stringify({error, response}));
			if (error) {
				log('error', 'slack-get-projects-response', error.message);
				return cb(error);
			}
			return cb(null, response.body.projects);
		})
}

/**
 * Fetches tasks for the project with the given id
 * from OM
 *
 * @param  {String} pid Project id
 * @param  {String} username 
 * @param  {Function} cb (error, tasks)
 */
function fetchTasksForProject(pid, username, cb) {
	const query = { project : pid };
	superagent
		.get(Endpoints.getTasks(query))
		.set('Authorization', Endpoints.slackAuthToken(username))
		.end((error, response) => {
			if (error) {
				log('error', 'slack-get-tasks-response', error.message);
				return cb(error);
			}
			return cb(null, response.body.tasks);
		})
}

/**
 * Callback to create a new task after a project has been 
 * selected.
 * 
 * @param  {Object} req 
 * @param  {Object} res 
 */
function createTaskOnProjectSelected(req, res) {
	const payload = req.body;
	const username = payload.user.name;
	const selectedProject = payload.actions[0].selected_options[0].value;
	const data = usersToSlashCommand[username]['create-task'];
	
	const integrationId = req.params.integrationId;
	const auth = Endpoints.slackAuthToken(username);
	getIntegrationWithId(integrationId, auth, (error, integration) => {
		if (error) {
			return log('error', 'slack-get-integration-response', JSON.stringify(error));
		}

		const newTask = Object.assign(data.task, {
			tags 	: data.task.tags.concat(integration.auto_tags || []),
			project : selectedProject
		});

		sendNewTask(newTask, username, payload.response_url);
	});

	// respond immediately
	res.json({ "text": "Creating task..." });
}

/**
 * Creates a new task in OM and sends result back to slack
 * 
 * @param  {Object} task         
 * @param  {String} username     
 * @param  {String} response_url 
 */
function sendNewTask(task, username, response_url) {
	superagent
		.post(Endpoints.addTask())
		.set('Authorization', Endpoints.slackAuthToken(username))
		.send(task)
		.then(response => response.body)
		.then(body => {
			log('info', 'slack-createtask-response', JSON.stringify(body));
			// send response to slack
			sendResponseToSlack(response_url, { text: 'Task created' });
		})
		.catch(error => {
			log('error', 'slack-createtask-response', error.message);
			sendResponseToSlack(response_url, { text: error.message });
		})
}

/**
 * Sends an async response to slack
 * 
 * @param  {String} url  Response URL
 * @param  {String} text Response text
 */
function sendResponseToSlack(url, body) {
	const message = Object.assign({}, {
		"response_type" : "in_channel",
	}, body);

	superagent
		.post(url)
		.send(message)
		.then(response => response.body)
		.then(body => log('info', 'slack-slackresponse', JSON.stringify(body)))
		.catch(error => {
			log('error', 'slack-slackresponse', error.message)
			console.error(error);
		})
}