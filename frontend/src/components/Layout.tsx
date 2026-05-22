import { Outlet, NavLink, Link } from 'react-router-dom';
import clsx from 'clsx';
import { useAppSettings } from '../lib/settings-context';

export function Layout() {
  const { settings } = useAppSettings();
  // Banner persists across every page until the user fills in their contact email — required
  // by SEC EDGAR's fair-use policy. Hidden while settings are still loading to avoid a flash.
  const needsContactEmail = Boolean(settings && !settings.contactEmail);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    clsx(
      'px-3 py-1.5 rounded-md text-sm font-medium transition',
      isActive
        ? 'bg-white/10 text-white'
        : 'text-slate-300 hover:bg-white/5 hover:text-white',
    );

  return (
    <div className="min-h-screen">
      <header className="bg-brand-navy border-b border-slate-800 shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2">
          <Link to="/" className="flex items-center" aria-label="JobTrail home">
            <img
              src="/jobtrail-header.png"
              alt="JobTrail"
              className="h-10 w-auto"
            />
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={linkClass}>Dashboard</NavLink>
            <NavLink to="/discover" className={linkClass}>Discover</NavLink>
            <NavLink to="/companies" className={linkClass}>Companies</NavLink>
            <NavLink to="/jobs/new" className={linkClass}>+ Add Job</NavLink>
            <NavLink to="/settings" className={linkClass} aria-label="Settings">⚙️</NavLink>
          </nav>
        </div>
      </header>
      {needsContactEmail && (
        <div className="bg-amber-900/40 border-b border-amber-700/60 text-amber-100">
          <div className="mx-auto max-w-6xl px-4 py-2 text-sm flex flex-wrap items-center gap-2">
            <span aria-hidden>⚠</span>
            <span>
              Company enrichment is blocked — SEC EDGAR requires a contact email in our API
              requests.
            </span>
            <Link
              to="/settings#contact-email"
              className="font-semibold underline hover:no-underline"
            >
              Set it in Settings →
            </Link>
          </div>
        </div>
      )}
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
