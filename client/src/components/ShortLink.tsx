import { shareUrlFor } from '../services/api';
import { useCopy } from '../utils/useCopy';
import Icon from './Icon';

/** The video's short link, large, with a copy button: the thing people come here for. */
export default function ShortLink({ shortId, note }: { shortId: string; note?: string }) {
  const { copied, copy } = useCopy();
  const url = shareUrlFor(shortId);
  const host = new URL(url).host;

  return (
    <div className="shortlink">
      <a className="shortlink-url" href={url}>
        <span className="shortlink-host">{host}/v/</span>
        <span className="shortlink-code">{shortId}</span>
      </a>
      <button type="button" className="btn btn-key" onClick={() => copy(url)} aria-live="polite">
        <Icon name={copied ? 'check' : 'copy'} />
        {copied ? 'Copied' : 'Copy link'}
      </button>
      {note && <p className="shortlink-note">{note}</p>}
    </div>
  );
}
