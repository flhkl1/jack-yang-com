/**
 * Command handlers - executes commands and returns output
 */

import { isAuthenticated } from '../auth.js';

/** Sentinel returned by sudo to request password flow (do not list in help). */
export const SUDO_REQUEST_PASSWORD = { __sudoRequestPassword: true };

/**
 * Handles the hidden sudo command. Returns a sentinel so the terminal enters password mode.
 * @returns {{ __sudoRequestPassword: true }}
 */
export function handleSudo() {
  return SUDO_REQUEST_PASSWORD;
}

/**
 * Handles the hidden guestbook command (locked behind sudo).
 * Usage: guestbook | guestbook sign "Name" "Message"
 * @param {HTMLElement} container
 * @param {HTMLElement} historyEl
 * @param {Function} addLineFn
 * @param {string} args - Rest of command (e.g. "sign Name Message")
 * @returns {Array<string>} Empty when async; lines when sync (e.g. not authenticated)
 */
export function handleGuestbook(container, historyEl, addLineFn, args) {
  if (!isAuthenticated()) {
    return ["guestbook requires sudo. Run 'sudo' first."];
  }

  const trimmed = (args || '').trim();
  const isSign = /^sign\s+/i.test(trimmed);

  if (isSign) {
    const rest = trimmed.replace(/^sign\s+/i, '').trim();
    let name = '';
    let message = '';
    const matchQuoted = rest.match(/^"([^"]*)"\s*"([^"]*)"?$/);
    if (matchQuoted) {
      name = matchQuoted[1].trim();
      message = (matchQuoted[2] || '').trim();
    } else {
      const space = rest.indexOf(' ');
      if (space === -1) {
        name = rest;
      } else {
        name = rest.slice(0, space).trim();
        message = rest.slice(space + 1).replace(/^["']|["']$/g, '').trim();
      }
    }
    if (!name) {
      return ['Usage: guestbook sign "Name" "Message"  or  guestbook sign Name message'];
    }
    fetch('/api/guestbook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, message: message || '(signed)' }),
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.ok) {
          addLineFn('Signed the guestbook.', 'output');
        } else {
          addLineFn(data && data.error ? data.error : 'Failed to sign.', 'error');
        }
      })
      .catch(() => addLineFn('Failed to sign guestbook.', 'error'));
    return [];
  }

  fetch('/api/guestbook')
    .then(res => res.json())
    .then(entries => {
      if (!Array.isArray(entries) || entries.length === 0) {
        addLineFn('No signatures yet. To sign: guestbook sign "Your Name" "Your message"', 'output');
        return;
      }
      addLineFn('--- Guestbook ---', 'section-heading');
      entries.slice(0, 50).forEach(entry => {
        const date = entry.date ? new Date(entry.date).toLocaleDateString() : '';
        addLineFn(`${entry.name}: ${entry.message} (${date})`, 'output');
      });
      addLineFn('', 'output');
      addLineFn('To sign: guestbook sign "Your Name" "Your message"', 'output');
    })
    .catch(() => addLineFn('Could not load guestbook.', 'error'));
  return [];
}

/**
 * Handles the clear command
 * @param {HTMLElement} container - Container to clear
 * @returns {Array} Empty array (no output)
 */
export function handleClear(container) {
  container.innerHTML = '';
  return [];
}

/**
 * Handles external link commands
 * @param {string} url - URL to open
 * @param {string} message - Success message
 * @returns {Array<string>} Array with success message
 */
export function handleExternalLink(url, message) {
  window.open(url, '_blank');
  return [message];
}

/**
 * Command handler map
 */
export const COMMAND_HANDLERS = {
  clear: handleClear,
  sudo: handleSudo,
  guestbook: (container, historyEl, addLineFn, args) => handleGuestbook(container, historyEl, addLineFn, args),
  blog: () => handleExternalLink('https://jackyang03.substack.com', 'Opening blog...'),
  resume: () => handleExternalLink('/assets/NewestResume.pdf', 'Opening resume...'),
  email: () => handleExternalLink('mailto:jackyang03@berkeley.edu', 'Opening email...'),
  linkedin: () => handleExternalLink('https://linkedin.com/in/jackyang03', 'Opening LinkedIn...'),
  github: () => handleExternalLink('https://github.com/flhkl1', 'Opening GitHub...'),
};
