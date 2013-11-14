var BackgroundUtils = {
	formatDate: function (date) {
		return date.getFullYear() + "-" +
			("0" + (date.getMonth() + 1)).substr(-2, 2) + "-" +
			("0" + date.getDate()).substr(-2, 2);
	},

	calculateMinutesNeeded: function (stepsCount, stepsGoal, stepsPerMinute) {
		var now = new Date(),
			elapsedDayPercent = (now.getHours() + (now.getMinutes() / 60)) / 24,
			stepsExpected = elapsedDayPercent * stepsGoal,
			stepsBehind = stepsExpected - stepsCount,
			stepsNeeded = stepsBehind / (1 - stepsGoal / stepsPerMinute / 60 / 24);

		return Math.ceil(stepsNeeded / stepsPerMinute);
	},

	renderBrowserActionIcon: function (intervalsNeeded) {
		var context = document.getElementById("canvas").getContext("2d"),
			palette = this.INDICATOR_COLORS[Math.min(0, Math.max(this.INDICATOR_COLORS.length - 1, intervalsNeeded))];

		context.clearRect(0, 0, 19, 19);
		context.lineWidth = 2;
		context.fillStyle = palette[0];
		context.strokeStyle = palette[1];

		context.beginPath();
		context.arc(9.5, 9.5, 8, 0, Math.PI * 2);
		context.fill(); context.stroke();

		chrome.browserAction.setIcon({
			imageData: context.getImageData(0, 0, 19, 19)
		});
	},

	INDICATOR_COLORS: [
		["#9ADE11", "#66C009"], // Green
		["#FFC807", "#F69400"], // Yellow
		["#FF6D43", "#D54C01"], // Red
		["#55C2C2", "#009999"]  // Blue
	],

	INDICATOR_INTERVAL: 15 // Minutes between color changes and notifications
};