# Terminal Portfolio - Code Structure

## Overview
This is a modular, industry-quality codebase for a terminal-style portfolio website.

## Directory Structure

```
js/
├── main.js                 # Entry point - initializes app
├── config.js              # Constants and configuration
├── auth.js                # Sudo authentication (session, password check)
├── terminal.js            # Terminal UI controller
├── startup.js             # Startup sequence logic
├── commands/
│   ├── index.js          # Command executor (orchestrates commands)
│   ├── definitions.js    # Static command definitions
│   └── handlers.js       # Command handlers (side effects)
└── utils/
    ├── dom.js            # DOM manipulation utilities
    └── parser.js         # Command parsing utilities
```

## Module Responsibilities

### `main.js`
- Application entry point
- Initializes Terminal and StartupSequence
- Handles DOM ready state

### `config.js`
- All constants (prompts, delays, URLs)
- Configuration values
- Static data (WHO_TEXT, WELCOME_MESSAGE)

### `auth.js`
- Sudo authentication state (sessionStorage)
- Password validation (placeholder; move to server for production)
- Used by hidden `sudo` and `guestbook` commands

### `terminal.js`
- Terminal UI controller class
- Handles user input and password mode (Mac-style sudo prompt)
- Manages command execution flow
- Event listener setup

### `startup.js`
- Startup sequence logic
- ASCII art display
- Welcome message streaming
- Fallback handling

### `commands/index.js`
- CommandExecutor class
- Coordinates command execution
- Handles output rendering
- Resolves command types

### `commands/definitions.js`
- Static command definitions
- Data-only commands (help, who, coursework)
- No side effects

### `commands/handlers.js`
- Command handlers with side effects
- External links, file operations
- Async operations (photos)
- Hidden commands: `sudo` (password flow), `guestbook` (locked behind sudo)

### `utils/dom.js`
- DOM manipulation utilities
- Line creation and streaming
- Scroll management

### `utils/parser.js`
- Command parsing
- Argument vector creation
- Command resolution

## Design Principles

1. **Separation of Concerns**: Each module has a single responsibility
2. **No Side Effects in Definitions**: Static data separated from handlers
3. **Dependency Injection**: Components receive dependencies via constructor
4. **Pure Functions**: Utilities are pure where possible
5. **Error Handling**: Graceful fallbacks for async operations
6. **Documentation**: JSDoc comments for all public APIs

## Adding New Commands

1. **Static Command**: Add to `commands/definitions.js`
2. **Command with Side Effects**: Add handler to `commands/handlers.js`
3. **Update**: Add to `COMMAND_ALIASES` in `config.js` if needed
4. **Update**: Add to `HELP_OUTPUT` in `commands/definitions.js` (omit for hidden commands)

## Hidden Commands

- **sudo** – Prompts for password (Mac-style `[sudo] password for jack:`). Auth state stored in sessionStorage. Placeholder password in `auth.js`; use server-side validation in production.
- **guestbook** – Locked behind sudo; shows "Guestbook (coming soon)." until implemented.
