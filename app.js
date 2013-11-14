var fs = require("fs"),
	_ = require("lodash");

var express = require("express"),
	app = express();
app.use(express.bodyParser());

var server = require("http").createServer(app);
server.listen(1114);

var io = require("socket.io").listen(server);
io.set("log level", 1);

var auth = new (require("oauth").OAuth)(
	"https://api.fitbit.com/oauth/request_token",
	"https://api.fitbit.com/oauth/access_token",
	"4aa1a1175b514e6fb15c3f92d5cfaab3",
	"4ac101158b93458bae083b1b899c2293",
	"1.0", null, "HMAC-SHA1"
);

io.set("log level", 1);
server.listen(1114);

var users = [];

io.sockets.on("connection", function (socket) {
	var user = {sockets: [socket]};
	socket.on("initialize", function (userId) {
		if (userId) {
			user = _.findWhere(users, {id: userId});
			user.sockets.push(socket);
		} else {
			auth.getOAuthRequestToken(function (error, token, secret) {
				user.requestToken = token; user.requestTokenSecret = secret;
				socket.emit("requestToken", token);
			});
		}
	});

	socket.on("activities", function (date) {
		var url = "https://api.fitbit.com/1/user/-/activities/date/" + date + ".json";
		auth.getProtectedResource(url, "GET", user.accessToken, user.accessTokenSecret, function (error, data) {
			data = JSON.parse(data);
			socket.emit("activities", data.summary.steps, data.goals.steps);
		});
	});

	socket.on("disconnect", function () {
		user.sockets.splice(user.sockets.indexOf(socket));
	});
});

app.get("/access-token", function (req, res) {
	res.send(undefined);

	var requestToken = req.query.oauth_token,
		user = _.findWhere(users, {requestToken: requestToken}),
		requestTokenSecret = user.requestTokenSecret,
		verifier = req.query.oauth_verifier;

	auth.getOAuthAccessToken(requestToken, requestTokenSecret, verifier, function (error, token, secret, results) {
		user.id = results.encoded_user_id;
		user.accessToken = token; user.accessTokenSecret = secret;

		user.sockets.each(function (socket) {
			socket.emit("initialized");
		});

		var url = "https://api.fitbit.com/1/user/-/activities/apiSubscriptions/" + user.id + ".json";
		auth.getProtectedResource(url, "POST", token, secret, function (error, data) {
			// Without this (empty) handler, bad things happen
		});
	});
});

app.post("/activities", function (req, res) {
	res.send(undefined);

	fs.readFile(req.files.updates.path, function (error, data) {
		data = JSON.parse(data);
		for (var i = 0; i < data.length; i++) {
			var url = "https://api.fitbit.com/1/user/-/activities/date/" + data[i].date + ".json",
				user = _.findWhere(users, {id: data[i].ownerId});
			auth.getProtectedResource(url, "GET", user.accessToken, user.accessTokenSecret, (function (sockets) {
				return function (error, data) {
					data = JSON.parse(data);
					sockets.each(function (socket) {
						socket.emit("activities", data.summary.steps, data.goals.steps);
					});
				};
			})(user.sockets));
		}
	});
});

// *KG^7cFjmBul