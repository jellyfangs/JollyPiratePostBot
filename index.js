var restify = require('restify');
var fs = require('fs')

var builder = require('botbuilder');
var cogs = require('./CSServices')
var imgs = require('./ImgServices')

//=========================================================
// Bot Setup
//=========================================================
  
// Create bot and setup server
var connector = new builder.ChatConnector({
    // appId: process.env.MICROSOFT_APP_ID,
    // appPassword: process.env.MICROSOFT_APP_PASSWORD,
    // stateEndpoint: process.env.STATE_ENDPOINT
	appId: '7bfab6b5-c856-4027-9709-6034e9dbc451',
    appPassword: 'aQBE2rYGN51oXMC2mhqLTxK',
});

// Setup Restify Server
var server = restify.createServer();
server.get('/', function (req, res) {
	res.send('hello i am a chatbot')
});

server.get(/\/files\/?.*/, restify.serveStatic({
    directory: __dirname
}));

server.post('/api/messages', connector.verifyBotFramework(), connector.listen());
server.listen(process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});

var bot = new builder.UniversalBot(connector);

//=========================================================
// ON ADD
//=========================================================


bot.on('contactRelationUpdate', function (message) {
    if (message.action === 'add') {
        var name = message.user ? message.user.name : null;
        var reply = new builder.Message()
                .address(message.address)
                .text("Hello %s... Thanks for adding me! Say 'hi' to see some great demos.", name || 'there');
        bot.send(reply);
    } else {
        // delete their data
    }
});

bot.on('typing', function (message) {
    // User is typing
});

bot.on('deleteUserData', function (message) {
    // User asked to delete their data
});


//=========================================================
// Bots Middleware
//=========================================================

// Anytime the major version is incremented any existign conversations will be restarted.
bot.use(builder.Middleware.dialogVersion({ version: 1.0, resetCommand: /^reset/i }));

//=========================================================
// Bots Dialogs
//=========================================================

bot.dialog('/', [
    function (session) {
        // Send a greeting and start the menu.
        // var card = new builder.HeroCard(session)
        //     .title("")
        //     .text("I can send post")
        //     .images([
        //          builder.CardImage.create(session, "http://docs.botframework.com/images/demo_bot_image.png")
        //     ]);
        // var msg = new builder.Message(session).attachments([card]);
        // session.send(msg);
        session.send("I can send a postcard for you to anywhere. Get started?");
        session.beginDialog('/photo')
        // builder.Prompts.confirm(session);
    },
    function (session, results) {
        if (results && results.resumed == builder.ResumeReason.completed) {
            session.send("You chose '%s'", results.response ? 'yes' : 'no');
            session.beginDialog('/photo')
        } else {
            session.endDialog("Goodbye");
        }
    }
]);

bot.dialog('/spellcheck', [
    function (session) {
        builder.Prompts.text(session, 'tell me something wrong')
    },
    function (session, results) {
        if (results && results.response) {
            cogs.Spellcheck(results.response, function (reply) {
                console.log('RESPONSE FROM SPELLCHECK:', reply)
                // SPELL CHECKS
                if (!reply.error) {
                    if (reply != null) {
                        session.send("You meant to say %s", reply)
                    } else {
                        session.send("You said %s", results.response)
                    }
                } else {
                    session.send("Got an error")
                }
                
                session.replaceDialog('/sentiment')
            })
        }
    }
])


bot.dialog('/sentiment', [
    function (session) {
        builder.Prompts.text(session, 'tell me how you feel about an experience')
    },
    function (session, results) {
        if (results && results.response) {
            cogs.Sentiment(results.response, function (reply) {
                console.log('RESPONSE FROM SENTIMENT CHECK:', reply)
                if (!reply.error) {
                        console.log(reply.documents[0].score)
                    if (reply.documents[0].score > 0.5) {
                        session.send("Sounds awesome! I am very glad for you!")
                    } else {
                        session.send("I'm sorry! That doesn't sound very good at all.")
                    }
                } else {
                    session.send("Got an error")
                }
                
                session.endDialog('end')
            })
        }
    }
])


