chrome.browserAction.setBadgeBackgroundColor({color: "#677984"});

(function () {
	var socket = io.connect("http://askullsoon.com:1114"),
		userId = localStorage.getItem("userId");

	socket.emit("initialize", userId);

	var newTab;
	socket.on("requestToken", function (requestToken) {
		chrome.tabs.create({
			url: "https://www.fitbit.com/oauth/authenticate?oauth_token=" + requestToken
		}, function (tab) {
			newTab = tab;
		});
	});

	socket.on("initialized", function (userId) {
		if (newTab && !newTab.active) return; // Another device is initializing for the first time
		localStorage.setItem("userId", userId);
		socket.emit("activities", userId, BackgroundUtils.formatDate(new Date()));
		chrome.tabs.remove(newTab.id);
	});

	var stepsCount, stepsGoal;
	socket.on("activities", function (newStepsCount, newStepsGoal) {
		stepsCount = newStepsCount; stepsGoal = newStepsGoal;
		updateMinutesNeeded(BackgroundUtils.calculateMinutesNeeded(stepsCount, stepsGoal, 100));
	});

	chrome.alarms.create("fitbitMotivator", {
		periodInMinutes: 1
	});

	var today = new Date().getDate();
	chrome.alarms.onAlarm.addListener(function () {
		var newDate = new Date().getDate();
		if (today !== newDate) {
			today = newDate;
			stepsCount = 0;
		}

		updateMinutesNeeded(BackgroundUtils.calculateMinutesNeeded(stepsCount, stepsGoal, 100));
	});

	var minutesNeeded, intervalsNeeded;
	function updateMinutesNeeded(newMinutesNeeded) {
		if (minutesNeeded === newMinutesNeeded) return;

		var newIntervalsNeeded = newMinutesNeeded / BackgroundUtils.INDICATOR_INTERVAL;
		if (newIntervalsNeeded > intervalsNeeded && newIntervalsNeeded > 0) {
			webkitNotifications.createNotification(
				"icon48.png",
				"Get Walking!",
				"You need to walk for " + newMinutesNeeded  + " minute(s)."
			).show();
		}

		BackgroundUtils.renderBrowserActionIcon(newIntervalsNeeded);

		if (newMinutesNeeded > 0) {
			chrome.browserAction.setTitle({title: "Walk for " + newMinutesNeeded + " minute(s)"});
			chrome.browserAction.setBadgeText({
				text: "" + newMinutesNeeded
			});
		} else if (minutesNeeded > 0) { // Only clear the text if it currently has text
			chrome.browserAction.setBadgeText({text: ""});
		}

		intervalsNeeded = newIntervalsNeeded;
		minutesNeeded = newMinutesNeeded;
	}
})();