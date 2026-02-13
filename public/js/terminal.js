/**
 * Terminal UI controller
 */

import { parseArgv } from './utils/parser.js';
import { addLine, addPromptLine } from './utils/dom.js';
import { CommandExecutor } from './commands/index.js';
import { CONFIG, VISIBLE_COMMANDS } from './config.js';
import { authenticate } from './auth.js';

/**
 * Terminal controller class
 */
export class Terminal {
  constructor(historyEl, historyContentEl, inputEl) {
    this.historyEl = historyEl;
    this.historyContentEl = historyContentEl;
    this.inputEl = inputEl;
    this.executor = new CommandExecutor(
      historyContentEl,
      historyEl,
      (text, type, isHtml) => addLine(historyContentEl, historyEl, text, type, isHtml)
    );
    /** @type {boolean} */
    this.waitingForPassword = false;
    /** @type {string[]} */
    this.commandHistory = [];
    /** @type {number} */
    this.historyIndex = -1;
    this.cursorMirror = document.getElementById('cursor-mirror');
    this.cursorBlock = document.getElementById('cursor-block');
    this.initialize();
  }

  /**
   * Initializes event listeners
   */
  initialize() {
    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        this.handleTabComplete();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleSubmit();
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.historyPrev();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.historyNext();
        return;
      }
    }, { capture: true });

    this.inputEl.addEventListener('input', () => this.updateCursorPosition());
    this.inputEl.addEventListener('focus', () => this.updateCursorPosition());
    this.inputEl.focus();

    document.body.addEventListener('click', (e) => {
      if (e.target.tagName !== 'A') {
        this.inputEl.focus();
      }
    });
  }

  /**
   * Updates the block cursor position to match the end of the input text.
   */
  updateCursorPosition() {
    if (!this.cursorMirror || !this.cursorBlock) return;
    const mirror = this.cursorMirror;
    const block = this.cursorBlock;
    const val = this.inputEl.value || '';
    mirror.textContent = this.inputEl.type === 'password'
      ? '•'.repeat(val.length)
      : val;
    block.style.left = `${mirror.offsetWidth}px`;
  }

  /**
   * Moves to the previous command in history.
   */
  historyPrev() {
    if (this.waitingForPassword || this.commandHistory.length === 0) return;
    if (this.historyIndex < 0) {
      this.historyIndex = this.commandHistory.length - 1;
    } else if (this.historyIndex > 0) {
      this.historyIndex--;
    } else {
      return;
    }
    this.inputEl.value = this.commandHistory[this.historyIndex];
    this.updateCursorPosition();
  }

  /**
   * Tab autocomplete for visible 1st-layer commands.
   */
  handleTabComplete() {
    if (this.waitingForPassword) return;
    const raw = this.inputEl.value;
    const trimmed = raw.trimStart();
    const firstSpace = trimmed.indexOf(' ');
    const prefix = firstSpace === -1 ? trimmed.toLowerCase() : trimmed.slice(0, firstSpace).toLowerCase();
    const rest = firstSpace === -1 ? '' : trimmed.slice(firstSpace);

    const matches = VISIBLE_COMMANDS.filter((c) =>
      c.toLowerCase().startsWith(prefix)
    );

    if (matches.length === 0) return;

    if (matches.length === 1) {
      this.inputEl.value = matches[0] + (rest || ' ');
      this.updateCursorPosition();
      return;
    }

    const common = this.longestCommonPrefix(matches.map((m) => m.toLowerCase()));
    if (common.length > prefix.length) {
      this.inputEl.value = common + (rest || '');
      this.updateCursorPosition();
      return;
    }

    addLine(this.historyContentEl, this.historyEl, matches.sort().join('  '), 'output');
  }

  /**
   * @param {string[]} strings
   * @returns {string}
   */
  longestCommonPrefix(strings) {
    if (!strings.length) return '';
    let i = 0;
    while (strings[0][i] && strings.every((s) => s[i] === strings[0][i])) i++;
    return strings[0].slice(0, i);
  }

  /**
   * Moves to the next command in history.
   */
  historyNext() {
    if (this.waitingForPassword || this.commandHistory.length === 0 || this.historyIndex < 0) return;
    if (this.historyIndex >= this.commandHistory.length - 1) {
      this.historyIndex = -1;
      this.inputEl.value = '';
    } else {
      this.historyIndex++;
      this.inputEl.value = this.commandHistory[this.historyIndex];
    }
    this.updateCursorPosition();
  }

  /**
   * Handles command submission
   */
  handleSubmit() {
    const raw = this.inputEl.value;
    const trimmed = raw.trim();
    this.inputEl.value = '';
    this.updateCursorPosition();

    if (!trimmed) {
      return;
    }

    if (this.waitingForPassword) {
      void this.handlePasswordSubmit(trimmed);
      return;
    }

    this.commandHistory.push(trimmed);
    this.historyIndex = -1;

    const commands = parseArgv(trimmed);
    commands.forEach((argv) => {
      this.addPrompt(argv.join(' '));
      this.runCommand(argv);
    });
  }

  /**
   * Enters sudo password mode: shows Mac-style prompt and masks next input.
   */
  enterPasswordMode() {
    const promptText = `${CONFIG.SUDO_PROMPT_PREFIX}${CONFIG.SUDO_USER}:`;
    addLine(this.historyContentEl, this.historyEl, promptText, 'sudo-prompt');
    this.waitingForPassword = true;
    this.inputEl.type = 'password';
    this.inputEl.placeholder = 'Password:';
  }

  /**
   * Handles submission of the sudo password.
   * @param {string} password - User input (password).
   */
  async handlePasswordSubmit(password) {
    addPromptLine(
      this.historyContentEl,
      this.historyEl,
      '****',
      CONFIG.PROMPT,
      true
    );
    this.exitPasswordMode();

    const ok = await authenticate(password);
    if (ok) {
      addLine(this.historyContentEl, this.historyEl, 'Authentication successful.', 'output');
    } else {
      addLine(this.historyContentEl, this.historyEl, 'Sorry, try again.', 'error');
    }
  }

  /**
   * Exits sudo password mode and restores normal input.
   */
  exitPasswordMode() {
    this.waitingForPassword = false;
    this.inputEl.type = 'text';
    this.inputEl.placeholder = '';
  }

  /**
   * Adds a prompt line
   * @param {string} text - Command text
   */
  addPrompt(text) {
    addPromptLine(
      this.historyContentEl,
      this.historyEl,
      text,
      CONFIG.PROMPT
    );
  }

  /**
   * Runs a single command
   * @param {Array<string>} argv - Command argument vector
   */
  runCommand(argv) {
    if (!argv.length) {
      return;
    }

    const cmd = argv[0].toLowerCase();
    const args = argv.slice(1).join(' ');

    if (cmd === 'clear') {
      this.executor.execute('clear');
      return;
    }

    const output = this.executor.execute(cmd, args);

    if (output === null) {
      addLine(
        this.historyContentEl,
        this.historyEl,
        "Unknown command. Type 'help' for available commands.",
        'output'
      );
      return;
    }

    if (output && output.__sudoRequestPassword === true) {
      this.enterPasswordMode();
      return;
    }

    this.executor.renderOutput(cmd, output);
  }
}
