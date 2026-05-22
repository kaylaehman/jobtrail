import { Outlet, NavLink, Link } from 'react-router-dom';
import clsx from 'clsx';

export function Layout() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    clsx(
      'px-3 py-1.5 rounded-md text-sm font-medium transition',
      isActive
        ? 'bg-white/10 text-white'
        : 'text-slate-300 hover:bg-white/5 hover:text-white',
    );

  return (
    <div className="min-h-screen">
      <header className="bg-brand-navy border-b border-brand-navy-deep shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2">
          <Link to="/" className="flex items-center" aria-label="JobTrail home">
            <img
              src="/jobtrail-banner.png"
              alt="JobTrail — Track. Discover. Land."
              className="h-12 w-auto"
            />
          </Link>
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
