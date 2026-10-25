'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import type { BuildResult, PipelineStage } from '@/lib/types/site';

type Phase = 'idle' | 'uploading' | 'building' | 'ready' | 'failed';

const ACCEPT =
  '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.rtf,.txt,.md,.markdown,.csv,.tsv,.json,.yaml,.yml,.xml,.eml,.html,.htm,.png,.jpg,.jpeg,.gif,.webp,.bmp,.svg';

const fmt = (ms: number) => (ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`);

const AGENTS = [  { key: 'ingest', label: 'Document intake' },
  { key: 'content', label: 'Content Intelligence' },
  { key: 'strategy', label: 'Site Strategy' },
  { key: 'design', label: 'Design Intelligence' },
  { key: 'copy', label: 'Content Generation' },
  { key: 'visual', label: 'Visual Generation' },
  { key: 'build', label: 'Build Agent' },
];

const SAMPLES = [
  { path: '/sample-resume.txt', label: 'Résumé', file: 'resume.txt' },
  { path: '/samples/menu-photo.jpg', label: 'Photo of a menu', file: 'menu-photo.jpg' },
  { path: '/samples/restaurant-menu.csv', label: 'Menu', file: 'menu.csv' },
  { path: '/samples/pitch-deck.md', label: 'Pitch deck', file: 'deck.md' },
  { path: '/samples/store-catalog.json', label: 'Catalogue', file: 'catalog.json' },
  { path: '/samples/conference.html', label: 'Event', file: 'event.html' },
];

export default function Builder() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [dragging, setDragging] = useState(false);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [result, setResult] = useState<BuildResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<EventSource | null>(null);

  useEffect(() => () => streamRef.current?.close(), []);

  const follow = useCallback((jobId: string) => {
    setPhase('building');
    const stream = new EventSource(`/api/jobs/${jobId}/events`);
    streamRef.current = stream;
    let terminal = false;

    stream.onmessage = (message) => {
      const event = JSON.parse(message.data as string) as
        | { type: 'stage'; stage: PipelineStage }
        | { type: 'done'; result: BuildResult }
        | { type: 'error'; message: string };

      if (event.type === 'stage') {
        setStages((current) => [...current, event.stage]);
        return;
      }
      terminal = true;
      stream.close();
      if (event.type === 'done') {
        setResult(event.result);
        setPhase('ready');
      } else {
        setError(event.message);
        setPhase('failed');
      }
    };

    stream.onerror = () => {
      stream.close();
      if (terminal) return;
      setError('Connection to the build pipeline dropped. Try again.');
      setPhase('failed');
    };
  }, []);

  const start = useCallback(
    async (upload: File, uploadNotes?: string) => {
      setStages([]);
      setResult(null);
      setError(null);
      setPublished(false);
      setPhase('uploading');

      const body = new FormData();
      body.append('files', upload);
      if (uploadNotes?.trim()) body.append('notes', uploadNotes.trim());

      const response = await fetch('/api/build', { method: 'POST', body }).catch(() => null);
      if (!response) {
        setError('Could not reach the build API.');
        setPhase('failed');
        return;
      }
      const payload = (await response.json()) as { jobId?: string; error?: string };
      if (!response.ok || !payload.jobId) {
        setError(payload.error ?? 'The file was rejected.');
        setPhase('failed');
        return;
      }
      setSource(upload.name);
      follow(payload.jobId);
    },
    [follow],
  );

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const dropped = event.dataTransfer.files?.[0];
    if (!dropped) return;
    setFile(dropped);
    void start(dropped, notes);
  };

  const loadSample = async (path = '/sample-resume.txt', label = 'sample.txt') => {
    const response = await fetch(path);
    // The bytes must survive intact: a photo fetched as text loses its magic numbers.
    const blob = await response.blob();
    const sample = new File([blob], label, { type: blob.type || 'text/plain' });
    setFile(sample);
    setNotes('');
    void start(sample);
  };

  const publish = async () => {
    if (!result) return;
    await fetch(`/api/sites/${result.id}/publish`, { method: 'POST' });
    setPublished(true);
  };

  const reset = () => {
    streamRef.current?.close();
    setPhase('idle');
    setFile(null);
    setStages([]);
    setResult(null);
    setError(null);
    setSource(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const busy = phase === 'uploading' || phase === 'building';
  const totalMs = result?.totalMs ?? stages.reduce((sum, stage) => sum + (stage.durationMs ?? 0), 0);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div className="space-y-5">
        <div
          className="dropzone rounded-2xl border border-dashed p-8"
          data-dragging={dragging}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          style={{ borderColor: 'var(--studio-border)', background: 'var(--studio-panel)' }}
        >
          <p className="text-sm font-medium">Drop any document — or a photo of one</p>
          <p className="mt-1 text-xs" style={{ color: 'var(--studio-muted)' }}>
            PDF · Word · Slides · Excel · RTF · Markdown · CSV · JSON · HTML · YAML · XML · email · photos (text is read
            on-device). No prompt, no format or template choice — it reads what you give it and works out the rest.
          </p>

          <input
            ref={inputRef}
            id="upload"
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(event) => {
              const picked = event.target.files?.[0];
              if (!picked) return;
              setFile(picked);
              void start(picked, notes);
            }}
          />

          <div className="mt-5 flex flex-wrap gap-3">
            <label
              htmlFor="upload"
              className={clsx(
                'cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold',
                busy && 'pointer-events-none opacity-60',
              )}
              style={{ background: 'var(--studio-accent)', color: '#fff' }}
            >
              {busy ? 'Building…' : 'Choose file'}
            </label>
            {(file || result || error) && (
              <button
                type="button"
                onClick={reset}
                className="rounded-lg px-4 py-2 text-sm"
                style={{ color: 'var(--studio-muted)' }}
              >
                Start over
              </button>
            )}
          </div>

          <div className="mt-5">
            <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--studio-muted)' }}>
              Or try one, any format
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {SAMPLES.map((sample) => (
                <button
                  key={sample.path}
                  type="button"
                  onClick={() => void loadSample(sample.path, sample.file)}
                  disabled={busy}
                  className="rounded-full border px-3 py-1 text-xs disabled:opacity-60"
                  style={{ borderColor: 'var(--studio-border)', color: 'var(--studio-text)' }}
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </div>

          {file && <p className="mt-4 truncate text-xs" style={{ color: 'var(--studio-muted)' }}>{file.name}</p>}
        </div>

        <div>
          <label htmlFor="notes" className="text-xs uppercase tracking-wider" style={{ color: 'var(--studio-muted)' }}>
            Optional: anything the document does not say
          </label>
          <textarea
            id="notes"
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            disabled={busy}
            placeholder="e.g. I want freelance clients, not job offers."
            className="mt-2 w-full resize-none rounded-xl border p-3 text-sm outline-none disabled:opacity-60"
            style={{ borderColor: 'var(--studio-border)', background: 'var(--studio-panel)', color: 'var(--studio-text)' }}
          />
        </div>

        <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--studio-border)', background: 'var(--studio-panel)' }}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--studio-muted)' }}>
              Agent pipeline
            </p>
            <p className="font-mono text-xs" style={{ color: 'var(--studio-accent-2)' }}>
              {fmt(totalMs)}
            </p>
          </div>
          <ol className="mt-4 space-y-3">
            {AGENTS.map(({ key, label }, index) => {
              const stage = stages.find((item) => item.agent === key);
              const isLive = phase === 'building' && !stage && index === stages.length;
              return (
                <li key={key} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className={clsx(isLive && 'stage-live')} style={{ color: stage ? 'var(--studio-text)' : 'var(--studio-muted)' }}>
                    {label}
                  </span>
                  {stage && (
                    <span className="truncate text-right text-xs" style={{ color: 'var(--studio-muted)' }}>
                      {stage.output} <span className="font-mono">({fmt(stage.durationMs ?? 0)})</span>
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
          {error && (
            <p className="mt-4 rounded-lg border p-3 text-xs" style={{ borderColor: '#7f1d1d', color: '#fca5a5' }}>
              {error}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {result ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{result.site.title}</p>
                <p className="text-xs" style={{ color: 'var(--studio-muted)' }}>
                  {result.site.theme.name} · {result.site.blocks.length} sections ·{' '}
                  {result.usedLlm ? 'Claude-polished copy' : 'deterministic copy engine'} · source: {source}
                </p>
              </div>
              <div className="flex gap-2">
                <a
                  href={result.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border px-3 py-2 text-xs"
                  style={{ borderColor: 'var(--studio-border)' }}
                >
                  Open full screen
                </a>
                <button
                  type="button"
                  onClick={publish}
                  disabled={published}
                  className="rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-70"
                  style={{ background: 'var(--studio-accent)', color: '#fff' }}
                >
                  {published ? `Published · ${result.url}` : 'Publish'}
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--studio-border)' }}>
              <iframe
                title={`Preview of ${result.site.title}`}
                src={result.url}
                className="h-[620px] w-full bg-white"
                sandbox="allow-scripts allow-same-origin allow-popups"
              />
            </div>

            <details className="rounded-2xl border p-5" style={{ borderColor: 'var(--studio-border)', background: 'var(--studio-panel)' }}>
              <summary className="cursor-pointer text-sm font-semibold">Why the AI made these choices</summary>
              <ul className="mt-4 space-y-2">
                {result.site.decisions.map((decision, index) => (
                  <li key={index} className="text-xs leading-relaxed" style={{ color: 'var(--studio-muted)' }}>
                    {decision}
                  </li>
                ))}
              </ul>
            </details>
          </>
        ) : (
          <div
            className="flex h-[620px] items-center justify-center rounded-2xl border text-center text-sm"
            style={{ borderColor: 'var(--studio-border)', background: 'var(--studio-panel)', color: 'var(--studio-muted)' }}
          >
            {busy ? 'The site assembles itself — watch the agents work.' : 'Your live preview lands here.'}
          </div>
        )}
      </div>
    </div>
  );
}
