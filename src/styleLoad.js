//helper js to prevent Flash of Unloaded Content (FOUC) stuff that's been annoying me
function initPage() {
	function showContent() {
		//some of this might be redundant now :/
		const body = document.body;
		body.style.opacity = '1';
		body.style.visibility = 'visible';
		
		const criticalCss = document.getElementById('critical-css');
		if (criticalCss) {
		criticalCss.remove();
		}
	}

	if (document.readyState === 'complete') {
		showContent();
	} else {
		window.addEventListener('load', showContent);
		setTimeout(showContent, 3000); //3 seconds
	}
}

// Start initialization
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initPage);
} else {
  	initPage();
}