import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { keysApi, errorMessage, SHARE_ENDPOINT, type ApiKeyInfo } from '../services/api';
import { useAuth } from '../utils/useAuth';
import { useCopy } from '../utils/useCopy';
import { formatDate } from '../utils/format';
import Icon from '../components/Icon';

/** The signed shortcut, served by the site. It asks for the API key when it's added. */
const SHORTCUT_URL = '/Share%20to%20vidz.shortcut';

function NewKey({ value, onDone }: { value: string; onDone: () => void }) {
  const { copied, copy } = useCopy();
  return (
    <div className="newkey" role="status">
      <p>
        <strong>Here’s your new key.</strong> Copy it now: it won’t be shown again. If you lose it, revoke it and
        make another.
      </p>
      <div className="newkey-row">
        <code className="newkey-value">{value}</code>
        <button type="button" className="btn btn-key" onClick={() => copy(value)}>
          <Icon name={copied ? 'check' : 'copy'} />
          {copied ? 'Copied' : 'Copy key'}
        </button>
      </div>
      <button type="button" className="btn btn-small" onClick={onDone}>
        I’ve saved it
      </button>
    </div>
  );
}

export default function Account() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<ApiKeyInfo[] | null>(null);
  const [name, setName] = useState('iPhone shortcut');
  const [fresh, setFresh] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // State is only set in promise callbacks, so effects may call this.
  const load = useCallback(
    () =>
      keysApi
        .list()
        .then(setKeys)
        .catch((err) => setError(errorMessage(err, "Couldn't load your keys."))),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { key } = await keysApi.create(name);
      setFresh(key);
      await load();
    } catch (err) {
      setError(errorMessage(err, "Couldn't create the key."));
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (key: ApiKeyInfo) => {
    if (!window.confirm(`Revoke “${key.name}”? Anything using it stops working straight away.`)) return;
    try {
      await keysApi.revoke(key.id);
      await load();
    } catch (err) {
      setError(errorMessage(err, "Couldn't revoke the key."));
    }
  };

  return (
    <main className="wrap page account">
      <h1 className="page-title">Account</h1>
      <p className="quiet account-who">
        Signed in as <strong>{user?.username}</strong>
        {user?.email ? ` (${user.email})` : ''}
      </p>

      <section className="account-section" aria-labelledby="shortcut-heading">
        <h2 id="shortcut-heading" className="section-title">
          Share from your iPhone
        </h2>
        <p className="account-text">
          With the shortcut, “Share to vidz” appears in the share sheet of Photos, Files, YouTube, Safari and most
          other apps. Share a video or a link and the short link lands on your clipboard a moment later, while the
          video finishes processing here.
        </p>
        <ol className="steps">
          <li>Create a key below and copy it.</li>
          <li>
            On your iPhone, open <a href={SHORTCUT_URL}>the Share to vidz shortcut</a> and tap Add Shortcut.
          </li>
          <li>Paste the key when it asks for your vidz API key.</li>
        </ol>
        <a className="btn" href={SHORTCUT_URL}>
          <Icon name="download" />
          Get the shortcut
        </a>
      </section>

      <section className="account-section" aria-labelledby="keys-heading">
        <h2 id="keys-heading" className="section-title">
          API keys
        </h2>
        <p className="account-text">
          A key lets the shortcut, or any script, add videos to your account. Send it as{' '}
          <code>Authorization: Bearer vz_…</code> with a POST to <code>{SHARE_ENDPOINT}</code>: a link as JSON{' '}
          <code>{'{"url": "…"}'}</code> or a video file as the body. The reply is the short link.
        </p>

        {fresh && <NewKey value={fresh} onDone={() => setFresh(null)} />}

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        {keys && keys.length > 0 && (
          <ul className="keys">
            {keys.map((key) => (
              <li key={key.id} className="key">
                <div>
                  <p className="key-name">{key.name}</p>
                  <p className="key-meta">
                    <span className="code">{key.hint}</span>
                    <span>Created {formatDate(key.createdAt)}</span>
                    <span>{key.lastUsedAt ? `Last used ${formatDate(key.lastUsedAt)}` : 'Not used yet'}</span>
                  </p>
                </div>
                <button type="button" className="btn btn-small btn-danger" onClick={() => revoke(key)}>
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}

        <form className="newkey-form" onSubmit={create}>
          <label className="field">
            <span>Name for a new key</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required />
          </label>
          <button type="submit" className="btn btn-key" disabled={busy}>
            <Icon name="plus" />
            Create key
          </button>
        </form>
      </section>
    </main>
  );
}
