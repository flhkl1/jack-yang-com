// Runs after the app has booted: put the demo's own address back in the bar, so a reload
// of a share link lands on this page again and not on a path the site does not serve.
if (window.__demoShareReturn) history.replaceState(null, "", window.__demoShareReturn);
