import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { videoApi } from '../services/api';
import type { UrlPreviewResponse } from '../types/index';
import './UploadFromUrl.css';

const UploadFromUrl: React.FC = () => {
  const navigate = useNavigate();
  
  // Form states
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Preview data
  const [previewData, setPreviewData] = useState<UrlPreviewResponse | null>(null);

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      setError('Please enter a video URL');
      return;
    }

    setIsLoading(true);
    setError('');
    setPreviewData(null);

    try {
      const preview = await videoApi.previewFromUrl(url.trim());
      setPreviewData(preview);
      
      // Auto-populate form fields
      setTitle(preview.metadata.title);
      setDescription(preview.metadata.description);
      
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load video from URL. Please check the URL and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!previewData) {
      setError('Please preview a video first');
      return;
    }

    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }

    setIsUploading(true);
    setError('');
    setSuccess('');

    try {
      const response = await videoApi.uploadFromUrl({
        previewId: previewData.previewId,
        title: title.trim(),
        description: description.trim(),
      });

      setSuccess(`Video uploaded successfully! Short URL: ${response.url}`);
      
      // Navigate to video after delay
      setTimeout(() => {
        navigate(`/v/${response.video.shortId}`);
      }, 2000);
      
    } catch (err: any) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setUrl('');
    setTitle('');
    setDescription('');
    setPreviewData(null);
    setError('');
    setSuccess('');
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };



  return (
    <div className="upload-url-container">
      <div className="upload-url-card">
        <h1>Upload from URL</h1>
        <p className="upload-url-description">
          Enter a video URL from YouTube, Instagram, TikTok, or other supported platforms
        </p>

        {/* URL Input Form */}
        <form onSubmit={handleUrlSubmit} className="url-form">
          <div className="form-group">
            <label htmlFor="video-url">Video URL</label>
            <input
              type="url"
              id="video-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              disabled={isLoading || isUploading}
              className="url-input"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={isLoading || isUploading || !url.trim()}
            className="preview-button"
          >
            {isLoading ? 'Loading Preview...' : 'Preview Video'}
          </button>
        </form>

        {/* Error Display */}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* Success Display */}
        {success && (
          <div className="success-message">
            {success}
          </div>
        )}

        {/* Preview Section */}
        {previewData && (
          <div className="preview-section">
            <h2>Video Preview</h2>
            
            {/* Video Info */}
            <div className="upload-video-info">
              <div className="upload-video-preview">
                {previewData.streamUrl ? (
                  <video
                    controls
                    className="upload-preview-video"
                    preload="metadata"
                  >
                    <source src={previewData.streamUrl} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <div className="upload-video-placeholder">
                    📹 Video preview loading...
                  </div>
                )}
              </div>

              <div className="upload-video-details">
                <h3>{previewData.metadata.title}</h3>
                <p className="upload-video-uploader">By: {previewData.metadata.uploader}</p>
                <div className="upload-video-stats">
                  <span>Duration: {formatDuration(previewData.metadata.duration)}</span>
                  <span>Resolution: {previewData.metadata.width}x{previewData.metadata.height}</span>
                  <span>Format: {previewData.metadata.format.toUpperCase()}</span>
                </div>
                {previewData.metadata.description && (
                  <p className="upload-video-description-preview">
                    {previewData.metadata.description.substring(0, 200)}
                    {previewData.metadata.description.length > 200 ? '...' : ''}
                  </p>
                )}
              </div>
            </div>

            {/* Upload Form */}
            <form onSubmit={handleUpload} className="upload-form">
              <div className="form-group">
                <label htmlFor="video-title">Title *</label>
                <input
                  type="text"
                  id="video-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isUploading}
                  className="form-input"
                  maxLength={100}
                />
              </div>

              <div className="form-group">
                <label htmlFor="video-description">Description</label>
                <textarea
                  id="video-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isUploading}
                  className="form-textarea"
                  rows={4}
                  maxLength={1000}
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isUploading}
                  className="reset-button"
                >
                  Start Over
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !title.trim()}
                  className="upload-button"
                >
                  {isUploading ? 'Uploading...' : 'Upload Video'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadFromUrl;
