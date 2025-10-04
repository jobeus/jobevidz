import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './utils/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import UploadFromUrl from './pages/UploadFromUrl';
import VideoPlayer from './pages/VideoPlayer';
import './App.css';

function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="app">
            <Navbar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/upload"
                element={
                  <ProtectedRoute>
                    <Upload />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/upload-url"
                element={
                  <ProtectedRoute>
                    <UploadFromUrl />
                  </ProtectedRoute>
                }
              />
              <Route path="/v/:shortId" element={<VideoPlayer />} />
            </Routes>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </HelmetProvider>
  );
}

export default App;
