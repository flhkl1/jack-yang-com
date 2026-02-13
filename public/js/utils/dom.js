/**
 * DOM manipulation utilities for terminal interface
 */

/**
 * Scrolls the history container to the bottom
 * @param {HTMLElement} historyEl - The history container element
 */
function scrollToBottom(historyEl) {
  historyEl.scrollTop = historyEl.scrollHeight;
}

/**
 * Creates a line element with specified type and content
 * @param {string} text - Text content
 * @param {string} type - CSS class type (default: 'output')
 * @param {boolean} isHtml - Whether to set innerHTML instead of textContent
 * @returns {HTMLElement} Created line element
 */
function createLineElement(text, type = 'output', isHtml = false) {
  const line = document.createElement('div');
  line.className = `line ${type}`;
  if (isHtml) {
    line.innerHTML = text;
  } else {
    line.textContent = text;
  }
  return line;
}

/**
 * Adds a line to the terminal history
 * @param {HTMLElement} container - Container element to append to
 * @param {HTMLElement} historyEl - History element for scrolling
 * @param {string} text - Text content
 * @param {string} type - Line type CSS class
 * @param {boolean} isHtml - Whether content is HTML
 */
export function addLine(container, historyEl, text, type = 'output', isHtml = false) {
  const line = createLineElement(text, type, isHtml);
  container.appendChild(line);
  scrollToBottom(historyEl);
}

/**
 * Streams text character by character to create a typing effect
 * @param {HTMLElement} container - Container element to append to
 * @param {HTMLElement} historyEl - History element for scrolling
 * @param {string} text - Text to stream
 * @param {string} type - Line type CSS class
 * @param {number} charDelay - Delay between characters in ms
 * @param {Function} callback - Optional callback when streaming completes
 */
export function streamLine(container, historyEl, text, type = 'output', charDelay = 10, callback = null) {
  const line = createLineElement('', type);
  container.appendChild(line);
  
  let i = 0;
  function tick() {
    if (i < text.length) {
      line.textContent += text[i];
      i += 1;
      scrollToBottom(historyEl);
      setTimeout(tick, charDelay);
    } else if (callback) {
      callback();
    }
  }
  setTimeout(tick, charDelay);
}

/**
 * Adds a prompt line showing user input
 * @param {HTMLElement} container - Container element to append to
 * @param {HTMLElement} historyEl - History element for scrolling
 * @param {string} text - Command text
 * @param {string} prompt - Prompt prefix
 * @param {boolean} mask - Whether to mask the input
 */
export function addPromptLine(container, historyEl, text, prompt, mask = false) {
  const line = document.createElement('div');
  line.className = 'line prompt';
  
  const span = document.createElement('span');
  span.className = 'prompt-prefix';
  span.textContent = prompt;
  line.appendChild(span);
  
  line.appendChild(document.createTextNode(mask ? '****' : text));
  container.appendChild(line);
  scrollToBottom(historyEl);
}
