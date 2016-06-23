/*

 Welcome to Jolly Pirate Post!

 I can send a postcard for you to anywhere. Let's get started!

 Give me a photo to work with
 => save attachment - DONE
 => CV api and gen thumbnails - PUSH
 => caymanjs - DONE
 => carousel - DONE

 Tell me a short story about the card!
 => bing spell check api - DONE
 => text analytics api - DONE

 Where will the card go?
 => address - DONE
 => lob api - DONE

 Great, here you are!
 => receipt - DONE

*/



var restify = require('restify');
var os = require('os')
var fs = require('fs')
var request = require('request');
var uuid = require('node-uuid')

var builder = require('botbuilder');
var cogs = require('./CSServices')
var imgs = require('./ImgServices')


var Caman = require('caman').Caman
var Lob = require('lob')('test_8f40bb86374ba8280a9c9293b26483b42de');
// live_d0836a2d434e929d1fb8e592fa944af6fe9

var url_base = ''

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
        // clear memory
        session.userData = {}

        // Send a greeting and start the menu.
        var card = new builder.HeroCard(session)
            .title("Yar! I be the Jolly Pirate Post Master!")
            .text("I can send a postcard to anywhere, across the land and all seven seas!")
            .images([
                 builder.CardImage.create(session, "http://i.imgur.com/dgl17bl.png")
            ]);
        var msg = new builder.Message(session).attachments([card]);
        session.send(msg);
        session.replaceDialog('/photo')
    },
    // function (session, results) {
    //     if (results && results.resumed == builder.ResumeReason.completed) {
    //         session.send("You chose '%s'", results.response ? 'yes' : 'no');
    //         session.endDialog('goodbye')
    //     } else {
    //         session.endDialog("Goodbye");
    //     }
    // }
]);


// ATTACHMENTS
bot.dialog('/photo', [
    function (session) {
        session.send("Let's get started!")
        builder.Prompts.attachment(session, "First, give me a photo to work with!");
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
                        var imagePath = 'https://c7d36c61.ngrok.io/' + 'files/'+options.url.split('/')[5]+'.jpg'
                        console.log('File saved', imagePath)
                        session.userData.imageUrl = imagePath
                        session.send('This be a mighty fine photo!')
                        session.send(session.userData.imageUrl)
                        session.replaceDialog('/message');
                    })
                })
            });
        } else {
            session.endDialog("You canceled.");
        }    
    }
])


// PROMPT TEXT and TEXT ANALYTICS API
bot.dialog('/message', [
    function (session) {
        builder.Prompts.text(session, "Next you tell me how you feel about the photo. Don't be too chatty now.")
    },
    function (session, results) {
        if (results && results.response) {
            // save message
            session.userData.message = results.response

            // find out how you feel
            cogs.Sentiment(results.response, function (reply) {
                console.log('RESPONSE FROM SENTIMENT CHECK:', reply)
                if (!reply.error) {
                        console.log(reply.documents[0].score)
                    if (reply.documents[0].score > 0.5) {
                        session.userData.feeling = 'happy'
                        session.send("Yar! That sounds like mighty good fun! I am very %s for you!", session.userData.feeling)
                        session.replaceDialog('/carousel');
                    } else {
                        session.userData.feeling = 'sad'
                        session.send("Shiver me timbers! That doesn't sound very good at all. I feel %s with you.", session.userData.feeling)
                        builder.Prompts.text(session, "But are you sure that's how you feel?!")
                    }
                    // session.endDialog('goodbye');
                } else {
                    session.send("Got an error")
                }
            })
        } else {
            session.endDialog('You canceled.')
        }
    },
    function (session, results) {
        if (results && results.response) {
            // save message
            session.userData.message = results.response

            // find out how you feel
            cogs.Sentiment(results.response, function (reply) {
                console.log('RESPONSE FROM SENTIMENT CHECK:', reply)
                if (!reply.error) {
                        console.log(reply.documents[0].score)
                    if (reply.documents[0].score > 0.5) {
                        session.userData.feeling = 'happy'
                        session.send("Yar! That sounds like mighty good fun! I am very %s for you!", session.userData.feeling)
                    } else {
                        session.userData.feeling = 'sad'
                        session.send("Shiver me timbers! That doesn't sound very good at all. I feel %s with you.", session.userData.feeling)
                    }
                    session.replaceDialog('/carousel');
                    // session.endDialog('goodbye');
                } else {
                    session.send("Got an error")
                }
            })
        } else {
            session.endDialog('You canceled.')
        }

        builder.Prompts.text(session, "Next you tell me how you feel about the photo. Don't be too chatty now.")
    },
])


