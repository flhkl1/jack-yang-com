/* Site-wide light/dark toggle. Defaults to light, remembers choice. */
(function() {
  var root = document.documentElement;
  var stored = null;

  try {
    stored = localStorage.getItem('site-theme');
  } catch (e) {
    // Private browsing / storage disabled — fall back to the default theme.
  }

  if (stored) root.setAttribute('data-theme', stored);

  var btn = document.querySelector('.theme-toggle');
  if (!btn) return;

  btn.addEventListener('click', function() {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try {
      localStorage.setItem('site-theme', next);
    } catch (e) {
      // Non-fatal: the theme still applies for this page view.
    }
  });
})();
