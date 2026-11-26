import { useCallback, useEffect, useState } from 'react';
import { videoApi, errorMessage } from '../services/api';
import type { VideoMetadata } from '../types/index';
import Composer from '../components/Composer';
import VideoTile from '../components/VideoTile';

const POLL_MS = 3000;
const newestFirst = (a: VideoMetadata, b: VideoMetadata) =>
  new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();

export default function Dashboard() {
  const [videos, setVideos] = useState<VideoMetadata[] | null>(null);
  const [error, setError] = useState('');

  // State is only set in promise callbacks, so effects may call this.
  const load = useCallback(
    () =>
      videoApi
        .getMyVideos()
        .then((r) => {
          setVideos([...r.videos].sort(newestFirst));
          setError('');
        })
        .catch((err) => setError(errorMessage(err, "Couldn't load your videos."))),
    [],
  );

  useEffect(() => {
    load();
  }, [load]);

  // While anything is processing, check back until it's done.
  const processing = videos?.some((v) => v.status === 'processing') ?? false;
  useEffect(() => {
    if (!processing) return;
    const timer = window.setInterval(load, POLL_MS);
    return () => window.clearInterval(timer);
  }, [processing, load]);

  return (
    <main className="wrap page">
      <div className="page-head">
        <h1 className="page-title">My videos</h1>
        {videos && videos.length > 0 && (
          <p className="page-count">
            {videos.length} {videos.length === 1 ? 'video' : 'videos'}
          </p>
        )}
      </div>

      <Composer onAdded={(video) => setVideos((current) => [video, ...(current || [])])} />

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {videos === null ? (
        <p className="quiet">Loading your videos…</p>
      ) : videos.length === 0 ? (
        <p className="empty">
          Nothing here yet. Paste a link or drop a file above, and its short link is ready to share straight away.
        </p>
      ) : (
        <div className="grid">
          {videos.map((video) => (
            <VideoTile key={video.id} video={video} />
          ))}
        </div>
      )}
    </main>
  );
}