/*

 Welcome to Jolly Pirate Post!

 I can send a postcard for you to anywhere. Get started?

 Give me a photo to work with
 => save attachment - DONE
 => computer vision api - PUSH
 => emotion api - PUSH
 
 Which card do you like?
 => caymanjs
 => carousel

 Tell me a short story about the card!
 => bing spell check api - DONE
 => text analytics api - DONE

 Where will the card go?
 => lob api

 When do you want to send it?
 => prompt time - PUSH

 Great, here you are!
 => receipt - DONE

 Also, use this referral code
 => group chat - PUSH

*/


// ATTACHMENTS
bot.dialog('/photo', [
    function (session) {
        builder.Prompts.attachment(session, "Give me a photo to work with.");
    },
    function (session, results) {
        if (results && results.response) {
            var msg = new builder.Message(session)
                .ntext("I got %d attachment.", "I got %d attachments.", results.response.length);
            results.response.forEach(function (attachment) {
                var options = {
                    method: 'GET',
                    url: attachment.contentUrl,
                    encoding: 'binary',
                };
                connector.authenticatedRequest(options, function (err, response) {
                    fs.writeFile('files/'+options.url.split('/')[5]+'.jpg', response.body, 'binary', function(err) {
                        if (err) throw err
                        console.log('File savd')
                    })
                })
                // imgs.getAttachment(connector.authenticatedRequest, attachment.contentUrl)
                // msg.addAttachment(attachment);
            });
            session.endDialog('That is really cool');
        } else {
            session.endDialog("You canceled.");
        }    
    }
])




// EMOTION API
bot.dialog('/emotion', [
    function (session) {
        builder.Prompts.text(session, "How do you feel today?");
    },
    function (session, results) {
        if (results && results.response) {
            session.send("You entered '%s'", results.response);
            session.replaceDialog('/carousel')
        } else {
            session.endDialog('You canceled')
        }
    }
])

// CAROUSEL
bot.dialog('/carousel', [
    function (session) {
        session.send("You can pass a custom message to Prompts.choice() that will present the user with a carousel of cards to select from. Each card can even support multiple actions.");
        
        // Ask the user to select an item from a carousel.
        var msg = new builder.Message(session)
            .textFormat(builder.TextFormat.xml)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                    .title("Space Needle")
                    .text("The <b>Space Needle</b> is an observation tower in Seattle, Washington, a landmark of the Pacific Northwest, and an icon of Seattle.")
                    .images([
                        builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Seattlenighttimequeenanne.jpg/320px-Seattlenighttimequeenanne.jpg")
                            .tap(builder.CardAction.showImage(session, "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Seattlenighttimequeenanne.jpg/800px-Seattlenighttimequeenanne.jpg")),
                    ])
                    .buttons([
                        builder.CardAction.openUrl(session, "https://en.wikipedia.org/wiki/Space_Needle", "Wikipedia"),
                        builder.CardAction.imBack(session, "select:100", "Select")
                    ]),
                new builder.HeroCard(session)
                    .title("Pikes Place Market")
                    .text("<b>Pike Place Market</b> is a public market overlooking the Elliott Bay waterfront in Seattle, Washington, United States.")
                    .images([
                        builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/en/thumb/2/2a/PikePlaceMarket.jpg/320px-PikePlaceMarket.jpg")
                            .tap(builder.CardAction.showImage(session, "https://upload.wikimedia.org/wikipedia/en/thumb/2/2a/PikePlaceMarket.jpg/800px-PikePlaceMarket.jpg")),
                    ])
                    .buttons([
                        builder.CardAction.openUrl(session, "https://en.wikipedia.org/wiki/Pike_Place_Market", "Wikipedia"),
                        builder.CardAction.imBack(session, "select:101", "Select")
                    ]),
                new builder.HeroCard(session)
                    .title("EMP Museum")
                    .text("<b>EMP Musem</b> is a leading-edge nonprofit museum, dedicated to the ideas and risk-taking that fuel contemporary popular culture.")
                    .images([
                        builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Night_Exterior_EMP.jpg/320px-Night_Exterior_EMP.jpg")
                            .tap(builder.CardAction.showImage(session, "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Night_Exterior_EMP.jpg/800px-Night_Exterior_EMP.jpg"))
                    ])
                    .buttons([
                        builder.CardAction.openUrl(session, "https://en.wikipedia.org/wiki/EMP_Museum", "Wikipedia"),
                        builder.CardAction.imBack(session, "select:102", "Select")
                    ])
            ]);
        builder.Prompts.choice(session, msg, "select:100|select:101|select:102");
    },
    function (session, results) {
        if (results.response) {
            var action, item;
            var kvPair = results.response.entity.split(':');
            switch (kvPair[0]) {
                case 'select':
                    action = 'selected';
                    break;
            }
            switch (kvPair[1]) {
                case '100':
                    item = "the <b>Space Needle</b>";
                    break;
                case '101':
                    item = "<b>Pikes Place Market</b>";
                    break;
                case '101':
                    item = "the <b>EMP Museum</b>";
                    break;
            }
            session.replaceDialog('/story');
        } else {
            session.endDialog("You canceled.");
        }
    }    
]);


