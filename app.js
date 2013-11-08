var fs = require("fs"),
	express = require("express"),
	app = express(),
	server = require("http").createServer(app),
	io = require("socket.io").listen(server);

app.use(express.bodyParser());

var auth = new (require("oauth").OAuth)(
	"https://api.fitbit.com/oauth/request_token",
	"https://api.fitbit.com/oauth/access_token",
	"4aa1a1175b514e6fb15c3f92d5cfaab3",
	"4ac101158b93458bae083b1b899c2293",
	"1.0",
	null,
	"HMAC-SHA1"
);

io.set("log level", 1);
server.listen(1114);

var socketsPerRequestToken = {},
	socketsPerUserId = {};

io.sockets.on("connection", function (socket) {
	auth.getOAuthRequestToken(function (error, token, secret) {
		socketsPerRequestToken[token] = socket;
		socket.requestToken = token;
		socket.requestTokenSecret = secret;

		socket.emit("requestToken", token);
	});

	socket.on("update", function (date) {
		auth.getProtectedResource("https://api.fitbit.com/1/user/-/activities/date/" + date + ".json", "GET", socket.accessToken, socket.accessTokenSecret, function (error, data) {
			if (error) return console.log(error);

			data = JSON.parse(data);
			socket.emit("update", data.summary.steps, data.goals.steps);
		});
	});

	socket.on("disconnect", function () {
		delete socketsPerRequestToken[socket.requestToken];
		delete socketsPerUserId[socket.userId];
	});
});

app.get("/access-token", function (req, res) {
	res.send(undefined);

	var requestToken = req.query.oauth_token,
		verifier = req.query.oauth_verifier,
		socket = socketsPerRequestToken[requestToken],
		requestTokenSecret = socket.requestTokenSecret;

	auth.getOAuthAccessToken(requestToken, requestTokenSecret, verifier, function (error, token, secret, results) {
		socket.userId = results.encoded_user_id;
		socket.accessToken = token;
		socket.accessTokenSecret = secret;
		socketsPerUserId[socket.userId] = socket;

		socket.emit("initialized");

		auth.getProtectedResource("https://api.fitbit.com/1/user/-/activities/apiSubscriptions/" + socket.userId + ".json", "POST", token, secret, function (error, data) {});
	});
});

app.post("/update", function (req, res) {
	res.send(undefined);

	fs.readFile(req.files.updates.path, function (error, data) {
		if (error) return console.log(error);

		data = JSON.parse(data);
		for (var i = 0; i < data.length; i++) {
			var socket = socketsPerUserId[data[i].ownerId];
			auth.getProtectedResource("https://api.fitbit.com/1/user/-/activities/date/" + data[i].date + ".json", "GET", socket.accessToken, socket.accessTokenSecret, (function (socket) {
				return function (error, data) {
					if (error) return console.log(error);

					data = JSON.parse(data);
					socket.emit("update", data.summary.steps, data.goals.steps);
				};
			})(socket));
		}
	});
});

// *KG^7cFjmBul