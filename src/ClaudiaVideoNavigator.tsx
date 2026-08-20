import { useEffect, useMemo, useState } from 'react';

/**
 * ClaudiaVideoNavigator — a video-guide catalogue + inline player.
 *
 * Extracted 2026-08-20 after comparing Claudia's own real VideoNavigator.tsx against PETGI's
 * real, independently-built one -- genuinely different outcomes, not accidental duplication
 * with the same result. PETGI's has search, "recommended for this screen" boost-key matching,
 * a card-grid layout, and a full modal presentation; Claudia's is a simple sidebar-plus-player
 * split view with none of that. Neither is wrong; PETGI solved a real problem Claudia's
 * smaller catalogue (one video, at the time this was checked) never needed.
 *
 * Per the unification principle: the shared model grew config axes to fit both real outcomes,
 * rather than picking one and asking the other project to lose real functionality.
 *
 * fetchVideos/resolveVideoUrl are dependency-injected because the two real backends are
 * genuinely different tables with different schemas and different URL-resolution paths
 * (claudia_demo_videos_list RPC + claudia-video-url function, vs a raw petgi_demo_videos
 * query + petgi-storage-io's own petgi_video_url action, deliberately narrower-scoped than
 * the general storage path because demo videos carry no client confidentiality unlike most
 * other PETGI storage). This component never assumes a schema or a resolution mechanism --
 * each project's own adapter function does that mapping.
 */
export interface ClaudiaVideo {
  id: string;
  title: string;
  description: string | null;
  durationSeconds?: number | null;
  /** Only used when searchable is true. */
  tags?: string[];
  /** Only used when boostKeys is given -- floats matching videos to a "recommended" section without hiding the rest. */
  contextKeys?: string[];
}

export interface ClaudiaVideoNavigatorProps {
  fetchVideos: () => Promise<ClaudiaVideo[]>;
  resolveVideoUrl: (video: ClaudiaVideo) => Promise<string>;
  /** Modal (PETGI's real shape) or inline sidebar+player (Claudia's real shape). Defaults to 'inline'. */
  presentation?: 'modal' | 'inline';
  /** Only rendered/used when presentation is 'modal'. */
  onClose?: () => void;
  /** Adds the search box and card-grid layout PETGI's real catalogue needed. Defaults to false. */
  searchable?: boolean;
  /** "Recommended for this screen" floats videos whose contextKeys match any of these. */
  boostKeys?: string[];
  title?: string;
}

