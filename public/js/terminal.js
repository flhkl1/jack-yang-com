/**
 * Terminal UI controller
 */

import { parseArgv } from './utils/parser.js';
import { addLine, addPromptLine } from './utils/dom.js';
import { CommandExecutor } from './commands/index.js';
import { CONFIG } from './config.js';
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
    this.initialize();
  }

  /**
   * Initializes event listeners
   */
  initialize() {
    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleSubmit();
      }
    });

    this.inputEl.focus();
    
    document.body.addEventListener('click', (e) => {
      if (e.target.tagName !== 'A') {
        this.inputEl.focus();
      }
    });
  }

  /**
   * Handles command submission
   */
  handleSubmit() {
    const raw = this.inputEl.value;
    const trimmed = raw.trim();
    this.inputEl.value = '';

    if (!trimmed) {
      return;
    }

    if (this.waitingForPassword) {
      void this.handlePasswordSubmit(trimmed);
      return;
    }

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
