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

var requestTokenData = {},
	users = {};

io.sockets.on("connection", function (socket) {
	var user;
	socket.on("initialize", function (userId) {
		if (userId in users) {
			user = users[userId];
			user.sockets.push(socket);
			socket.emit("initialized", userId);
		} else {
			auth.getOAuthRequestToken(function (error, token, secret) {
				if (error) return console.log(error);

				requestTokenData[token] = {secret: secret, socket: socket};
				socket.emit("requestToken", token);
			});
		}
	});

	socket.on("activities", function (userId, date) {
		user = users[userId];
		var url = "https://api.fitbit.com/1/user/-/activities/date/" + date + ".json";
		auth.getProtectedResource(url, "GET", user.accessToken, user.accessTokenSecret, function (error, data) {
			if (error) return console.log(error);

			data = JSON.parse(data);
			socket.emit("activities", date, data.summary.steps, data.goals.steps);
		});
	});

	socket.on("disconnect", function () {
		if (user) user.sockets.splice(user.sockets.indexOf(socket), 1);
	});
});

app.get("/access-token", function (req, res) {
	res.send(undefined);

	var requestToken = req.query.oauth_token,
		requestTokenSecret = requestTokenData[requestToken].secret,
		verifier = req.query.oauth_verifier,
		socket = requestTokenData[requestToken].socket;
	auth.getOAuthAccessToken(requestToken, requestTokenSecret, verifier, function (error, token, secret, results) {
		if (error) return console.log(error);

		var userId = results.encoded_user_id,
			user = users[userId] || (users[userId] = {
				id: userId,
				sockets: []
			});

		user.accessToken = token; user.accessTokenSecret = secret;
		user.sockets.push(socket);

		socket.emit("initialized", userId);

		var url = "https://api.fitbit.com/1/user/-/activities/apiSubscriptions/" + userId + ".json";
		auth.getProtectedResource(url, "POST", token, secret, function (error, data) {
			if (error) return console.log(error);
		});
	});
});

app.post("/activities", function (req, res) {
	res.send(undefined);

	fs.readFile(req.files.updates.path, function (error, data) {
		if (error) return console.log(error);

		data = JSON.parse(data);
		for (var i = 0; i < data.length; i++) {
			var url = "https://api.fitbit.com/1/user/-/activities/date/" + data[i].date + ".json",
				user = users[data[i].ownerId];

			if (!user) return;

			auth.getProtectedResource(url, "GET", user.accessToken, user.accessTokenSecret, (function (date, sockets) {
				return function (error, data) {
					if (error) return console.log(error);

					data = JSON.parse(data);
					for (var i = 0; i < sockets.length; i++) {
						sockets[i].emit("activities", date, data.summary.steps, data.goals.steps);
					}
				};
			})(data[i].date, user.sockets));
		}
	});
});