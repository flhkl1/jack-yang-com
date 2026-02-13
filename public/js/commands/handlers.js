/**
 * Command handlers - executes commands and returns output
 */

import { COMMAND_DEFINITIONS } from './definitions.js';
import { CONFIG } from '../config.js';

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
 * Handles the life command - displays photos
 * @param {HTMLElement} container - Container to append photos to
 * @param {HTMLElement} historyEl - History element for scrolling
 * @param {Function} addLineFn - Function to add lines
 * @returns {Array} Empty array (output handled asynchronously)
 */
export function handleLife(container, historyEl, addLineFn) {
  fetch('/api/photos')
    .then(res => res.json())
    .then(photos => {
      if (!photos || photos.length === 0) {
        addLineFn('No photos found.', 'output');
        return;
      }
      
      photos.forEach((photo, index) => {
        setTimeout(() => {
          const imgContainer = document.createElement('div');
          imgContainer.className = 'line photo-container';
          
          const img = document.createElement('img');
          img.src = `/assets/photos/${photo}`;
          img.className = 'photo-image';
          img.alt = photo;
          imgContainer.appendChild(img);
          container.appendChild(imgContainer);
          historyEl.scrollTop = historyEl.scrollHeight;
          
          setTimeout(() => {
            const filenameLine = document.createElement('div');
            filenameLine.className = 'line photo-filename';
            filenameLine.textContent = photo;
            container.appendChild(filenameLine);
            historyEl.scrollTop = historyEl.scrollHeight;
          }, CONFIG.PHOTO_FILENAME_DELAY_MS);
        }, index * CONFIG.PHOTO_DELAY_MS);
      });
    })
    .catch(() => {
      addLineFn('Error loading photos.', 'error');
    });
  
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
  life: handleLife,
  blog: () => handleExternalLink('https://jackyang03.substack.com', 'Opening blog...'),
  resume: () => handleExternalLink('/assets/NewestResume.pdf', 'Opening resume...'),
  email: () => handleExternalLink('mailto:jackyang03@berkeley.edu', 'Opening email...'),
  linkedin: () => handleExternalLink('https://linkedin.com/in/jackyang03', 'Opening LinkedIn...'),
  github: () => handleExternalLink('https://github.com/flhkl1', 'Opening GitHub...'),
};