var happyFilters = [
 "lomo",
 "clarity",
 "sunrise",
 "glowingSun",
 "love",
]

var okayFilters =[
"crossProcess",
 "orangePeel",
 "sinCity",
 "jarques",
 "pinhole",
 "oldBoot",
 "herMajesty",
 "concentrate"
]

 var sadFilters = [
 "grungy",
 "vintage",
 "hazyDays",
 "nostalgia",
 "hemingway",
];


var applyFilter = function(imageUrl, filter) {
 var id = uuid.v1();
 var original = os.tmpdir() + "/" + id;
 var filtered = id + "-" + filter + ".jpg";
 var filteredPath = "./files/" + filtered;
 
 // Save the remote image file to the /tmp fs
 download = request(imageUrl).pipe(fs.createWriteStream(original));
 
 download.on('finish', function() {
   // initialize CamanJS
   Caman(original, function () {
     // apply the filter
     // this.resize({width: 600});
     this[filter]();
     // this.resize({
     //    width: 800,
     //    height: 600
     // });
     this.render(function () {
       // save to the file system
       this.save(filteredPath);
       console.log('Saved: ', filtered);
       // delete the temp file
       fs.unlink(original, function(err) {});
       console.log('https://c7d36c61.ngrok.io/' + 'files/' + filtered)
       return ('https://c7d36c61.ngrok.io/' + 'files/' + filtered)
     });
   });
 });
};


var rotateImage = function(imageUrl) {
 // create a unique UUID for all of our video/gif processing
 var id = uuid.v1();
 
 var original = os.tmpdir() + "/" + id;
 var rotated = id + ".jpg";
 var rotatedPath = "./files/" + rotated;
 
 // Save the remote image file to the /tmp fs
 download = request(imageUrl).pipe(fs.createWriteStream(original));
 
 download.on('finish', function() {
   // initialize CamanJS
   Caman(original, function () {
     // apply the filter
     this.resize({width: 600});
     this[filter]();
     this.render(function () {
       // save to the file system
       this.save(filteredPath);
       console.log('Saved: ', filtered);
       // delete the temp file
       fs.unlink(original, function(err) {});
       sendPhoto(url_base, filtered, from, to);
     });
   });
 });
};


function helperFunc(zippyarray) {
  return Promise.each(zippyarray, zippy => {
    return applyFilter(zippy)
      .then((singleResult) => {
        // do something with the operation result if needed
      })
  }).then((originalArray) => {
    // this happens only after the whole array is processed
    // (result is the original array here)
    return Promise.resolve(originalArray)
  })
}

