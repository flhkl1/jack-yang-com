/**
 * Main entry point for terminal application
 */

import { Terminal } from './terminal.js';
import { runStartupSequence } from './startup.js';
import { isAuthenticated } from './auth.js';

/**
 * Initializes the application when DOM is ready
 */
function init() {
  const historyEl = document.getElementById('history');
  const historyContentEl = document.getElementById('history-content');
  const inputEl = document.getElementById('input');

  if (!historyEl || !historyContentEl || !inputEl) {
    console.error('Required DOM elements not found');
    return;
  }

  // Initialize terminal
  const terminal = new Terminal(historyEl, historyContentEl, inputEl);

  // Restore sudo-mode theme if already authenticated (e.g. after refresh)
  if (isAuthenticated()) {
    document.body.classList.add('sudo-mode');
  }

  // Run startup sequence
  runStartupSequence(historyContentEl, historyEl);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
