import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { videoApi } from '../services/api';
import './Upload.css';

const Upload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Check file size (1GB = 1073741824 bytes)
      if (selectedFile.size > 1073741824) {
        setError('File size must be less than 1GB');
        return;
      }

      // Check file type
      const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-matroska', 'video/webm'];
      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Only MP4, MOV, MKV, and WebM video files are allowed');
        return;
      }

      setFile(selectedFile);
      setError('');
      
      // Auto-fill title if empty
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      // Create a proper FileList-like object
      const fileList = {
        0: droppedFile,
        length: 1,
        item: (index: number) => (index === 0 ? droppedFile : null),
        [Symbol.iterator]: function* () {
          yield droppedFile;
        },
      } as unknown as FileList;

      const fakeEvent = {
        target: { files: fileList },
        currentTarget: { files: fileList },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      handleFileChange(fakeEvent);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a video file');
      return;
    }

    setIsUploading(true);
    setError('');
    setSuccess('');
    setUploadProgress(0);

    try {
      const response = await videoApi.upload(file, title, description, (progress) => {
        setUploadProgress(progress);
      });

      setSuccess(`Video uploaded successfully! Short URL: ${response.url}`);
      
      // Reset form
      setTimeout(() => {
        navigate(`/v/${response.video.shortId}`);
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="upload-container">
      <div className="upload-card">
        <h1>Upload Video</h1>
        
        <form onSubmit={handleSubmit} className="upload-form">
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div
            className={`file-drop-zone ${file ? 'has-file' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <input
              type="file"
              id="video-file"
              accept="video/mp4,video/quicktime,video/x-matroska,video/webm"
              onChange={handleFileChange}
              disabled={isUploading}
              className="file-input"
            />
            <label htmlFor="video-file" className="file-label">
              {file ? (
                <>
                  <span className="file-icon">📹</span>
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </>
              ) : (
                <>
                  <span className="upload-icon">☁️</span>
                  <span>Drag and drop a video file here</span>
                  <span className="upload-hint">or click to browse</span>
                  <span className="upload-formats">MP4, MOV, MKV, WebM (max 1GB)</span>
                </>
              )}
            </label>
          </div>

          {file && (
            <>
              <div className="form-group">
                <label htmlFor="title">Title</label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  disabled={isUploading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  disabled={isUploading}
                />
              </div>

              {isUploading && (
                <div className="progress-container">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <div className="progress-text">{uploadProgress}%</div>
                </div>
              )}

              <button type="submit" className="upload-button" disabled={isUploading}>
                {isUploading ? 'Uploading...' : 'Upload Video'}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default Upload;

