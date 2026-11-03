import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export const navItemsFor = (role) => {
  const owner = role === 'owner';
  return [
    ...(owner ? [{ to: '/', label: 'Dashboard', icon: 'dashboard', end: true }] : []),
    { to: '/pos', label: 'Sell (POS)', icon: 'pos' },
    { to: '/products', label: 'Products', icon: 'products' },
    ...(owner ? [{ to: '/inventory', label: 'Inventory', icon: 'inventory' }] : []),
    { to: '/sales', label: 'Sales history', icon: 'sales' },
    { to: '/account', label: 'Account', icon: 'account' },
  ];
};

const iconPaths = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  pos: <><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.5a2 2 0 0 0 1.9-1.4L21 8H6" /><circle cx="10" cy="20" r="1" /><circle cx="18" cy="20" r="1" /></>,
  products: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="m4.5 7.7 7.5 4.4 7.5-4.4M12 12v9" /></>,
  inventory: <><path d="M4 7h16v13H4zM3 4h18v3H3z" /><path d="M9 11h6" /></>,
  sales: <><path d="M4 19V5M4 19h17" /><path d="m7 15 4-4 3 2 6-7" /></>,
  account: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
};

function NavIcon({ name }) {
  return <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{iconPaths[name]}</svg>;
}

export default function Layout() {
  const { profile, logout } = useAuth();
  const location = useLocation();
  const activeItem = navItemsFor(profile.role).find((item) => item.end ? location.pathname === item.to : location.pathname.startsWith(item.to));
  const firstName = profile.full_name?.trim().split(/\s+/)[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-brand">
          <span className="app-brand-mark" aria-hidden="true">T</span>
          <span className="app-brand-name">{profile.store_name}</span>
        </div>
        <div className="sidebar-caption">WORKSPACE</div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          {navItemsFor(profile.role).map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
              <NavIcon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <span className="user-avatar">{firstName.slice(0, 1).toUpperCase()}</span>
            <span className="sidebar-user-copy"><strong>{profile.full_name}</strong><small>{profile.role === 'owner' ? 'Owner' : 'Cashier'}</small></span>
          </div>
          <button className="sidebar-logout" onClick={logout}>Log out <span aria-hidden="true">↗</span></button>
        </div>
      </aside>
      <div className="app-workspace">
        <header className="app-topbar">
          <div>
            <div className="topbar-greeting">{greeting}, {firstName}</div>
            <div className="topbar-title">{activeItem?.label ?? 'Workspace'}</div>
          </div>
          <div className="topbar-actions">
            <div className="topbar-store"><span className="store-status-dot" />{profile.store_name}</div>
            <button className="btn btn-sm btn-outline-secondary topbar-logout" onClick={logout}>Log out</button>
          </div>
        </header>
        <main className="app-main"><Outlet /></main>
      </div>
    </div>
  );
}