function fmtDuration(s: number | null | undefined): string {
  if (s == null) return '';
  const m = Math.floor(s / 60); const sec = Math.round(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function ClaudiaVideoNavigator({
  fetchVideos, resolveVideoUrl, presentation = 'inline', onClose, searchable = false, boostKeys, title = 'How-to guides',
}: ClaudiaVideoNavigatorProps) {
  const [videos, setVideos] = useState<ClaudiaVideo[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<ClaudiaVideo | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVideos().then((data) => {
      setVideos(data);
      if (presentation === 'inline' && data.length > 0) setSelected(data[0]);
    }).catch((e) => setError(e instanceof Error ? e.message : String(e)));
    // Only re-run if the DI functions themselves change identity -- not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selected) return;
    setBusy(true); setError(null); setVideoUrl(null);
    resolveVideoUrl(selected)
      .then(setVideoUrl)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setBusy(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => videos.filter((v) => !q
    || v.title.toLowerCase().includes(q)
    || (v.description ?? '').toLowerCase().includes(q)
    || (v.tags ?? []).some((t) => t.toLowerCase().includes(q))), [videos, q]);

  const matchesBoost = (v: ClaudiaVideo) => Boolean(boostKeys?.length) && (v.contextKeys ?? []).some((k) => boostKeys!.includes(k));
  const recommended = boostKeys?.length ? filtered.filter(matchesBoost) : [];
  const rest = boostKeys?.length ? filtered.filter((v) => !matchesBoost(v)) : filtered;

  function VideoCard({ v }: { v: ClaudiaVideo }) {
    return (
      <button className="card book-card" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => setSelected(v)}>
        <h3 style={{ margin: 0 }}>{v.title}</h3>
        {v.description && <p className="dim" style={{ fontSize: '.82rem' }}>{v.description}</p>}
        {v.durationSeconds != null && <p className="dim" style={{ fontSize: '.78rem' }}>{fmtDuration(v.durationSeconds)}</p>}
      </button>
    );
  }

  if (videos.length === 0 && !error) return <p className="empty-state">No demo videos yet.</p>;

  const content = searchable ? (
    <>
      {presentation === 'modal' && selected ? (
        <>
          <button className="btn quiet sm" onClick={() => { setSelected(null); setVideoUrl(null); }}>{'\u2190'} Back to guides</button>
          <h2 style={{ marginTop: '.6rem' }}>{selected.title}</h2>
          {selected.description && <p className="dim" style={{ fontSize: '.85rem' }}>{selected.description}</p>}
          {error && <p className="err">{error}</p>}
          {busy && <p className="dim">Loading\u2026</p>}
          {videoUrl && <video controls autoPlay style={{ width: '100%', borderRadius: 6, background: '#000' }} src={videoUrl} />}
        </>
      ) : (
        <>
          <h2 style={{ marginTop: 0 }}>{title}</h2>
          <input className="field" placeholder="Search guides\u2026" value={query} onChange={(e) => setQuery(e.target.value)} />
          {error && <p className="err">{error}</p>}
          {recommended.length > 0 && (
            <>
              <h3 className="panel-title">Recommended for this screen</h3>
              <div className="grid books">{recommended.map((v) => <VideoCard key={v.id} v={v} />)}</div>
            </>
          )}
          <h3 className="panel-title">{recommended.length > 0 ? 'All guides' : 'Guides'}</h3>
          {filtered.length === 0 ? (
            <p className="dim" style={{ fontSize: '.85rem' }}>No guides match this search.</p>
          ) : (
            <div className="grid books">{rest.map((v) => <VideoCard key={v.id} v={v} />)}</div>
          )}
        </>
      )}
    </>
  ) : (
    <div style={{ display: 'flex', gap: 24 }}>
      <nav style={{ width: 220, flexShrink: 0 }}>
        {videos.map((v) => (
          <button key={v.id} onClick={() => setSelected(v)}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              background: selected?.id === v.id ? 'var(--claudia-kernel-surface, #f0f0f0)' : 'none',
              border: '1px solid var(--claudia-kernel-line, #e0e0e0)', borderRadius: 4, padding: '8px 10px', marginBottom: 6, cursor: 'pointer',
              color: selected?.id === v.id ? 'var(--claudia-kernel-text, inherit)' : 'var(--claudia-kernel-text-dim, #888)', fontSize: 13,
            }}>
            {v.title}
          </button>
        ))}
      </nav>
      <div style={{ flex: 1, minWidth: 0, maxWidth: 640 }}>
        {busy && <p className="empty-state">Loading video\u2026</p>}
        {error && <p className="empty-state" style={{ color: 'var(--claudia-kernel-alert, #b42318)' }}>{error}</p>}
        {videoUrl && (
          <video controls style={{ width: '100%', borderRadius: 6, border: '1px solid var(--claudia-kernel-line, #e0e0e0)' }} src={videoUrl}>
            Your browser doesn't support embedded video.
          </video>
        )}
        {selected?.description && <p className="meta" style={{ marginTop: 10 }}>{selected.description}</p>}
      </div>
    </div>
  );

  if (presentation === 'modal') {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal wide" onClick={(e) => e.stopPropagation()}>
          {content}
          <div style={{ marginTop: '1rem' }}>
            <button className="btn quiet" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }
  return content;
}
