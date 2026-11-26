import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../utils/useAuth';

export default function Home() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <main className="wrap hero">
      <h1 className="hero-title">Short links for your videos.</h1>
      <p className="hero-lede">
        Paste a link from YouTube, Instagram or TikTok, or drop in a file. You get a short link right away that plays
        anywhere and shows a proper preview wherever you share it.
      </p>
      <div className="hero-actions">
        <Link to="/register" className="btn btn-key">
          Create account
        </Link>
        <Link to="/login" className="btn">
          Sign in
        </Link>
      </div>
      <p className="hero-sample" aria-hidden="true">
        <span className="hero-sample-host">vidz.jobe.wtf/v/</span>
        <span className="hero-sample-code">2r8Fy</span>
      </p>
    </main>
  );
}
