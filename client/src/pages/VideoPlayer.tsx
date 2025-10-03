import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { videoApi, getVideoUrl } from '../services/api';
import { VideoMetadata } from '../types';
import './VideoPlayer.css';

const VideoPlayer: React.FC = () => {
  const { shortId } = useParams<{ shortId: string }>();
  const [video, setVideo] = useState<VideoMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchVideo = async () => {
      if (!shortId) return;

      try {
        const response = await videoApi.getVideoByShortId(shortId);
        setVideo(response.video);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load video');
      } finally {
        setIsLoading(false);
      }
    };

    fetchVideo();
  }, [shortId]);

  if (isLoading) {
    return (
      <div className="video-player-container">
        <div className="loading">Loading video...</div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="video-player-container">
        <div className="error-message">{error || 'Video not found'}</div>
      </div>
    );
  }

  const videoUrl = getVideoUrl(video.filename);
  const shareUrl = `${window.location.origin}/v/${video.shortId}`;

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb.toFixed(2)} MB`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const copyShareUrl = () => {
    navigator.clipboard.writeText(shareUrl);
    alert('Share URL copied to clipboard!');
  };

  return (
    <div className="video-player-container">
      <div className="video-player-card">
        <div className="video-wrapper">
          <video controls className="video-element">
            <source src={videoUrl} type={`video/${video.format}`} />
            Your browser does not support the video tag.
          </video>
        </div>

        <div className="video-info">
          <h1 className="video-title">{video.title}</h1>
          
          <div className="video-meta">
            <span className="meta-item">
              👤 <Link to={`/user/${video.username}`}>{video.username}</Link>
            </span>
            <span className="meta-item">📅 {formatDate(video.uploadedAt)}</span>
            <span className="meta-item">👁️ {video.width}×{video.height}</span>
            <span className="meta-item">⏱️ {formatDuration(video.duration)}</span>
            <span className="meta-item">💾 {formatFileSize(video.fileSize)}</span>
          </div>

          {video.description && (
            <div className="video-description">
              <h3>Description</h3>
              <p>{video.description}</p>
            </div>
          )}

          <div className="video-share">
            <h3>Share this video</h3>
            <div className="share-url-container">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="share-url-input"
              />
              <button onClick={copyShareUrl} className="copy-button">
                📋 Copy
              </button>
            </div>
          </div>

          <div className="video-technical">
            <h3>Technical Details</h3>
            <div className="technical-grid">
              <div className="technical-item">
                <span className="technical-label">Format:</span>
                <span className="technical-value">{video.format}</span>
              </div>
              <div className="technical-item">
                <span className="technical-label">Codec:</span>
                <span className="technical-value">{video.codec}</span>
              </div>
              <div className="technical-item">
                <span className="technical-label">Resolution:</span>
                <span className="technical-value">{video.width}×{video.height}</span>
              </div>
              <div className="technical-item">
                <span className="technical-label">Duration:</span>
                <span className="technical-value">{formatDuration(video.duration)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;

