import { Link } from 'react-router-dom';
import { getThumbnailUrl, getVideoUrl, isReady, shareUrlFor } from '../services/api';
import type { VideoMetadata } from '../types/index';
import { displayTitle, formatDate, formatDuration } from '../utils/format';
import { useCopy } from '../utils/useCopy';
import Icon from './Icon';

export default function VideoTile({ video }: { video: VideoMetadata }) {
  const { copied, copy } = useCopy();
  const href = `/v/${video.shortId}`;
  const ready = isReady(video);

  return (
    <article className="tile" data-status={video.status || 'ready'}>
      <Link to={href} className="tile-frame" tabIndex={-1} aria-hidden="true">
        {ready && video.thumbnailFilename ? (
          <img src={getThumbnailUrl(video.thumbnailFilename)} alt="" loading="lazy" />
        ) : ready ? (
          <video src={getVideoUrl(video.filename)} preload="metadata" muted />
        ) : video.status === 'processing' ? (
          <span className="tile-state">
            <span className="tally" />
            Processing
          </span>
        ) : (
          <span className="tile-state">Couldn’t process</span>
        )}
        {ready && video.duration > 0 && <span className="tile-duration">{formatDuration(video.duration)}</span>}
      </Link>

      <div className="tile-body">
        <h3 className="tile-title">
          <Link to={href}>{displayTitle(video)}</Link>
        </h3>
        <div className="tile-meta">
          <span className="code">/v/{video.shortId}</span>
          <time dateTime={video.uploadedAt}>{formatDate(video.uploadedAt)}</time>
          <button
            type="button"
            className="icon-button icon-button-small"
            onClick={() => copy(shareUrlFor(video.shortId))}
            title={copied ? 'Copied' : 'Copy link'}
          >
            <Icon name={copied ? 'check' : 'copy'} />
            <span className="visually-hidden">{copied ? 'Copied' : `Copy link to ${displayTitle(video)}`}</span>
          </button>
        </div>
        {video.status === 'failed' && video.error && <p className="tile-error">{video.error}</p>}
      </div>
    </article>
  );
}
