var https = require('https')
var querystring = require('querystring');
 
exports.Spellcheck = function Spellcheck(string, callback) {
	console.log('SPELLCHECK:', string)

	var post_option = {
		hostname: 'bingapis.azure-api.net',
		port: 443,
		path: '/api/v5/spellcheck',
		method: 'POST'
	};

	post_option.headers = {
		'Content-Type' : 'application/x-www-form-urlencoded',
		'Ocp-Apim-Subscription-Key' : '7030d2d447134c878a19d87b2b801592'
	};

	var post_data = querystring.stringify({
		'Text': string
	})

	console.log('CALLING BING:', post_option, post_data)

	var post_req = https.request(post_option, function(res){
	  var _data="";
		res.on('data', function(buffer){
			_data += buffer;
		});
		 
		 // end callback
		res.on('end', function(){
			// console.log("RESPONSE: ",_data);
			callback(replaceOffset(string, JSON.parse(_data)))
		})
	})

	post_req.write(post_data)
	post_req.end()
	post_req.on('error', function(e) {
		console.log('problem with request: ' + e.message)
	})
}

function replaceOffset(string, checked) {
	if (checked.flaggedTokens.length > 0)	{
		var newString
		console.log('GOT SUGGESTIONS')
		checked.flaggedTokens.forEach(function (flagged) {
				console.log(flagged.offset, flagged.suggestions[0].suggestion)
				newString = string.replace(flagged.token, flagged.suggestions[0].suggestion)
				string = newString
        console.log(newString)
    })
    return newString
	} else {
		return null
	}
}

exports.Sentiment = function Sentiment(string, callback) {
	console.log('SENTIMENT CHECK:', string)

	var post_option = {
		hostname: 'westus.api.cognitive.microsoft.com',
		port: 443,
		path: '/text/analytics/v2.0/sentiment',
		method: 'POST'
	};

	post_option.headers = {
		'Content-Type' : 'application/json',
		'Ocp-Apim-Subscription-Key' : '087de4eafec345099c6a7db4f5372e8b'
	};

	var post_data = {
	  "documents": [
	    {
	      "language": "en",
	      "id": "string",
	      "text": string
	    }
	  ]
	}

	console.log('CALLING BING:', post_option, post_data)

	var post_req = https.request(post_option, function(res){
	  var _data="";
		res.on('data', function(buffer){
			_data += buffer;
		});
		 
		 // end callback
		res.on('end', function(){
			// console.log("RESPONSE: ",_data);
			callback(JSON.parse(_data))
		})
	})

	post_req.write(JSON.stringify(post_data), encoding='utf8')
	post_req.end()
	post_req.on('error', function(e) {
		console.log('problem with request: ' + e.message)
	})	
}