const superagent = require('superagent');
const Endpoints = require('../conf/services-endpoints');

module.exports = function(integrationId, auth, cb) {
	superagent
		.get(Endpoints.getIntegrations())
		.set('Authorization', auth)
		.end((error, response) => {
			if (error) return cb(error);
			const integrations = response.body.integrations;
			let integration = integrations.filter(i => i._id === integrationId);
			if (integration.length > 0) { 
				return cb(null, integration[0]);
			}
			return cb(new Error('Integration has no project'));
		})
}