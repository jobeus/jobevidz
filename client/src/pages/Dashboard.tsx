import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { videoApi, getVideoUrl } from '../services/api';
import { VideoMetadata } from '../types';
import { useAuth } from '../utils/AuthContext';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const [videos, setVideos] = useState<VideoMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingVideo, setEditingVideo] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const response = await videoApi.getMyVideos();
      setVideos(response.videos.sort((a, b) => 
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      ));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load videos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (video: VideoMetadata) => {
    setEditingVideo(video.id);
    setEditTitle(video.title);
    setEditDescription(video.description);
  };

  const handleSaveEdit = async (videoId: string) => {
    try {
      await videoApi.updateVideo(videoId, {
        title: editTitle,
        description: editDescription,
      });
      setEditingVideo(null);
      fetchVideos();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update video');
    }
  };

  const handleCancelEdit = () => {
    setEditingVideo(null);
    setEditTitle('');
    setEditDescription('');
  };

  const handleDelete = async (videoId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) {
      return;
    }

    try {
      await videoApi.deleteVideo(videoId);
      fetchVideos();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete video');
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="dashboard-container">
        <div className="loading">Loading your videos...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>My Videos</h1>
        <Link to="/upload" className="upload-link-button">
          ➕ Upload New Video
        </Link>
      </div>

      {error && <div className="error-message">{error}</div>}

      {videos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎬</div>
          <h2>No videos yet</h2>
          <p>Upload your first video to get started!</p>
          <Link to="/upload" className="upload-button-large">
            Upload Video
          </Link>
        </div>
      ) : (
        <div className="videos-grid">
          {videos.map((video) => (
            <div key={video.id} className="video-card">
              <Link to={`/v/${video.shortId}`} className="video-thumbnail">
                <video
                  src={getVideoUrl(video.filename)}
                  className="thumbnail-video"
                  preload="metadata"
                />
                <div className="video-duration">{formatDuration(video.duration)}</div>
              </Link>

              <div className="video-card-content">
                {editingVideo === video.id ? (
                  <div className="edit-form">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="edit-input"
                    />
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="edit-textarea"
                      rows={3}
                    />
                    <div className="edit-actions">
                      <button
                        onClick={() => handleSaveEdit(video.id)}
                        className="save-button"
                      >
                        Save
                      </button>
                      <button onClick={handleCancelEdit} className="cancel-button">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Link to={`/v/${video.shortId}`} className="video-title-link">
                      <h3 className="video-card-title">{video.title}</h3>
                    </Link>
                    {video.description && (
                      <p className="video-card-description">
                        {video.description.length > 100
                          ? `${video.description.substring(0, 100)}...`
                          : video.description}
                      </p>
                    )}
                    <div className="video-card-meta">
                      <span>📅 {formatDate(video.uploadedAt)}</span>
                      <span>👁️ {video.width}×{video.height}</span>
                    </div>
                    <div className="video-card-actions">
                      <button
                        onClick={() => handleEdit(video)}
                        className="action-button edit"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDelete(video.id, video.title)}
                        className="action-button delete"
                      >
                        🗑️ Delete
                      </button>
                      <Link
                        to={`/v/${video.shortId}`}
                        className="action-button view"
                      >
                        👁️ View
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;

