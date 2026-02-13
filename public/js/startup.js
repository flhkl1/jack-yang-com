/**
 * Startup sequence - displays ASCII art and welcome message
 */

import { addLine, streamLine } from './utils/dom.js';
import { CONFIG, WELCOME_MESSAGE } from './config.js';

/**
 * Gets the line type for welcome message lines
 * @param {string} line - Line text
 * @returns {string} CSS class name
 */
function getWelcomeLineType(line) {
  if (line === 'JACK YANG') {
    return 'title';
  }
  if (line === 'Available Commands:' || line === 'Contact Me:') {
    return 'section-heading';
  }
  return 'system';
}

/**
 * Displays welcome message with streaming effect
 * @param {HTMLElement} container - Container element
 * @param {HTMLElement} historyEl - History element
 * @param {number} startTime - Start time offset in ms
 */
function displayWelcomeMessage(container, historyEl, startTime) {
  const remainingTime = CONFIG.STARTUP_TOTAL_TIME_MS - startTime;
  const totalChars = WELCOME_MESSAGE.reduce((sum, line) => sum + line.length, 0);
  const charDelay = Math.max(1, Math.floor(remainingTime / totalChars));
  let currentTime = 0;

  WELCOME_MESSAGE.forEach((line) => {
    const lineType = getWelcomeLineType(line);
    
    setTimeout(() => {
      if (lineType === 'section-heading') {
        addLine(container, historyEl, line, lineType);
      } else {
        streamLine(container, historyEl, line, lineType, charDelay);
      }
    }, startTime + currentTime);
    
    currentTime += line.length * charDelay;
  });
}

/**
 * Displays ASCII art with cascading effect
 * @param {HTMLElement} container - Container element
 * @param {HTMLElement} historyEl - History element
 * @param {string} asciiArt - ASCII art text
 * @returns {number} Total time taken in ms
 */
function displayAsciiArt(container, historyEl, asciiArt) {
  const lines = asciiArt.trim().split('\n');
  const delay = CONFIG.ASCII_DELAY_MS;
  const totalTime = lines.length * delay;

  lines.forEach((line, i) => {
    setTimeout(() => {
      addLine(container, historyEl, line, 'ascii-art');
    }, i * delay);
  });

  return totalTime;
}

/**
 * Fallback welcome message (if ASCII art fails to load)
 * @param {HTMLElement} container - Container element
 * @param {HTMLElement} historyEl - History element
 */
function displayFallbackWelcome(container, historyEl) {
  WELCOME_MESSAGE.forEach((line) => {
    const lineType = getWelcomeLineType(line);
    addLine(container, historyEl, line, lineType);
  });
}

/**
 * Runs the startup sequence
 * @param {HTMLElement} container - Container element
 * @param {HTMLElement} historyEl - History element
 */
export function runStartupSequence(container, historyEl) {
  fetch('/ascii-art.txt')
    .then(res => res.text())
    .then(asciiArt => {
      const asciiTime = displayAsciiArt(container, historyEl, asciiArt);
      displayWelcomeMessage(container, historyEl, asciiTime);
    })
    .catch(() => {
      displayFallbackWelcome(container, historyEl);
    });
}
