import { randomUUID } from 'node:crypto';
import type { StageEvent } from './pipeline';
import type { BuildResult } from './types/site';

interface Job {
  id: string;
  createdAt: number;
  events: StageEvent[];
  done: boolean;
  listeners: Set<(event: StageEvent) => void>;
}

/** Survives Next dev hot-reload; a real deployment would use a queue or Redis. */
const globalStore = globalThis as unknown as { __zeroPromptJobs?: Map<string, Job> };
const jobs = globalStore.__zeroPromptJobs ?? new Map<string, Job>();
globalStore.__zeroPromptJobs = jobs;

const TTL_MS = 30 * 60 * 1000;

function prune(): void {
  const cutoff = Date.now() - TTL_MS;
  for (const [id, job] of jobs) {
    if (job.done && job.createdAt < cutoff) jobs.delete(id);
  }
}

export function createJob(): { id: string; emit: (event: StageEvent) => void } {
  prune();
  const id = randomUUID();
  const job: Job = { id, createdAt: Date.now(), events: [], done: false, listeners: new Set() };
  jobs.set(id, job);

  return {
    id,
    emit: (event) => {
      job.events.push(event);
      if (event.type !== 'stage') job.done = true;
      for (const listener of job.listeners) listener(event);
    },
  };
}

export function subscribe(jobId: string, listener: (event: StageEvent) => void): () => void {
  const job = jobs.get(jobId);
  if (!job) return () => {};
  for (const event of job.events) listener(event);
  job.listeners.add(listener);
  return () => job.listeners.delete(listener);
}

export function jobExists(jobId: string): boolean {
  return jobs.has(jobId);
}

export function jobResult(jobId: string): BuildResult | undefined {
  const job = jobs.get(jobId);
  const done = job?.events.find((event): event is Extract<StageEvent, { type: 'done' }> => event.type === 'done');
  return done?.result;
}
