import { NavLink } from 'react-router-dom';
import { useSession } from '../App.jsx';
import { useOnline } from '../hooks.js';

const NAV = {
  asha: [['/', 'My patients'], ['/register', 'Register']],
  doctor: [['/', 'Worklist'], ['/referrals', 'Referrals']],
  admin: [['/', 'Dashboard'], ['/patients', 'Patients'], ['/referrals', 'Referrals']],
};

export default function Layout({ children }) {
  const { user, setSession } = useSession();
  const online = useOnline();
  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">MaatriCare<span>+</span></div>
        <nav>
          {NAV[user.role].map(([to, label]) => (
            <NavLink key={to} to={to} end>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="who">
          <span className={`dot ${online ? 'on' : 'off'}`} title={online ? 'Online' : 'Offline'} />
          <span className="who-name">{user.name}</span>
          <button className="link" onClick={() => setSession(null)}>Sign out</button>
        </div>
      </header>
      {!online && <div className="banner">You are offline. New records are saved on this device and sync when you reconnect.</div>}
      <main>{children}</main>
    </div>
  );
}
