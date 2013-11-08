(function () {
	var socket = io.connect("http://askullsoon.com:1114"),
		today = new Date().getDate(),
		canvas = document.getElementById("canvas"),
		context = canvas.getContext("2d"),
		tab,
		stepsCount,
		stepsGoal,
		indicatorIndex;

	chrome.browserAction.setBadgeBackgroundColor({color: "#677984"});
	context.lineWidth = 2;

	socket.on("requestToken", function (requestToken) {
		chrome.tabs.create({
			url: "https://www.fitbit.com/oauth/authenticate?oauth_token=" + requestToken
		}, function (newTab) {
			tab = newTab;
		});
	});

	socket.on("initialized", function () {
		chrome.tabs.remove(tab.id);
		socket.emit("update", formatDate(new Date()));
	});

	socket.on("update", function (newStepsCount, newStepsGoal) {
		stepsCount = newStepsCount; stepsGoal = newStepsGoal;
		renderBrowserAction(Math.ceil(calculateMinutesNeeded(stepsCount, stepsGoal, 100)));
	});

	chrome.alarms.create("motivate", {
		periodInMinutes: 1
	});

	chrome.alarms.onAlarm.addListener(function () {
		if (today !== new Date().getDate()) stepsCount = 0;
		renderBrowserAction(Math.ceil(calculateMinutesNeeded(stepsCount, stepsGoal, 100)));
	});

	function formatDate(date) {
		return date.getFullYear() + "-" + ("0" + (date.getMonth() + 1)).substr(-2, 2) + "-" + ("0" + date.getDate()).substr(-2, 2);
	}

	function calculateMinutesNeeded(stepsCount, stepsGoal, stepsPerMinute) {
		var now = new Date(),
			elapsedDayPercent = (now.getHours() + (now.getMinutes() / 60)) / 24,
			stepsExpected = elapsedDayPercent * stepsGoal,
			stepsBehind = stepsExpected - stepsCount,
			stepsNeeded = stepsBehind / (1 - stepsGoal / stepsPerMinute / 60 / 24);

		return stepsNeeded / stepsPerMinute;
	}

	function renderBrowserAction(minutesNeeded) {
		var newIndicatorIndex = Math.max(0, Math.min(45, Math.ceil(minutesNeeded / 15) * 15));

		if (indicatorIndex !== newIndicatorIndex) {
			if (newIndicatorIndex > indicatorIndex && indicatorIndex > 0) webkitNotifications.createNotification("icon48.png", "Get Walking!", "You need to walk for " + minutesNeeded  + " minute(s).").show();

			renderBrowserActionIcon(newIndicatorIndex);
			indicatorIndex = newIndicatorIndex;
		}

		if (minutesNeeded > 0) {
			chrome.browserAction.setBadgeText({
				text: "" + minutesNeeded
			});

			chrome.browserAction.setTitle({title: "Walk for " + minutesNeeded + " minute(s)"});
		} else {
			chrome.browserAction.setBadgeText({text: ""});
		}
	}

	function renderBrowserActionIcon(colorIndex) {
		var colors = COLORS[colorIndex];

		context.clearRect(0, 0, 19, 19);
		context.fillStyle = colors[0];
		context.strokeStyle = colors[1];

		context.beginPath();
		context.arc(9.5, 9.5, 8, 0, Math.PI * 2);
		context.fill(); context.stroke();

		chrome.browserAction.setIcon({
			imageData: context.getImageData(0, 0, 19, 19)
		});
	}

	var COLORS = {
		0: ["#9ADE11", "#66C009"],
		15: ["#FFC807", "#F69400"],
		30: ["#FF6D43", "#D54C01"],
		45: ["#55C2C2", "#009999"]
	};
})();