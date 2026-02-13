/**
 * Command parsing utilities
 */

/**
 * Parses raw input into an array of command argument vectors
 * Supports command chaining with &&
 * @param {string} raw - Raw input string
 * @returns {Array<Array<string>>} Array of command argument vectors
 * @example
 * parseArgv('who && skills') // [['who'], ['skills']]
 * parseArgv('echo hello world') // [['echo', 'hello', 'world']]
 */
export function parseArgv(raw) {
  const tokens = raw.trim().split(/\s+/).filter(Boolean);
  const commands = [];
  let current = [];
  
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] === '&&') {
      if (current.length) {
        commands.push(current);
        current = [];
      }
    } else {
      current.push(tokens[i]);
    }
  }
  
  if (current.length) {
    commands.push(current);
  }
  
  return commands;
}

/**
 * Resolves a command name, checking aliases
 * @param {string} cmd - Command name
 * @param {Object} aliases - Map of aliases to commands
 * @param {Object} commands - Map of available commands
 * @returns {string|null} Resolved command name or null if not found
 */
export function resolveCommand(cmd, aliases, commands) {
  if (commands.hasOwnProperty(cmd)) {
    return cmd;
  }
  if (aliases.hasOwnProperty(cmd)) {
    return aliases[cmd];
  }
  return null;
}
