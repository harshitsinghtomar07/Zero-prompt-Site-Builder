import { completeJson, LlmUnavailable, llmStatus } from '@/lib/ai/llm';
import type { ContentProfile } from '@/lib/types/profile';
import type { Block, SeoMeta } from '@/lib/types/site';
import type { SitePlan } from './site-strategy';

interface CopyPatch {
  hero?: { eyebrow?: string; headline?: string; subheadline?: string };
  about?: string[];
  cta?: { heading?: string; body?: string };
  seo?: Partial<SeoMeta>;
}

const SYSTEM = `You are the content-generation agent inside a zero-prompt website builder.
You are given a structured profile extracted from a user's uploaded document and the draft copy already on the page.
Rewrite ONLY the fields requested. Rules:
- Never invent employers, dates, metrics, clients, or testimonials that are not in the input.
- Match the register of the design theme, write in the third person only if the draft does.
- Headline: max 80 chars, no clickbait, concrete over clever.
- Return JSON only: {"hero":{"eyebrow","headline","subheadline"},"about":[..],"cta":{"heading","body"},"seo":{"title","description","keywords":[]}}`;

function clamp(value: unknown, max: number): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : undefined;
}

/**
 * Optional upgrade path. The deterministic copy is always the safety net: a bad
 * or slow model response can never leave the user without a publishable site.
 */
export async function polishWithModel(
  profile: ContentProfile,
  plan: SitePlan,
  themeName: string,
  draft: Block[],
  seo: SeoMeta,
): Promise<{ blocks: Block[]; seo: SeoMeta; applied: boolean }> {
  const hero = draft.find((b) => b.kind === 'hero');
  const about = draft.find((b) => b.kind === 'about');
  try {
    const raw = await completeJson(
      SYSTEM,
      JSON.stringify(
        {
          profile: {
            ...profile,
            gallery: `${profile.gallery.length} images omitted`,
            sections: profile.sections.map((section) => ({ heading: section.heading, role: section.role, lines: section.lines.slice(0, 12) })),
          },
          site: { category: plan.category, goal: plan.goal, audience: plan.audience, theme: themeName },
          draft: {
            hero: hero && hero.kind === 'hero' ? { eyebrow: hero.eyebrow, headline: hero.headline, subheadline: hero.subheadline } : null,
            about: about && about.kind === 'about' ? about.body : null,
          },
        },
        null,
        2,
      ),
      { maxTokens: 900, temperature: 0.6 },
    );

    const patch = raw as CopyPatch;
    const blocks = draft.map((block) => {
      if (block.kind === 'hero' && patch.hero) {
        return {
          ...block,
          eyebrow: clamp(patch.hero.eyebrow, 48) ?? block.eyebrow,
          headline: clamp(patch.hero.headline, 96) ?? block.headline,
          subheadline: clamp(patch.hero.subheadline, 280) ?? block.subheadline,
        };
      }
      if (block.kind === 'about' && Array.isArray(patch.about)) {
        const body = patch.about.map((line) => clamp(line, 700)).filter(Boolean) as string[];
        return body.length ? { ...block, body } : block;
      }
      if (block.kind === 'cta' && patch.cta) {
        return { ...block, heading: clamp(patch.cta.heading, 60) ?? block.heading, body: clamp(patch.cta.body, 240) ?? block.body };
      }
      return block;
    });

    const nextSeo: SeoMeta = {
      ...seo,
      title: clamp(patch.seo?.title, 70) ?? seo.title,
      description: clamp(patch.seo?.description, 170) ?? seo.description,
      keywords: Array.isArray(patch.seo?.keywords) ? (patch.seo!.keywords as string[]).slice(0, 14) : seo.keywords,
    };

    const applied = blocks.some((block, index) => block !== draft[index]) || nextSeo.title !== seo.title;
    return { blocks, seo: nextSeo, applied };
  } catch (error) {
    if (error instanceof LlmUnavailable) throw error;
    return { blocks: draft, seo, applied: false };
  }
}

export const modelAvailable = () => llmStatus().enabled;
