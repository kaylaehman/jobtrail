import { Outlet, NavLink } from 'react-router-dom';
import clsx from 'clsx';

export function Layout() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    clsx(
      'px-3 py-1.5 rounded-md text-sm font-medium',
      isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100',
    );

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧭</span>
            <span className="text-lg font-bold tracking-tight">JobTrail</span>
          </div>
          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={linkClass}>Dashboard</NavLink>
            <NavLink to="/discover" className={linkClass}>Discover</NavLink>
            <NavLink to="/jobs/new" className={linkClass}>+ Add Job</NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
