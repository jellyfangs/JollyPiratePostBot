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
        session.beginDialog('/lob')
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
 => carousel - DONE

 Tell me a short story about the card!
 => bing spell check api - DONE
 => text analytics api - DONE

 Where will the card go?
 => address
 => lob api

 Great, here you are!
 => receipt - DONE

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
                        var imagePath = 'https://c7d36c61.ngrok.io/' + 'files/'+options.url.split('/')[5]+'.jpg'
                        session.send('Your file is at %s', imagePath)
                    })
                })
                // msg.addAttachment(attachment);
            });
            session.replaceDialog('/carousel');
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
                    .title("Original")
                    .images([
                        builder.CardImage.create(session, "https://c7d36c61.ngrok.io/files/0-cus-d3-87b86093bd4340a03689a868001477be.jpg")
                            .tap(builder.CardAction.showImage(session, "https://c7d36c61.ngrok.io/files/0-cus-d3-87b86093bd4340a03689a868001477be.jpg")),
                    ])
                    .buttons([
                        builder.CardAction.imBack(session, "select:100", "Stick with this")
                    ]),
                new builder.HeroCard(session)
                    .title("Vintage")
                    .images([
                        builder.CardImage.create(session, "https://c7d36c61.ngrok.io/files/0-cus-d3-87b86093bd4340a03689a868001477be.jpg")
                            .tap(builder.CardAction.showImage(session, "https://c7d36c61.ngrok.io/files/0-cus-d3-87b86093bd4340a03689a868001477be.jpg")),
                    ])
                    .buttons([
                        builder.CardAction.imBack(session, "select:101", "Choose this filter")
                    ]),
                new builder.HeroCard(session)
                    .title("Lomo")
                    .images([
                        builder.CardImage.create(session, "https://c7d36c61.ngrok.io/files/0-cus-d3-87b86093bd4340a03689a868001477be.jpg")
                            .tap(builder.CardAction.showImage(session, "https://c7d36c61.ngrok.io/files/0-cus-d3-87b86093bd4340a03689a868001477be.jpg"))
                    ])
                    .buttons([
                        builder.CardAction.imBack(session, "select:102", "Choose this filter")
                    ]),
                new builder.HeroCard(session)
                    .title("Clarity")
                    .images([
                        builder.CardImage.create(session, "https://c7d36c61.ngrok.io/files/0-cus-d3-87b86093bd4340a03689a868001477be.jpg")
                            .tap(builder.CardAction.showImage(session, "https://c7d36c61.ngrok.io/files/0-cus-d3-87b86093bd4340a03689a868001477be.jpg"))
                    ])
                    .buttons([
                        builder.CardAction.imBack(session, "select:103", "Choose this filter")
                    ]),
                new builder.HeroCard(session)
                    .title("Sin City")
                    .images([
                        builder.CardImage.create(session, "https://c7d36c61.ngrok.io/files/0-cus-d3-87b86093bd4340a03689a868001477be.jpg")
                            .tap(builder.CardAction.showImage(session, "https://c7d36c61.ngrok.io/files/0-cus-d3-87b86093bd4340a03689a868001477be.jpg"))
                    ])
                    .buttons([
                        builder.CardAction.imBack(session, "select:104", "Choose this filter")
                    ]),
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
            session.endDialog();
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

// PROMPT ADDRESS
bot.dialog('/address', [
    function (session) {
        builder.Prompts.text(session, "Who do you want to send it to?")
    },
    function (session, results) {
        if (results && results.response) {
            builder.Prompts.text(session, "What country? United States or International?")
        } else {
            session.endDialog("You canceled")
        }
    },
    function (session, results) {
        if (results && results.response) {
            builder.Prompts.text(session, "What street?")
        } else {
            session.endDialog("You canceled")
        }  
    },
    function (session, results) {
        if (results && results.response) {
            builder.Prompts.text(session, "What city?")
        } else {
            session.endDialog("You canceled")
        }
    },
    function (session, results) {
        if (results && results.response) {
            builder.Prompts.text(session, "What state?")
        } else {
            session.endDialog("You canceled")
        }
    },
    function (session, results) {
        if (results && results.response) {
            builder.Prompts.text(session, "What postal code?")
        } else {
            session.endDialog("You canceled")
        }
    },
    function (session, results) {
        session.endDialog("Cool.");
    }
])


var Lob = require('lob')('test_8f40bb86374ba8280a9c9293b26483b42de');
// live_d0836a2d434e929d1fb8e592fa944af6fe9

bot.dialog('/lob', [
    function (session) {
        builder.Prompts.confirm(session, "Ready to send?");
    },
    function (session, results) {
        if (results && results.resumed == builder.ResumeReason.completed) {
            
            var postcardTemplate = fs.readFileSync(__dirname + '/postcard.html').toString()

            return Lob.addresses.create({
                name: 'TEST TEST',
                address_line1: '1 INFINITE LOOP',
                address_city: 'CUPERTINO',
                address_state: 'CA',
                address_zip: '95129',
                address_country: 'US'
            })
            .then(function (address) {
                return Lob.postcards.create({
                    description: 'Skype Postcard',
                    to: address.id,
                    front: postcardTemplate,
                    message: 'HELLO WORLD',
                    data: {
                        image: 'https://c7d36c61.ngrok.io/files/0-cus-d3-87b86093bd4340a03689a868001477be.jpg'
                    }
                })
            })
            .then(function (postcard) {
                session.send('Here is your postcard preview %s', postcard.url)
            })
            .catch(function (errors) {
                session.endDialog('Failed! Because %s', errors.message)
            })
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
