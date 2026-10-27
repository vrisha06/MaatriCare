import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 32).toString('hex')}`;
}

function checkPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  return timingSafeEqual(Buffer.from(hash, 'hex'), scryptSync(password, salt, 32));
}

const publicUser = ({ password_hash, ...u }) => u;

export function login(db, username, password) {
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username ?? '');
  if (!user || !checkPassword(password ?? '', user.password_hash)) return null;
  const token = randomBytes(24).toString('hex');
  db.prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)').run(token, user.id, new Date().toISOString());
  return { token, user: publicUser(user) };
}

export function authenticate(db) {
  return (req, res, next) => {
    const token = req.get('authorization')?.replace(/^Bearer /, '');
    const user = token && db.prepare('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?').get(token);
    if (!user) return res.status(401).json({ error: 'Not signed in' });
    req.user = publicUser(user);
    next();
  };
}

export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'Not allowed for your role' });
