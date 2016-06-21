var builder = require('botbuilder')

module.exports = {
	root: root
}

// load all dialogs
function root(bot) {
	console.log(bot)
	bot.add('/', new builder.CommandDialog()
		// chat stuff
		.matches('^(hi)', builder.DialogAction.send('hello'))
		.onDefault({
			function (session, args, next) {
				console.log(session)
				builder.DialogAction.send('default')
			}
		})
	)
}