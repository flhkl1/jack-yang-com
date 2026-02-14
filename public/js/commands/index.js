/**
 * Command system - coordinates command execution
 */

import { COMMAND_DEFINITIONS } from './definitions.js';
import { COMMAND_HANDLERS, SUDO_REQUEST_PASSWORD } from './handlers.js';
import { resolveCommand } from '../utils/parser.js';
import { COMMAND_ALIASES } from '../config.js';

/**
 * Command executor class
 */
export class CommandExecutor {
  constructor(container, historyEl, addLineFn) {
    this.container = container;
    this.historyEl = historyEl;
    this.addLineFn = addLineFn;
  }

  /**
   * Executes a command
   * @param {string} cmd - Command name
   * @param {string} args - Command arguments
   * @returns {Array|null} Command output lines or null if command not found
   */
  execute(cmd, args) {
    // Combine all available commands for resolution
    const allCommands = {
      ...COMMAND_DEFINITIONS,
      ...COMMAND_HANDLERS,
    };
    
    const resolved = resolveCommand(cmd, COMMAND_ALIASES, allCommands);

    if (!resolved) {
      return null;
    }

    // Check static definitions first
    if (COMMAND_DEFINITIONS[resolved]) {
      return COMMAND_DEFINITIONS[resolved]();
    }

    // Check handlers
    if (COMMAND_HANDLERS[resolved]) {
      const handler = COMMAND_HANDLERS[resolved];

      if (resolved === 'clear') {
        return handler(this.container);
      }
      if (resolved === 'guestbook') {
        return handler(this.container, this.historyEl, this.addLineFn, args);
      }

      return handler();
    }

    return null;
  }

  /**
   * Determines the line type for command output
   * @param {string} command - Command name
   * @param {string} message - Output message
   * @param {number} index - Line index
   * @returns {string} CSS class name for line type
   */
  getLineType(command, message, index) {
    // Resolve command to handle aliases
    const allCommands = {
      ...COMMAND_DEFINITIONS,
      ...COMMAND_HANDLERS,
    };
    const resolved = resolveCommand(command, COMMAND_ALIASES, allCommands) || command;
    
    if (resolved === 'help' && (message === 'Available Commands:' || message === 'Contact Me:')) {
      return 'section-heading';
    }
    if (resolved === 'who') {
      return 'who-body';
    }
    return 'output';
  }

  /**
   * Renders command output
   * @param {string} command - Command name
   * @param {Array} output - Output lines
   */
  renderOutput(command, output) {
    if (!output || !Array.isArray(output)) {
      return;
    }

    output.forEach((msg, i) => {
      const lineType = this.getLineType(command, msg, i);
      
      if (typeof msg === 'object' && msg.html) {
        this.addLineFn(msg.html, lineType, true);
      } else {
        this.addLineFn(msg, lineType);
      }
    });
  }
}
