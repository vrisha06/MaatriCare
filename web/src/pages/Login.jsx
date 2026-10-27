import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useSession } from '../App.jsx';

const DEMO_USERS = [
  ['asha.sunita', 'ASHA'],
  ['dr.anil', 'PHC doctor'],
  ['dr.kavita', 'District Hospital doctor'],
  ['admin', 'Block admin'],
];

export default function Login() {
  const { setSession } = useSession();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setSession(await api('/api/login', { username, password }));
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <form className="card login-card" onSubmit={submit}>
        <div className="brand big">MaatriCare<span>+</span></div>
        <p className="muted">Early risk detection and referral tracking for maternal care.</p>
        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <div className="demo-users">
          <span className="muted small">Demo accounts:</span>
          {DEMO_USERS.map(([u, role]) => (
            <button type="button" key={u} className="chip" onClick={() => setUsername(u)} title={role}>
              {u}
            </button>
          ))}
        </div>
        <Link to="/chat" className="small">Health guide for mothers (no login needed) →</Link>
      </form>
    </div>
  );
}
