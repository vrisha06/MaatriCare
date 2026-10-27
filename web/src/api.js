const SESSION_KEY = 'mc:session';

export function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

export function saveSession(session) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
}

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export async function api(path, body) {
  const token = loadSession()?.token;
  let res;
  try {
    res = await fetch(path, {
      method: body ? 'POST' : 'GET',
      headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) },
      body: body && JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'No connection to the server');
  }
  const json = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== '/api/login') {
    saveSession(null);
    window.location.assign('/login');
  }
  if (!res.ok) throw new ApiError(res.status, json.error ?? 'Request failed', json.details);
  return json;
}
