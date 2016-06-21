const restify = require('restify')
const skype = require('skype-sdk')
const builder = require('botbuilder')

// init bot service
const botService = new skype.BotService({
	messaging: {
		botId: "28:1cf878ca-aa71-4e41-9c10-f3be3d5485e0",
		serverUrl: "https://apis.skype.com",
		requestTimeout: 15000,
		appId: "jollypiratebot",
		appSecret: "317362742198435baefca5a2a9007085",
	}
})

// create bot and add dialogs
var bot = new builder.SkypeBot(botService)
bot.add('/', function (session) {
	session.send('hello world')
})

// setup server
const server = restify.createServer()
server.post('/v1/chat', skype.messagingHandler(botService))
server.listen(8080, function () {
	console.log('%s listening to %s', server.name, server.url)
})
