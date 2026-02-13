(function () {
  'use strict';

  const historyEl = document.getElementById('history');
  const inputEl = document.getElementById('input');

  let storedPassword = null;
  let pendingCommand = null;

  function addLine(text, type) {
    type = type || 'output';
    const line = document.createElement('div');
    line.className = 'line ' + type;
    line.textContent = text;
    historyEl.appendChild(line);
    historyEl.scrollTop = historyEl.scrollHeight;
  }

  function addPromptLine(text, mask) {
    const line = document.createElement('div');
    line.className = 'line prompt';
    line.textContent = mask ? '****' : text;
    historyEl.appendChild(line);
    historyEl.scrollTop = historyEl.scrollHeight;
  }

  const localCommands = {
    help: function () {
      return [
        'Available commands:',
        '  help     - Show this message',
        '  clear    - Clear terminal history',
        '  whoami   - Display user info',
        '  date     - Show system date/time',
        '  echo     - Echo arguments (e.g. echo hello)',
        '  contact  - Contact information',
        '  ls       - List directory',
        '',
        'Unknown commands are sent to the remote system (password required on first use).',
      ];
    },
    clear: function () {
      historyEl.innerHTML = '';
      return [];
    },
    whoami: function () {
      return ['user: jack', 'host: jack-yang.com', 'shell: /bin/zsh'];
    },
    date: function () {
      return [new Date().toLocaleString()];
    },
    echo: function (args) {
      return [args.trim() || '(empty)'];
    },
    contact: function () {
      return [
        '--- CONTACT ---',
        'Reach out: see links in footer or resume.',
      ];
    },
    ls: function () {
      return ['about.txt', 'projects/', 'blog/', 'contact.txt', 'README'];
    },
  };

  function isLocalCommand(cmd) {
    return Object.prototype.hasOwnProperty.call(localCommands, cmd);
  }

  function runLocalCommand(cmd, args) {
    const fn = localCommands[cmd];
    if (!fn) return;
    const result = fn(args);
    if (Array.isArray(result) && result.length) {
      result.forEach(function (msg) {
        addLine(msg, 'output');
      });
    }
  }

  function sendToServer(command, password) {
    return fetch('/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: command, password: password || '' }),
    })
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        if (data.type === 'chat' && data.content) {
          addLine(data.content, 'output');
        }
      })
      .catch(function () {
        addLine('Remote system unavailable.', 'error');
      });
  }

  function handleSubmit() {
    const raw = inputEl.value.trim();
    const parts = raw.split(/\s+/);
    const cmd = (parts[0] || '').toLowerCase();
    const args = parts.slice(1).join(' ');

    inputEl.value = '';

    if (pendingCommand !== null) {
      addPromptLine(raw, true);
      storedPassword = raw;
      const commandToSend = pendingCommand;
      pendingCommand = null;
      addLine('Authenticated. Sending command...', 'system');
      sendToServer(commandToSend, storedPassword);
      return;
    }

    addPromptLine(raw || ' ');

    if (!raw) return;

    if (cmd === 'clear') {
      runLocalCommand('clear');
      return;
    }

    if (isLocalCommand(cmd)) {
      runLocalCommand(cmd, args);
      return;
    }

    if (!storedPassword) {
      pendingCommand = raw;
      addLine('Password required for remote access:', 'system');
      return;
    }

    sendToServer(raw, storedPassword);
  }

  inputEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  });

  inputEl.focus();
  document.body.addEventListener('click', function () {
    inputEl.focus();
  });
})();
