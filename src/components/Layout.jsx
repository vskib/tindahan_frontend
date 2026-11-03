import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export const navItemsFor = (role) => {
  const owner = role === 'owner';
  return [
    ...(owner ? [{ to: '/', label: 'Dashboard', shortLabel: 'Home', icon: 'dashboard', end: true }] : []),
    { to: '/pos', label: 'Sell (POS)', shortLabel: 'Sell', icon: 'pos' },
    { to: '/products', label: 'Products', shortLabel: 'Items', icon: 'products' },
    ...(owner ? [{ to: '/inventory', label: 'Inventory', shortLabel: 'Stock', icon: 'inventory' }] : []),
    { to: '/sales', label: 'Sales history', shortLabel: 'Sales', icon: 'sales' },
    { to: '/account', label: 'Account', shortLabel: 'Account', icon: 'account' },
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
  const navItems = navItemsFor(profile.role);
  const activeItem = navItems.find((item) => item.end ? location.pathname === item.to : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`));
  const firstName = profile.full_name?.trim().split(/\s+/)[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-screen xl:grid xl:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="hidden flex-col border-r border-base-300 bg-base-100 p-4 xl:sticky xl:top-0 xl:flex xl:h-screen">
        <div className="flex min-w-0 items-center gap-3 px-1 pb-3 md:px-2 md:pb-8">
          <img className="h-10 w-10 shrink-0 object-contain" src="/grocery-store.png" alt="" />
          <span className="min-w-0 flex-1 whitespace-normal break-words text-base font-bold leading-tight">{profile.store_name}</span>
        </div>
        <div className="mb-2 px-3 text-xs font-bold tracking-widest text-base-content/50">WORKSPACE</div>
        <nav className="grid gap-1" aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition hover:bg-base-200${isActive ? ' bg-primary/10 font-semibold text-primary' : ' text-base-content/70'}`}>
              <NavIcon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto border-t border-base-300 pt-4">
          <div className="mb-3 flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 font-bold text-primary">{firstName.slice(0, 1).toUpperCase()}</span>
            <span className="grid min-w-0 leading-tight"><strong className="truncate text-sm">{profile.full_name}</strong><small className="text-xs text-base-content/60">{profile.role === 'owner' ? 'Owner' : 'Cashier'}</small></span>
          </div>
          <button className="btn btn-ghost btn-sm w-full justify-between" onClick={logout}>Log out <span aria-hidden="true">↗</span></button>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-base-300 bg-base-100/95 px-4 backdrop-blur sm:px-6 xl:px-8">
          <div className="mx-auto flex min-h-16 max-w-screen-xl items-center justify-between gap-4 md:min-h-20">
            <div className="flex min-w-0 items-center gap-3">
              <img className="size-9 shrink-0 object-contain xl:hidden" src="/grocery-store.png" alt="" />
              <div className="min-w-0">
                <div className="text-xs text-base-content/60">{greeting}, {firstName}</div>
                <div className="truncate font-bold">{activeItem?.label ?? 'Workspace'}</div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="hidden max-w-56 items-center gap-2 truncate rounded-lg border border-base-300 bg-base-100 px-3 py-2 text-xs font-semibold sm:flex"><span className="size-2 shrink-0 rounded-full bg-success" />{profile.store_name}</div>
              <button className="btn btn-ghost btn-sm xl:hidden" onClick={logout}>Log out</button>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-screen-xl px-4 pb-24 pt-5 sm:px-6 sm:pt-6 xl:px-8 xl:pb-8"><Outlet /></main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-base-300 bg-base-100/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgb(0_0_0/0.06)] backdrop-blur xl:hidden" aria-label="Main navigation">
        <div className="mx-auto flex max-w-3xl items-stretch justify-around">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} aria-label={item.label} className={({ isActive }) => `flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-medium leading-tight transition${isActive ? ' text-primary' : ' text-base-content/65 hover:text-base-content'}`}>
              {({ isActive }) => (
                <>
                  <NavIcon name={item.icon} />
                  <span className={`max-w-full truncate${isActive ? ' font-bold' : ''}`}>{item.shortLabel}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
