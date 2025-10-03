import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import './Home.css';

const Home: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="home-container">
      <div className="hero-section">
        <h1 className="hero-title">🎥 JobeVidz</h1>
        <p className="hero-subtitle">
          Upload, share, and manage your videos with ease
        </p>
        <div className="hero-actions">
          {user ? (
            <>
              <Link to="/dashboard" className="hero-button primary">
                My Videos
              </Link>
              <Link to="/upload" className="hero-button secondary">
                Upload Video
              </Link>
            </>
          ) : (
            <>
              <Link to="/register" className="hero-button primary">
                Get Started
              </Link>
              <Link to="/login" className="hero-button secondary">
                Login
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="features-section">
        <h2>Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">☁️</div>
            <h3>Easy Upload</h3>
            <p>Drag and drop your videos up to 1GB with real-time progress tracking</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔗</div>
            <h3>Short URLs</h3>
            <p>Get shareable short URLs for all your videos automatically</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎬</div>
            <h3>Multiple Formats</h3>
            <p>Support for MP4, MOV, MKV, and WebM video formats</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Metadata</h3>
            <p>Automatic extraction of video metadata including resolution and duration</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔒</div>
            <h3>Secure</h3>
            <p>Your videos are protected with secure authentication</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📱</div>
            <h3>API Ready</h3>
            <p>Built with mobile app integration in mind</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;

