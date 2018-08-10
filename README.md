# OM - Integrations module
This is the integrations module of OM, a custom-built startup management tool on NodeJS and React. OM helps startups manage the tasks and objectives of the team, as well as billing and alarms. 
This module integrates OM with *Slack*, *Trello*, *Teamwork* and *Email*.

Note: Some integrations use third-party services like [IFTTT](https://ifttt.com) and [Zapier](https://zapier.com).

Note: No database needed for this module.

# Installation
The following installation sequence explains how to set it up on Heroku, but feel free to use any server provider you want.

1. [Create a new Heroku app](https://devcenter.heroku.com/articles/creating-apps)

2. [Set up the following environment variables on the newly created Heroku app](https://devcenter.heroku.com/articles/config-vars#managing-config-vars):
    * `OM_SERVICES_URL`: URL of your installation of OM - Services module in the form `https://some-url.com:3000`
    * `OM_API_VERSION`: Use `1.0`
    * `SLACK_APP_TOKEN`: The app token provided by Slack when you create an app. (`xoxp-0000000-0000000000-0000000000000-...`)
    * `SLACK_BOT_TOKEN`: The bot token provided by Slack when you add a bot to your app. (`xoxb-000000000000-S0SfS...`)
    * `SLACK_CLIENT_ID`: A client token provided by Slack when you create an app (`3098234982349823049823402830abcdefg`)
    * `SLACK_CLIENT_SECRET`: A secret token provided by Slack when you create an app (`3098234982349823049823402830abcdefg`)
    * `INTEGRATION_USER_TOKEN`: The auth token of one user in the OM database to use as integration user. This user will create new tasks coming from the integrations. (`=asdfasdf==:asdfasdf==`)
    * `SLACK_TOKEN`: A made-up token to use when authenticating a Slack user between the integrations module and the services module. (Just make up an ugly string).
    * `GIT_TOKEN`: A made-up token to use when authenticating a Git user between the integrations module and the services module. (Just make up an ugly string).
    * `TRELLO_TOKEN`: A made-up token to use when authenticating a Trello user between the integrations module and the services module. (Just make up an ugly string).
    * `EMAIL_TOKEN`: A made-up token to use when authenticating an Email account user between the integrations module and the services module. (Just make up an ugly string).
    
3. [Add the Heroku git remote to your local repo](https://devcenter.heroku.com/articles/git#creating-a-heroku-remote)

4. [Push the code to Heroku](https://devcenter.heroku.com/articles/git#deploying-code)

# Support
If you get stuck while installing this module or have any questions just hmu at nicolas@on-lab.com
