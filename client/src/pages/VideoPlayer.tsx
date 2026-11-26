import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { videoApi, getVideoUrl, getThumbnailUrl, errorMessage, isReady } from '../services/api';
import type { VideoMetadata } from '../types/index';
import { useAuth } from '../utils/useAuth';
import { useCopy } from '../utils/useCopy';
import { displayTitle, formatDate, formatDuration, formatFileSize } from '../utils/format';
import ShortLink from '../components/ShortLink';
import Icon from '../components/Icon';

const POLL_MS = 3000;

export default function VideoPlayer() {
  const { shortId } = useParams<{ shortId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [video, setVideo] = useState<VideoMetadata | null>(null);
  const [error, setError] = useState('');
  const [theatre, setTheatre] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: '', description: '' });
  const [busy, setBusy] = useState(false);
  const embedCopy = useCopy();

  // State is only set in promise callbacks, so effects may call this.
  const load = useCallback(() => {
    if (!shortId) return;
    videoApi
      .getVideoByShortId(shortId)
      .then((r) => setVideo(r.video))
      .catch(() => setError("This link doesn't point to a video. It may have been deleted, or a character in it may be off: the codes are case-sensitive."));
  }, [shortId]);

  useEffect(load, [load]);

  const processing = video?.status === 'processing';
  useEffect(() => {
    if (!processing) return;
    const timer = window.setInterval(load, POLL_MS);
    return () => window.clearInterval(timer);
  }, [processing, load]);

  if (error) {
    return (
      <main className="wrap page">
        <h1 className="page-title">Video not found</h1>
        <p className="quiet">{error}</p>
      </main>
    );
  }
  if (!video) {
    return (
      <main className="wrap page">
        <p className="quiet">Loading…</p>
      </main>
    );
  }

  const ready = isReady(video);
  const isOwner = user?.id === video.userId;
  const title = displayTitle(video);
  const embedCode = `<iframe src="${window.location.origin}/embed/${video.shortId}" width="640" height="360" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>`;

  const startEdit = () => {
    setDraft({ title: video.title, description: video.description });
    setEditing(true);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { video: updated } = await videoApi.updateVideo(video.id, draft);
      setVideo(updated);
      setEditing(false);
    } catch (err) {
      setError(errorMessage(err, "Couldn't save the changes."));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete “${title}”? Its link will stop working. This can't be undone.`)) return;
    setBusy(true);
    try {
      await videoApi.deleteVideo(video.id);
      navigate('/dashboard');
    } catch (err) {
      setError(errorMessage(err, "Couldn't delete the video."));
      setBusy(false);
    }
  };

  return (
    <main className={`watch${theatre ? ' is-theatre' : ''}`}>
      <Helmet>
        <title>{title} · vidz</title>
        <meta name="description" content={video.description || `Watch ${title}`} />
      </Helmet>

      <div className="stage">
        {ready ? (
          <video
            key={video.filename}
            className="stage-video"
            controls
            playsInline
            preload="metadata"
            poster={video.thumbnailFilename ? getThumbnailUrl(video.thumbnailFilename) : undefined}
            src={getVideoUrl(video.filename)}
          />
        ) : processing ? (
          <div className="stage-state" role="status">
            <span className="tally" />
            <p>
              <strong>Processing.</strong> This page updates by itself when the video is ready. The link below already
              works, so you can share it now.
            </p>
          </div>
        ) : (
          <div className="stage-state" role="alert">
            <p>
              <strong>This video couldn’t be processed.</strong> {video.error}
            </p>
          </div>
        )}
      </div>

      <div className="wrap watch-body">
        <div className="watch-main">
          {editing ? (
            <form className="form watch-edit" onSubmit={save}>
              <label className="field">
                <span>Title</span>
                <input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  required
                  maxLength={200}
                />
              </label>
              <label className="field">
                <span>Description</span>
                <textarea
                  rows={4}
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                />
              </label>
              <div className="row">
                <button type="submit" className="btn btn-key" disabled={busy}>
                  Save changes
                </button>
                <button type="button" className="btn" onClick={() => setEditing(false)}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <h1 className="watch-title">{title}</h1>
              <p className="watch-byline">
                <span>{video.username}</span>
                <time dateTime={video.uploadedAt}>{formatDate(video.uploadedAt)}</time>
              </p>
            </>
          )}

          <ShortLink shortId={video.shortId} />

          {!editing && video.description && <p className="watch-description">{video.description}</p>}
        </div>

        <aside className="watch-side" aria-label="Video tools">
          <div className="toolbar">
            {ready && (
              <>
                <button type="button" className="btn" onClick={() => setTheatre(!theatre)} aria-pressed={theatre}>
                  <Icon name={theatre ? 'contract' : 'expand'} />
                  {theatre ? 'Exit theatre' : 'Theatre'}
                </button>
                <a className="btn" href={getVideoUrl(video.filename)} download={`${video.title || 'video'}.mp4`}>
                  <Icon name="download" />
                  Download
                </a>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowEmbed(!showEmbed)}
                  aria-expanded={showEmbed}
                >
                  <Icon name="code" />
                  Embed
                </button>
              </>
            )}
            {isOwner && !editing && (
              <>
                <button type="button" className="btn" onClick={startEdit}>
                  <Icon name="edit" />
                  Edit
                </button>
                <button type="button" className="btn btn-danger" onClick={remove} disabled={busy}>
                  <Icon name="trash" />
                  Delete
                </button>
              </>
            )}
          </div>

          {showEmbed && ready && (
            <div className="embed">
              <label className="field">
                <span>Embed code</span>
                <textarea readOnly rows={3} value={embedCode} onFocus={(e) => e.currentTarget.select()} />
              </label>
              <button type="button" className="btn btn-small" onClick={() => embedCopy.copy(embedCode)}>
                <Icon name={embedCopy.copied ? 'check' : 'copy'} />
                {embedCopy.copied ? 'Copied' : 'Copy code'}
              </button>
            </div>
          )}

          {ready && (
            <dl className="facts">
              <div>
                <dt>Length</dt>
                <dd>{formatDuration(video.duration)}</dd>
              </div>
              <div>
                <dt>Resolution</dt>
                <dd>
                  {video.width}×{video.height}
                </dd>
              </div>
              <div>
                <dt>Size</dt>
                <dd>{formatFileSize(video.fileSize)}</dd>
              </div>
              {video.sourceUrl && (
                <div>
                  <dt>Source</dt>
                  <dd>
                    <a href={video.sourceUrl} rel="noreferrer noopener" target="_blank">
                      {new URL(video.sourceUrl).hostname.replace(/^www\./, '')}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          )}
        </aside>
      </div>
    </main>
  );
}
