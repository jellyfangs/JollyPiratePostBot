var https = require('https')
var querystring = require('querystring');
 
exports.getAttachment = function getAttachment(authRequest, contentUrl) {
	console.log('GETTING FROM SKYPE:', contentUrl)
	console.log(authRequest)

	// var get_option = {
	// 	hostname: 'df-apis.skype.com',
	// 	port: 443,
	// 	path: '/v2/attachments/',
	// 	method: 'GET'
	// };

	// get_option.headers = {
	// 	'Content-Type' : 'application/x-www-form-urlencoded',
	// 	'Bearer' : accessToken
	// };

	// console.log('CALLING SKYPE:', get_option)

	// var get_req = https.request(get_option, function(res){
	//   var _data="";
	// 	res.on('data', function(buffer){
	// 		_data += buffer;
	// 	});
		 
	// 	 // end callback
	// 	res.on('end', function(){
	// 		// console.log("RESPONSE: ",_data);
	// 		callback(replaceOffset(string, JSON.parse(_data)))
	// 	})
	// })

	// post_req.write(post_data)
	// post_req.end()
	// post_req.on('error', function(e) {
	// 	console.log('problem with request: ' + e.message)
	// })
}
