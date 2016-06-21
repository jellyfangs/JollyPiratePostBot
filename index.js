var restify = require('restify')
var builder = require('botbuilder')

// setup restify server
var server = restify.createServer()
server.use(restify.queryParser())

// create bot and add dialogs
var bot = new builder.BotConnectorBot({
	appId: '',
	appSecret: ''
})

// hello world
server.get('/', function (req, res) {
	var hello = "hello world"
	res.send(hello)
})

// run server
server.listen(3978, function () {
	console.log('%s listening to %s', server.name, server.url)
})
