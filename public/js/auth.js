/**
 * Sudo authentication state and password validation.
 * Password is validated server-side via /api/sudo (reads from .env).
 */

const SESSION_KEY = 'jack_yang_sudo_auth';

/**
 * @returns {boolean} Whether the current session has passed sudo authentication.
 */
export function isAuthenticated() {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Attempts to authenticate with the given password via server API.
 * @param {string} password - User-supplied password.
 * @returns {Promise<boolean>} True if authentication succeeded.
 */
export async function authenticate(password) {
  try {
    const res = await fetch('/api/sudo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: String(password) }),
    });
    const data = await res.json();
    const ok = data && data.ok === true;
    if (ok) {
      sessionStorage.setItem(SESSION_KEY, '1');
    }
    return ok;
  } catch {
    return false;
  }
}

/**
 * Clears sudo authentication for this session.
 */
export function logout() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}