// PROMPT TEXT and TEXT ANALYTICS API
bot.dialog('/story', [
    function (session) {
        builder.Prompts.text(session, "Tell me a short story about the photo");
    },
    function (session, results) {
        if (results && results.response) {
            session.send("You entered '%s'", results.response);
            session.replaceDialog('/lob')
        } else {
            session.endDialog('You canceled')
        }
    }
])

// LOB API
bot.dialog('/lob', [
    function (session) {
        builder.Prompts.text(session, "What is the address?");
    },
    function (session, results) {
        if (results && results.response) {
            session.send("You entered '%s'", results.response);
            session.replaceDialog('/time')
        } else {
            session.endDialog('You canceled')
        }
    }
])

// PROMPT TIME
bot.dialog('/time', [
    function (session) {
        builder.Prompts.time(session, "When do you want to send the postcard?");
    },
    function (session, results) {
        if (results && results.response) {
            session.send("You entered '%s'", JSON.stringify(results.response));
            session.replaceDialog('/receipt')
        } else {
            session.endDialog('You canceled')
        }
    }
])

// RECEIPT
bot.dialog('/receipt', [
    function (session) {
        session.send("You can send a receipts for purchased good with both images and without...");
        
        // Send a receipt with images
        var msg = new builder.Message(session)
            .attachments([
                new builder.ReceiptCard(session)
                    .title("Recipient's Name")
                    .items([
                        builder.ReceiptItem.create(session, "$22.00", "EMP Museum").image(builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/commons/a/a0/Night_Exterior_EMP.jpg")),
                        builder.ReceiptItem.create(session, "$22.00", "Space Needle").image(builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/commons/7/7c/Seattlenighttimequeenanne.jpg"))
                    ])
                    .facts([
                        builder.Fact.create(session, "1234567898", "Order Number"),
                        builder.Fact.create(session, "VISA 4076", "Payment Method"),
                        builder.Fact.create(session, "WILLCALL", "Delivery Method")
                    ])
                    .tax("$4.40")
                    .total("$48.40")
            ]);
        session.send(msg);

        // Send a receipt without images
        msg = new builder.Message(session)
            .attachments([
                new builder.ReceiptCard(session)
                    .title("Recipient's Name")
                    .items([
                        builder.ReceiptItem.create(session, "$22.00", "EMP Museum"),
                        builder.ReceiptItem.create(session, "$22.00", "Space Needle")
                    ])
                    .facts([
                        builder.Fact.create(session, "1234567898", "Order Number"),
                        builder.Fact.create(session, "VISA 4076", "Payment Method"),
                        builder.Fact.create(session, "WILLCALL", "Delivery Method")
                    ])
                    .tax("$4.40")
                    .total("$48.40")
            ]);
        session.send(msg)
        session.replaceDialog('/refer');
    }
]);

// GROUP CHAT
bot.dialog('/refer', [
    function (session) {
        session.endDialog("Here you can refer a friend")
    }
])

bot.on('conversationUpdate', function (message) {
   // Check for group conversations
    if (message.address.conversation.isGroup) {
        // Send a hello message when bot is added
        if (message.membersAdded) {
            message.membersAdded.forEach(function (identity) {
                if (identity.id === message.address.bot.id) {
                    var reply = new builder.Message()
                            .address(message.address)
                            .text("Hello everyone!");
                    bot.send(reply);
                }
            });
        }

        // Send a goodbye message when bot is removed
        if (message.membersRemoved) {
            message.membersRemoved.forEach(function (identity) {
                if (identity.id === message.address.bot.id) {
                    var reply = new builder.Message()
                        .address(message.address)
                        .text("Goodbye");
                    bot.send(reply);
                }
            });
        }
    }
});
