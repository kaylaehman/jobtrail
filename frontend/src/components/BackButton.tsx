import { useLocation, useNavigate } from 'react-router-dom';

// Smart back button: prefers history.go(-1) when there's somewhere to go back to (i.e. the
// user actually clicked into this page), otherwise routes to a sensible fallback so direct
// loads / bookmarks / hard refreshes don't leave the button doing nothing.
//
// `location.key === 'default'` is React Router 6's way of saying "this is the first entry in
// the history stack" — no point calling navigate(-1) because there's nothing to go back to.
export function BackButton({ fallback = '/' }: { fallback?: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const canGoBack = location.key !== 'default';
  return (
    <button
      type="button"
      className="btn text-sm"
      onClick={() => (canGoBack ? navigate(-1) : navigate(fallback))}
      aria-label="Go back"
    >
      ← Back
    </button>
  );
}
