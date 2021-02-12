# OM - Integrations module
This is the integrations module of OM, a custom-built startup management tool on NodeJS and React. OM helps startups manage the tasks and objectives of the team, as well as billing and alarms.
This module integrates OM with *Slack*, *Trello*, *Teamwork* and *Email*.

Note: Some integrations use third-party services like [IFTTT](https://ifttt.com) and [Zapier](https://zapier.com).

Note: No database needed for this module. All data storage is handled by the [Services Module](https://github.com/omlabdev/om-services)

# The full stack
This is one part of a tree-part app.
   * [Frontend Module](https://github.com/omlabdev/om-frontend)
   * [Services Module](https://github.com/omlabdev/om-services)

Note: for this module to work you need to install the [Services Module](https://github.com/omlabdev/om-services).

# Inspiration and history

At [Om Lab](https://omlab.dev) we were struggling to get more peace-of-mind about our billing and our tasks. Some of our founders use the [bullet journal](http://bulletjournal.com) method on notebooks, and we thought we could scale that and adopt it company-wide. That's how the first version of OM was born: just as a tool to keep track of the tasks at hand in a bullet journal kinda style.

At the same time, we were using a small app we wrote to track the hours worked for our different projects. So we decided to move the hour-tracking system into OM, and have it all in one place.

So we started adding some tasks into the system, but reality kicked in: most of our clients would send us tasks through email and teamwork. And moving the tasks manually into OM (and potencially forgetting about one) is not what we call peace-of-mind. So we integrated Teamwork, Email and, why not, Slack, the comm tool we use internally. We don't intend to make OM a task management tool though. Many exist and are more than enough for that. But just having them all in one place, where everyone can see them, assign, and track time, just in ***one*** place no matter the client.

Then our "numbers guys" wanted to see how we were doing in a glance. You know, to add another layer of peace-of-mind. We had the hours worked, the invoices we were sending, and we knew whether or not they're paid. So we combined all that to create an overview of the company, with a yearly and a monthly view. Now our numbers guy has so much more peace of mind and feels in control.

Sometimes we hire people for specific projects, under a freelancing contract. And when we do this is very important to keep a close watch at the ours they work because if they reach a certain point we start loosing money. So we needed another layer of peace of mind for this. And so the alarms were born. Now we can create an alarm that goes off if certain user records more than X amount of hours in a certain project. The freelancers can also go into OM and send us an invoice, which is already pre-filled with the hours they've executed. And when we accept it, it goes straight into the project's expenses. This way we know exactly how much profit we get for each project.

This, and a few more things, is OM. OM is peace... of... mind 🙌. Namaste. 🙏.

# Tech description

This module is built on NodeJS + Express.

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

4. [Push the code to Heroku](https://devcenter.heroku.com/articles/git#deploying-code) (Note: if your pushing from the `dev` branch, do `git push heroku dev:master`)

# Support
If you get stuck while installing this module or have any questions just contact us at hello@omlab.dev
