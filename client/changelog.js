for (var i = 0; i < BackgroundUtils.INDICATOR_COLORS.length; i++) {
	BackgroundUtils.renderIcon(document.getElementById("canvas" + i).getContext("2d"), BackgroundUtils.INDICATOR_COLORS[i]);
}