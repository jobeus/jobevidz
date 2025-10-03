import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { videoApi, getVideoUrl } from '../services/api';
import type { VideoMetadata } from '../types/index';
import './VideoPlayer.css';

const VideoPlayer: React.FC = () => {
  const { shortId } = useParams<{ shortId: string }>();
  const [video, setVideo] = useState<VideoMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isTheatreMode, setIsTheatreMode] = useState(false);
  const [copyButtonText, setCopyButtonText] = useState('📋 Copy Link');

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
    setCopyButtonText('Copied ✓');
    setTimeout(() => {
      setCopyButtonText('📋 Copy Link');
    }, 2500);
  };

  const downloadVideo = () => {
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = video?.originalFilename || video?.filename || 'video';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleTheatreMode = () => {
    setIsTheatreMode(!isTheatreMode);
  };

  const normalizeFormat = (format: string): string => {
    if (format.toLowerCase().includes('mp4')) {
      return 'mp4';
    }
    return format;
  };

  // Map format to proper MIME type
  const getMimeType = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';

    // Map common extensions to MIME types
    const mimeMap: { [key: string]: string } = {
      'mp4': 'video/mp4',
      'mov': 'video/quicktime',
      'mkv': 'video/x-matroska',
      'webm': 'video/webm',
      'avi': 'video/x-msvideo',
      'm4v': 'video/x-m4v',
    };

    return mimeMap[ext] || 'video/mp4';
  };

  return (
    <div className={`video-player-container ${isTheatreMode ? 'theatre-mode' : ''}`}>
      <div className="video-player-card">
        <div className="video-wrapper">
          <video controls className="video-element">
            <source src={videoUrl} type={getMimeType(video.filename)} />
            Your browser does not support the video tag.
          </video>

          {/* Theatre mode toggle */}
          <button
            className="theatre-toggle"
            onClick={toggleTheatreMode}
            title={isTheatreMode ? 'Exit Theatre Mode' : 'Enter Theatre Mode'}
          >
            {isTheatreMode ? '⤢' : '⤡'}
          </button>
        </div>

        <div className="video-info">
          {/* Primary content area - full width */}
          <div className="video-primary-content">
            <h1 className="video-title">{video.title}</h1>

            <div className="video-author-date">
              <span className="author">
                👤 <Link to={`/user/${video.username}`}>{video.username}</Link>
              </span>
              <span className="upload-date">📅 {formatDate(video.uploadedAt)}</span>
            </div>

            {video.description && (
              <div className="video-description">
                <p>{video.description}</p>
              </div>
            )}
          </div>

          {/* Action buttons and metadata in single row */}
          <div className="video-actions-meta-row">
            <div className="action-buttons">
              <button onClick={downloadVideo} className="action-button download-button">
                ⬇️ Download
              </button>
              <button onClick={copyShareUrl} className={`action-button copy-button ${copyButtonText.includes('✓') ? 'copied' : ''}`}>
                {copyButtonText}
              </button>
            </div>

            <div className="technical-metadata">
              <span className="meta-item">
                <span className="meta-label">Resolution:</span>
                <span className="meta-value">{video.width}×{video.height}</span>
              </span>
              <span className="meta-item">
                <span className="meta-label">Duration:</span>
                <span className="meta-value">{formatDuration(video.duration)}</span>
              </span>
              <span className="meta-item">
                <span className="meta-label">Size:</span>
                <span className="meta-value">{formatFileSize(video.fileSize)}</span>
              </span>
              <span className="meta-item">
                <span className="meta-label">Format:</span>
                <span className="meta-value">{normalizeFormat(video.format)}</span>
              </span>
              <span className="meta-item">
                <span className="meta-label">Codec:</span>
                <span className="meta-value">{video.codec}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;