// CAROUSEL
bot.dialog('/carousel', [
    function (session) {
        session.send("Because of how you feel I am trying these photo filters. Which do you like?");
        
        // loop filters
        // happyFilters.forEach(function (filter) {
        //     applyFilter(session.userData.imageUrl, filter)
        // });


        // Ask the user to select an item from a carousel.
        var msg = new builder.Message(session)
            .textFormat(builder.TextFormat.xml)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                    // .title("Original")
                    .images([
                        builder.CardImage.create(session, "https://c7d36c61.ngrok.io/files/"+"cf44de60-38d7-11e6-8831-89bc37a1253b-clarity.jpg")
                            .tap(builder.CardAction.showImage(session, "https://c7d36c61.ngrok.io/files/"+"cf44de60-38d7-11e6-8831-89bc37a1253b-clarity.jpg")),
                    ])
                    .buttons([
                        builder.CardAction.imBack(session, "select:clarity", "Apply Clarity filter")
                    ]),
                new builder.HeroCard(session)
                    // .title("Vintage")
                    .images([
                        builder.CardImage.create(session, "https://c7d36c61.ngrok.io/files/"+"cf452c80-38d7-11e6-8831-89bc37a1253b-glowingSun.jpg")
                            .tap(builder.CardAction.showImage(session, "https://c7d36c61.ngrok.io/files/"+"cf452c80-38d7-11e6-8831-89bc37a1253b-glowingSun.jpg")),
                    ])
                    .buttons([
                        builder.CardAction.imBack(session, "select:glowingSun", "Apply Glowing Sun filter")
                    ]),
                new builder.HeroCard(session)
                    // .title("Lomo")
                    .images([
                        builder.CardImage.create(session, "https://c7d36c61.ngrok.io/files/"+"cf452c81-38d7-11e6-8831-89bc37a1253b-love.jpg")
                            .tap(builder.CardAction.showImage(session, "https://c7d36c61.ngrok.io/files/"+"cf452c81-38d7-11e6-8831-89bc37a1253b-love.jpg"))
                    ])
                    .buttons([
                        builder.CardAction.imBack(session, "select:love", "Apply Love filter")
                    ]),
                new builder.HeroCard(session)
                    // .title("Clarity")
                    .images([
                        builder.CardImage.create(session, "https://c7d36c61.ngrok.io/files/"+"cf446930-38d7-11e6-8831-89bc37a1253b-lomo.jpg")
                            .tap(builder.CardAction.showImage(session, "https://c7d36c61.ngrok.io/files/"+"cf446930-38d7-11e6-8831-89bc37a1253b-lomo.jpg"))
                    ])
                    .buttons([
                        builder.CardAction.imBack(session, "select:lomo", "Apply Lomo filter")
                    ]),
                new builder.HeroCard(session)
                    // .title("Sin City")
                    .images([
                        builder.CardImage.create(session, "https://c7d36c61.ngrok.io/files/"+"cf450570-38d7-11e6-8831-89bc37a1253b-sunrise.jpg")
                            .tap(builder.CardAction.showImage(session, "https://c7d36c61.ngrok.io/files/"+"cf450570-38d7-11e6-8831-89bc37a1253b-sunrise.jpg"))
                    ])
                    .buttons([
                        builder.CardAction.imBack(session, "select:sunrise", "Apply Sunrise filter")
                    ]),
            ]);
        builder.Prompts.choice(session, msg, "select:clarity|select:glowingSun|select:love|select:lomo|select:sunrise");
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
                case 'clarity':
                    item = "clarity";
                    break;
                case 'glowingSun':
                    item = "glowingSun";
                    break;
                case 'love':
                    item = "love";
                    break;
                case 'lomo':
                    item = "lomo";
                    break;
                case 'sunrise':
                    item = "sunrise";
                    break;
            }
            session.send("%s?", item)
            session.send("La di da! Did anyone tell you you are very good at picking filters?")

            // session.userData.filter = "https://c7d36c61.ngrok.io/files/cf452c81-38d7-11e6-8831-89bc37a1253b-love.jpg"
            // session.userData.filter = filter
            // session.endDialog('goodbye');
            session.replaceDialog('/address')
        } else {
            session.endDialog("You canceled.");
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


// PROMPT ADDRESS
bot.dialog('/address', [
    function (session) {
        builder.Prompts.text(session, "Who do you want to send it to?")
    },
    function (session, results) {
        if (results && results.response) {
            cogs.Spellcheck(results.response, function (reply) {
                console.log('RESPONSE FROM SPELLCHECK:', reply)
                // SPELL CHECKS
                if (!reply.error) {
                    if (reply != null) {
                        session.send("Yar! I think you meant to say %s", reply)
                        session.userData.name = reply
                        builder.Prompts.text(session, "What country? In 2 letters plz")
                    } else {
                        session.send("You said %s", results.response)
                        session.userData.name = results.response
                        builder.Prompts.text(session, "What country? In 2 letters plz")
                    }
                } else {
                    session.send("Got an error")
                }
                
                session.replaceDialog('/sentiment')
            })
        }
    },
    function (session, results) {
        if (results && results.response) {
            session.userData.country = results.response
            builder.Prompts.text(session, "What street?")
        } else {
            session.endDialog("You canceled")
        }  
    },
    function (session, results) {
        if (results && results.response) {
            session.userData.address1 = results.response
            builder.Prompts.text(session, "What city?")
        } else {
            session.endDialog("You canceled")
        }
    },
    function (session, results) {
        if (results && results.response) {
            session.userData.city = results.response
            builder.Prompts.text(session, "What state?")
        } else {
            session.endDialog("You canceled")
        }
    },
    function (session, results) {
        if (results && results.response) {
            session.userData.state = results.response
            builder.Prompts.text(session, "What postal code?")
        } else {
            session.endDialog("You canceled")
        }
    },
    function (session, results) {
        if (results && results.response) {
            session.userData.zip = results.response

            Lob.verification.verify({
              address_line1: session.userData.address1,
              address_city: session.userData.city,
              address_state: session.userData.state,
              address_zip: session.userData.zip,
              address_country: session.userData.country,
            }, function (err, res) {
              if (res) {
                console.log(res)
                session.userData.address1 = res.address.address_line1
                session.userData.city = res.address.address_city
                session.userData.state = res.address.address_state
                session.userData.zip = res.address.address_zip
                session.userData.country = res.address.address_country

                console.log(session.userData)

                session.send("Now we be ready!");
                session.replaceDialog('/lob')
              } else {
                session.endDialog("Failed! %s", err);
              }
            });
        } else {
            session.endDialog("Bye.");
        }
    }
])


bot.dialog('/lob', [
    function (session) {
        builder.Prompts.confirm(session, "You be ready to send this postcard?");
    },
    function (session, results) {
        if (results.response) {
            
            var postcardTemplate = fs.readFileSync(__dirname + '/postcard.html').toString()

            return Lob.addresses.create({
                name: session.userData.name,
                address_line1: session.userData.address1,
                address_city: session.userData.city,
                address_state: session.userData.state,
                address_zip: session.userData.zip,
                address_country: session.userData.country,
            })
            .then(function (address) {
                return Lob.postcards.create({
                    description: 'Skype Postcard',
                    to: address.id,
                    front: postcardTemplate,
                    message: session.userData.message,
                    data: {
                        // image: session.userData.imageUrl
                        image: "https://c7d36c61.ngrok.io/files/cf452c81-38d7-11e6-8831-89bc37a1253b-love.jpg"
                    }
                })
            })
            .then(function (postcard) {
                session.userData.postcardUrl = postcard.url
                session.send('Ayy, captain, here be a postcard preview: %s', postcard.url)
                session.replaceDialog('/receipt')
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
        session.send("Now be the part you pay in gold pieces!");
        
        // Send a receipt with images
        // var msg = new builder.Message(session)
        //     .attachments([
        //         new builder.ReceiptCard(session)
        //             .title("Recipient's Name")
        //             .items([
        //                 builder.ReceiptItem.create(session, "$22.00", "EMP Museum").image(builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/commons/a/a0/Night_Exterior_EMP.jpg")),
        //                 builder.ReceiptItem.create(session, "$22.00", "Space Needle").image(builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/commons/7/7c/Seattlenighttimequeenanne.jpg"))
        //             ])
        //             .facts([
        //                 builder.Fact.create(session, "1234567898", "Order Number"),
        //                 builder.Fact.create(session, "VISA 4076", "Payment Method"),
        //                 builder.Fact.create(session, "WILLCALL", "Delivery Method")
        //             ])
        //             .tax("$4.40")
        //             .total("$48.40")
        //     ]);
        // session.send(msg);

        // Send a receipt without images
        msg = new builder.Message(session)
            .attachments([
                new builder.ReceiptCard(session)
                    .title("Jolly Pirate Post ⚓️📬")
                    .facts([
                        builder.Fact.create(session, "1234567898", "Order Number"),
                        builder.Fact.create(session, "PROMO", "Payment Method"),
                        builder.Fact.create(session, "MAIL", "Delivery Method")
                    ])
                    .items([
                        builder.ReceiptItem.create(session, "$0.00", "Postcard"),
                    ])
                    .tax("$0.00")
                    .total("$0.00")
            ]);
        session.send(msg)
        session.replaceDialog('/goodbye');
    }
]);


bot.dialog('/goodbye', [
    function (session) {
        builder.Prompts.confirm(session, "Yar! We are done. Do you want to send another postcard?");
    },
    function (session, results) {
        if (results.response) {
            session.replaceDialog("Yar! Alrighty then!")
        } else {
            session.endDialog("Yar! Goodbye ye landlubber!")    
        }
    }
])

bot.use({
    dialog: function (session, next) {
        if (/^deleteprofile/i.test(session.message.text)) {
            session.userData = {};
            session.endConversation("Stored data deleted.");
        } else {
            next();
        }
    }
});



// // GROUP CHAT
// bot.dialog('/refer', [
//     function (session) {
//         session.endDialog("Here you can refer a friend")
//     }
// ])

// bot.on('conversationUpdate', function (message) {
//    // Check for group conversations
//     if (message.address.conversation.isGroup) {
//         // Send a hello message when bot is added
//         if (message.membersAdded) {
//             message.membersAdded.forEach(function (identity) {
//                 if (identity.id === message.address.bot.id) {
//                     var reply = new builder.Message()
//                             .address(message.address)
//                             .text("Hello everyone!");
//                     bot.send(reply);
//                 }
//             });
//         }

//         // Send a goodbye message when bot is removed
//         if (message.membersRemoved) {
//             message.membersRemoved.forEach(function (identity) {
//                 if (identity.id === message.address.bot.id) {
//                     var reply = new builder.Message()
//                         .address(message.address)
//                         .text("Goodbye");
//                     bot.send(reply);
//                 }
//             });
//         }
//     }
// });
