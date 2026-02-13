/**
 * Terminal UI controller
 */

import { parseArgv } from './utils/parser.js';
import { addLine, addPromptLine } from './utils/dom.js';
import { CommandExecutor } from './commands/index.js';
import { CONFIG } from './config.js';

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
    const raw = this.inputEl.value.trim();
    this.inputEl.value = '';
    
    if (!raw) {
      return;
    }

    const commands = parseArgv(raw);
    commands.forEach((argv) => {
      this.addPrompt(argv.join(' '));
      this.runCommand(argv);
    });
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

    this.executor.renderOutput(cmd, output);
  }
}
