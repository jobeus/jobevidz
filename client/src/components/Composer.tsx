import { useRef, useState, type DragEvent, type FormEvent } from 'react';
import { videoApi, errorMessage } from '../services/api';
import type { VideoMetadata } from '../types/index';
import Icon from './Icon';

/** Paste a link or drop a file. Either way the new video comes back at once, still processing. */
export default function Composer({ onAdded }: { onAdded: (video: VideoMetadata) => void }) {
  const [link, setLink] = useState('');
  const [importing, setImporting] = useState(false);
  const [upload, setUpload] = useState<{ name: string; percent: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  const importLink = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setImporting(true);
    try {
      const { video } = await videoApi.importFromUrl({ url: link.trim() });
      setLink('');
      onAdded(video);
    } catch (err) {
      setError(errorMessage(err, "Couldn't start the import. Check the link and try again."));
    } finally {
      setImporting(false);
    }
  };

  const uploadFile = async (file: File) => {
    setError('');
    setUpload({ name: file.name, percent: 0 });
    try {
      const title = file.name.replace(/\.[^.]+$/, '');
      const { video } = await videoApi.upload(file, title, '', (percent) => setUpload({ name: file.name, percent }));
      onAdded(video);
    } catch (err) {
      setError(errorMessage(err, `Couldn't upload ${file.name}. Try again.`));
    } finally {
      setUpload(null);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void uploadFile(file);
    else {
      const text = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
      if (text) setLink(text.trim());
    }
  };

  return (
    <section
      className={`composer${dragging ? ' is-dragging' : ''}`}
      aria-label="Add a video"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
      }}
      onDrop={onDrop}
    >
      <form className="composer-link" onSubmit={importLink}>
        <label htmlFor="composer-url" className="visually-hidden">
          Video link
        </label>
        <Icon name="link" />
        <input
          id="composer-url"
          type="url"
          inputMode="url"
          autoComplete="off"
          placeholder="Paste a link from YouTube, Instagram, TikTok…"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          required
        />
        <button type="submit" className="btn btn-key" disabled={importing || !link.trim()}>
          {importing ? 'Importing…' : 'Import'}
        </button>
      </form>

      {upload ? (
        <div className="composer-upload" role="status">
          <div className="composer-upload-text">
            <span className="composer-upload-name">{upload.name}</span>
            <span>{upload.percent < 100 ? `Uploading ${upload.percent}%` : 'Upload finished'}</span>
          </div>
          <div className="meter" aria-hidden="true">
            <div className="meter-fill" style={{ width: `${upload.percent}%` }} />
          </div>
        </div>
      ) : (
        <label className="composer-drop">
          <input
            ref={fileInput}
            type="file"
            accept="video/*,.mkv,.flv,.avi,.wmv,.ts,.m2ts,.3gp"
            className="visually-hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadFile(file);
            }}
          />
          <Icon name="upload" />
          <span>
            <strong>Drop a video file here</strong> or choose one
          </span>
          <span className="composer-drop-hint">Any format, up to 1 GB</span>
        </label>
      )}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
