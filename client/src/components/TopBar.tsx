import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/useAuth';
import { useTheme, type ThemeMode } from '../utils/theme';
import Icon, { type IconName } from './Icon';

const THEME_ICON: Record<ThemeMode, IconName> = { system: 'system', light: 'sun', dark: 'moon' };
const THEME_NAME: Record<ThemeMode, string> = { system: 'System', light: 'Light', dark: 'Dark' };

function ThemeToggle() {
  const { mode, next, cycle } = useTheme();
  return (
    <button
      type="button"
      className="icon-button"
      onClick={cycle}
      title={`Theme: ${THEME_NAME[mode]}. Switch to ${THEME_NAME[next]}`}
    >
      <Icon name={THEME_ICON[mode]} />
      <span className="visually-hidden">
        Theme: {THEME_NAME[mode]}. Switch to {THEME_NAME[next]}
      </span>
    </button>
  );
}

export default function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="topbar">
      <div className="wrap topbar-inner">
        <Link to={user ? '/dashboard' : '/'} className="wordmark" aria-label="vidz, home">
          vidz<span className="wordmark-host">.jobe.wtf</span>
        </Link>
        <nav className="topbar-nav" aria-label="Main">
          {user ? (
            <>
              <NavLink to="/dashboard" className="nav-link">
                My videos
              </NavLink>
              <NavLink to="/account" className="nav-link topbar-user" title="Account and API keys">
                {user.username}
              </NavLink>
              <button
                type="button"
                className="nav-link"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="nav-link">
                Sign in
              </NavLink>
              <Link to="/register" className="btn btn-key btn-small">
                Create account
              </Link>
            </>
          )}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
