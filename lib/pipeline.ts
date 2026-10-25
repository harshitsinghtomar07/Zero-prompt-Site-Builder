import { intake } from '@/lib/ingest';
import { buildContentProfile } from '@/lib/agents/content-intelligence';
import { planSite } from '@/lib/agents/site-strategy';
import { designTheme } from '@/lib/agents/design-intelligence';
import { composeBlocks, buildSeo } from '@/lib/agents/content-generation';
import { generateHeroArt, generateGalleryTiles } from '@/lib/agents/visual-generation';
import { polishWithModel } from '@/lib/agents/llm-polish';
import { assembleSite, type QualityReport } from '@/lib/agents/build-agent';
import { llmStatus } from '@/lib/ai/llm';
import { SeededPicker, siteId } from '@/lib/uniqueness';
import { saveSite } from '@/lib/store';
import type { BuildResult, PipelineStage } from '@/lib/types/site';

export type StageEvent =
  | { type: 'stage'; stage: PipelineStage }
  | { type: 'done'; result: BuildResult }
  | { type: 'error'; message: string };

export interface PipelineInput {
  sources: { name: string; buffer: Buffer }[];
  notes?: string;
}

const AGENT_LABELS: Record<string, string> = {
  ingest: 'Document intake',
  content: 'Content Intelligence Agent',
  strategy: 'Site Strategy Agent',
  design: 'Design Intelligence Agent',
  visual: 'Visual Generation Agent',
  copy: 'Content Generation Agent',
  polish: 'Model copy pass',
  build: 'Build Agent',
};

/**
 * Runs the six-agent build. Independent work (art generation and model polish)
 * is fanned out so the whole path stays inside the 30s preview budget.
 */
export async function runPipeline(input: PipelineInput, emit: (event: StageEvent) => void): Promise<BuildResult> {
  const started = Date.now();
  const stages: PipelineStage[] = [];

  const stage = async <T>(
    agent: string,
    summarize: (value: T) => string,
    work: () => Promise<T> | T,
  ): Promise<T> => {
    const mark = Date.now();
    const t0 = performance.now();
    const value = await work();
    const record: PipelineStage = {
      agent,
      label: AGENT_LABELS[agent] ?? agent,
      startedAt: mark,
      durationMs: Math.round((performance.now() - t0) * 10) / 10,
      output: summarize(value),
      detail: typeof value === 'string' || typeof value === 'number' ? String(value) : undefined,
    };
    stages.push(record);
    emit({ type: 'stage', stage: record });
    return value;
  };

  const read = await stage('ingest', (result) =>
    result.documents.length
      ? `${result.documents.length} file${result.documents.length > 1 ? 's' : ''} · ${result.text.length} characters`
      : `Pasted notes · ${result.text.length} characters`,
  () => intake(input.sources, input.notes));

  if (read.text.replace(/[^a-z0-9]/gi, '').length < 24) {
    throw new Error(
      read.observations.length
        ? `Nothing readable came through: ${read.observations.join(' ')} Add a short note about what you do and try again.`
        : 'There was not enough text to work with. Type a sentence or two about what this site is for.',
    );
  }

  const profile = await stage('content', (p) => `${p.name || 'unnamed'} · ${p.kind.replace(/_/g, ' ')} · ${p.sections.length} sections`, () =>
    buildContentProfile(read.text, read.assets),
  );

  const seedKey = `${profile.name}|${profile.kind}|${read.text.slice(0, 400)}|${Math.floor(started / 60000)}`;
  const seed = new SeededPicker(`${seedKey}:strategy`);
  const id = siteId(seedKey);

  const plan = await stage('strategy', (p) => `${p.category.replace(/_/g, ' ')} · ${p.blocks.length} sections`, () =>
    planSite(profile, seed.int(5)),
  );
  const design = await stage('design', (d) => `${d.theme.name} · ${d.theme.heroLayout} hero · ${d.theme.signature}`, () =>
    designTheme(plan.category, profile, seedKey),
  );

  const visuals = await stage('visual', (v) => `${design.theme.artStyle} art, ${v.art.length} bytes · ${v.tiles.length} tiles`, () => ({
    art: generateHeroArt(design.theme, seedKey),
    tiles: generateGalleryTiles(design.theme, seedKey, plan.blocks.includes('gallery') ? 9 : 0),
  }));

  const draftBlocks = await stage('copy', (blocks) => `${blocks.length} sections drafted`, () =>
    composeBlocks(profile, plan, design.theme, seedKey, visuals),
  );
  const seoDraft = buildSeo(profile, plan, draftBlocks);

  const provider = llmStatus();
  let polished = { blocks: draftBlocks, seo: seoDraft, applied: false };
  if (provider.enabled) {
    polished = await stage('polish', (result) => (result.applied ? 'model pass applied' : 'model pass rejected'), () =>
      polishWithModel(profile, plan, design.theme.name, draftBlocks, seoDraft).catch(() => ({
        blocks: draftBlocks,
        seo: seoDraft,
        applied: false,
      })),
    );
  }

  const built = await stage('build', (b) => `${b.site.blocks.length} sections · ${b.quality.words} words · ${b.quality.contrast[0].ratio}:1 contrast`, () =>
    assembleSite({
      id,
      profile,
      plan,
      theme: design.theme,
      blocks: polished.blocks,
      seo: polished.seo,
      observations: read.observations,
    }),
  );

  const result: BuildResult = {
    id,
    site: built.site,
    stages,
    totalMs: Date.now() - started,
    usedLlm: provider.enabled && polished.applied,
    url: `/preview/${id}`,
  };

  await saveSite(result, built.quality);
  return result;
}

export type { QualityReport };
