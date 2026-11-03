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
  return <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{iconPaths[name]}</svg>;
}

export default function Layout() {
  const { profile, logout } = useAuth();
  const location = useLocation();
  const activeItem = navItemsFor(profile.role).find((item) => item.end ? location.pathname === item.to : location.pathname.startsWith(item.to));
  const firstName = profile.full_name?.trim().split(/\s+/)[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-screen md:grid md:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="flex flex-col border-b border-base-300 bg-base-100 p-3 md:sticky md:top-0 md:h-screen md:border-b-0 md:border-r md:p-4">
        <div className="flex min-w-0 items-center gap-3 px-1 pb-3 md:px-2 md:pb-8">
          <img className="h-10 w-10 shrink-0 object-contain" src="/grocery-store.png" alt="" />
          <span className="truncate text-lg font-bold">{profile.store_name}</span>
        </div>
        <div className="mb-2 hidden px-3 text-xs font-bold tracking-widest text-base-content/40 md:block">WORKSPACE</div>
        <nav className="flex gap-1 overflow-x-auto md:grid md:overflow-visible" aria-label="Main navigation">
          {navItemsFor(profile.role).map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition hover:bg-base-200 md:w-full${isActive ? ' bg-primary/10 font-semibold text-primary' : ' text-base-content/70'}`}>
              <NavIcon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto hidden border-t border-base-300 pt-4 md:block">
          <div className="mb-3 flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 font-bold text-primary">{firstName.slice(0, 1).toUpperCase()}</span>
            <span className="grid min-w-0 leading-tight"><strong className="truncate text-sm">{profile.full_name}</strong><small className="text-xs text-base-content/60">{profile.role === 'owner' ? 'Owner' : 'Cashier'}</small></span>
          </div>
          <button className="btn btn-ghost btn-sm w-full justify-between" onClick={logout}>Log out <span aria-hidden="true">↗</span></button>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-4 border-b border-base-300 bg-base-100/90 px-4 backdrop-blur md:min-h-20 md:px-8">
          <div>
            <div className="text-xs text-base-content/60">{greeting}, {firstName}</div>
            <div className="font-bold">{activeItem?.label ?? 'Workspace'}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-lg border border-base-300 bg-base-100 px-3 py-2 text-xs font-semibold sm:flex"><span className="size-2 rounded-full bg-success" />{profile.store_name}</div>
            <button className="btn btn-ghost btn-sm md:hidden" onClick={logout}>Log out</button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-screen-2xl p-4 sm:p-6 lg:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
