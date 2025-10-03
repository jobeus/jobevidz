import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import './Navbar.css';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          🎥 JobeVidz
        </Link>
        <div className="navbar-menu">
          {user ? (
            <>
              <Link to="/dashboard" className="navbar-link">
                My Videos
              </Link>
              <Link to="/upload" className="navbar-link">
                Upload
              </Link>
              <Link to="/upload-url" className="navbar-link">
                Upload from URL
              </Link>
              <span className="navbar-user">👤 {user.username}</span>
              <button onClick={handleLogout} className="navbar-button">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="navbar-link">
                Login
              </Link>
              <Link to="/register" className="navbar-link">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

