import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export const navItemsFor = (role) => {
  const owner = role === 'owner';
  return [
    ...(owner ? [{ to: '/', label: 'Dashboard', end: true }] : []),
    { to: '/pos', label: 'Sell (POS)' },
    { to: '/products', label: 'Products' },
    ...(owner ? [{ to: '/inventory', label: 'Inventory' }] : []),
    { to: '/sales', label: 'Sales history' },
    { to: '/account', label: 'Account' },
  ];
};

export default function Layout() {
  const { profile, logout } = useAuth();
  const [open, setOpen] = useState(false);
  useLocation();                                    // re-render on navigation
  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark sticky-top">
        <div className="container-fluid">
          <span className="navbar-brand">🏪 {profile.store_name}</span>
          <button className="navbar-toggler" type="button" aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            <span className="navbar-toggler-icon" />
          </button>
          <div className={`collapse navbar-collapse ${open ? 'show' : ''}`}>
            <ul className="navbar-nav me-auto">
              {navItemsFor(profile.role).map((n) => (
                <li className="nav-item" key={n.to}>
                  <NavLink to={n.to} end={n.end} onClick={() => setOpen(false)} className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>{n.label}</NavLink>
                </li>
              ))}
            </ul>
            <span className="navbar-text me-3 small">{profile.full_name} · {profile.role === 'owner' ? 'Owner' : 'Cashier'}</span>
            <button className="btn btn-outline-light btn-sm" onClick={logout}>Log out</button>
          </div>
        </div>
      </nav>
      <main className="container-fluid py-3" style={{ maxWidth: 1400 }}><Outlet /></main>
    </>
  );
}
