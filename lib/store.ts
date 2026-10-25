import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { BuildResult, SiteSpec } from '@/lib/types/site';
import type { QualityReport } from '@/lib/agents/build-agent';

/**
 * Local JSON persistence behind a narrow interface — the production target is a
 * Supabase table with the same shape, so nothing above this file changes.
 */
const DATA_DIR = join(process.cwd(), '.data', 'sites');

const safe = (id: string) => (/^[a-z0-9-]{4,32}$/.test(id) ? id : null);

export interface StoredSite {
  result: BuildResult;
  quality: QualityReport;
  publishedAt: string | null;
}

async function writeAtomic(path: string, payload: unknown): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(payload, null, 2), 'utf8');
  await rename(tmp, path);
}

export async function saveSite(result: BuildResult, quality: QualityReport): Promise<string> {
  const id = safe(result.id);
  if (!id) throw new Error('Refusing to store a site with an unsafe id.');
  const record: StoredSite = { result, quality, publishedAt: null };
  await writeAtomic(join(DATA_DIR, `${id}.json`), record);
  return id;
}

export async function loadSite(id: string): Promise<StoredSite | null> {
  const key = safe(id);
  if (!key) return null;
  try {
    const raw = await readFile(join(DATA_DIR, `${key}.json`), 'utf8');
    return JSON.parse(raw) as StoredSite;
  } catch {
    return null;
  }
}

export async function publishSite(id: string): Promise<StoredSite | null> {
  const record = await loadSite(id);
  if (!record) return null;
  record.publishedAt = new Date().toISOString();
  await writeAtomic(join(DATA_DIR, `${record.result.id}.json`), record);
  return record;
}

export async function listSites(): Promise<SiteSpec[]> {
  let names: string[] = [];
  try {
    names = await readdir(DATA_DIR);
  } catch {
    return [];
  }
  const sites = await Promise.all(
    names
      .filter((name) => name.endsWith('.json'))
      .map(async (name) => {
        try {
          const raw = await readFile(join(DATA_DIR, name), 'utf8');
          return (JSON.parse(raw) as StoredSite).result.site;
        } catch {
          return null;
        }
      }),
  );
  return sites
    .filter((site): site is SiteSpec => site !== null)
    .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
}
