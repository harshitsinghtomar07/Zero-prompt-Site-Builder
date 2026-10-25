import type { ContentProfile } from '@/lib/types/profile';
import type { Block, SiteSpec, ThemeTokens, SeoMeta } from '@/lib/types/site';
import type { SitePlan } from './site-strategy';

export interface QualityReport {
  contrast: { pair: string; ratio: number; pass: boolean }[];
  issues: string[];
  sections: number;
  words: number;
}

function channel(hex: string, index: number): number {
  const v = parseInt(hex.replace('#', '').slice(index * 2, index * 2 + 2), 16) / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  return 0.2126 * channel(hex, 0) + 0.7152 * channel(hex, 1) + 0.0722 * channel(hex, 2);
}

export function contrastRatio(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** A tint between two colours, keeping the hue of the first. */
function shade(hex: string, toward: string, t: number): string {
  const octet = (value: string, index: number) => parseInt(value.replace('#', '').slice(index * 2, index * 2 + 2), 16);
  return `#${[0, 1, 2]
    .map((i) => Math.round(octet(hex, i) * (1 - t) + octet(toward, i) * t).toString(16).padStart(2, '0'))
    .join('')}`;
}

/**
 * A button whose label cannot be read is a defect, not a style. The label takes
 * whichever extreme reads better against the accent, and when even that fails
 * the accent itself moves toward that extreme until the pair clears WCAG AA.
 */
function readableButton(accent: string): { accent: string; onAccent: string } {
  const white = contrastRatio(accent, '#FFFFFF');
  const black = contrastRatio(accent, '#0B0B0B');
  const label = black >= white ? '#0B0B0B' : '#FFFFFF';
  if (Math.max(white, black) >= 4.5) return { accent, onAccent: label };
  const toward = label === '#FFFFFF' ? '#000000' : '#FFFFFF';
  for (let t = 0.05; t <= 0.9; t += 0.05) {
    const next = shade(accent, toward, t);
    if (contrastRatio(next, label) >= 4.5) return { accent: next, onAccent: label };
  }
  return { accent, onAccent: label };
}

function words(...texts: (string | string[] | undefined)[]): number {
  return texts
    .flat()
    .filter((text): text is string => typeof text === 'string')
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length;
}

function countWords(block: Block): number {
  switch (block.kind) {
    case 'hero':
      return words(block.eyebrow, block.headline, block.subheadline, block.facts.map((f) => `${f.label} ${f.value}`));
    case 'marquee':
      return words(block.items);
    case 'about':
      return words(block.body, block.highlights);
    case 'quote':
      return words(block.text, block.attribution);
    case 'stats':
      return words(block.items.map((item) => `${item.value} ${item.label}`));
    case 'features':
      return words(block.heading, block.intro, block.items.map((item) => `${item.title} ${item.body} ${item.tags.join(' ')}`));
    case 'process':
      return words(block.heading, block.intro, block.steps.map((step) => `${step.title} ${step.body}`));
    case 'chapters':
      return words(block.heading, block.items.map((item) => `${item.title} ${item.body} ${item.tags.join(' ')}`));
    case 'offers':
      return words(block.heading, block.intro, block.items.map((item) => `${item.name} ${item.detail} ${item.price}`));
    case 'gallery':
      return words(block.heading, block.intro, block.items.map((item) => item.caption));
    case 'agenda':
      return words(block.heading, block.intro, block.items.map((item) => `${item.time} ${item.title} ${item.body}`));
    case 'team':
      return words(block.heading, block.intro, block.items.map((item) => `${item.name} ${item.role} ${item.note}`));
    case 'testimonials':
      return words(block.items.map((item) => `${item.quote} ${item.author} ${item.role}`));
    case 'faq':
      return words(block.items.map((item) => `${item.question} ${item.answer}`));
    case 'posts':
      return words(block.items.map((item) => `${item.title} ${item.body}`));
    case 'skills':
      return words(block.groups.map((group) => `${group.name} ${group.items.join(' ')}`));
    case 'experience':
      return words(block.entries.map((entry) => `${entry.role} ${entry.org} ${entry.bullets.join(' ')}`));
    case 'projects':
      return words(block.items.map((item) => `${item.name} ${item.blurb} ${item.tags.join(' ')}`));
    case 'education':
      return words(block.items.map((item) => `${item.award} ${item.org} ${item.detail}`));
    case 'cta':
      return words(block.heading, block.body);
    case 'contact':
      return words(block.heading, block.body, block.availability);
    default:
      return 0;
  }
}

/** Blocks that ended up with nothing real to say are removed, not padded. */
function substantiated(block: Block): boolean {
  switch (block.kind) {
    case 'hero':
      return block.headline.length > 3;
    case 'marquee':
      return block.items.length >= 4;
    case 'about':
      return block.body.join(' ').length > 60;
    case 'quote':
      return block.text.length > 40;
    case 'stats':
      return block.items.length >= 2;
    case 'features':
      return block.items.length >= 2;
    case 'process':
      return block.steps.length >= 2;
    case 'chapters':
      return block.items.filter((item) => item.body.length > 30).length >= 2;
    case 'offers':
      return block.items.length >= 2;
    case 'gallery':
      return block.items.length >= 1;
    case 'agenda':
      return block.items.length >= 2;
    case 'team':
      return block.items.length >= 2;
    case 'testimonials':
      return block.items.some((item) => item.quote.length > 24);
    case 'faq':
      return block.items.length >= 2;
    case 'posts':
      return block.items.length >= 2;
    case 'contact':
      return !!(block.email || block.phone || block.address || block.links.length);
    case 'skills':
      return block.groups.some((group) => group.items.length > 0);
    case 'experience':
      return block.entries.length > 0 && block.entries.some((entry) => entry.bullets.length > 0 || entry.org);
    case 'projects':
      return block.items.length > 0;
    case 'education':
      return block.items.length > 0;
    default:
      return true;
  }
}

/** Agent 6: assembles the renderable site and audits what it produced. */
export function assembleSite(args: {
  id: string;
  profile: ContentProfile;
  plan: SitePlan;
  theme: ThemeTokens;
  blocks: Block[];
  seo: SeoMeta;
  observations: string[];
}): { site: SiteSpec; quality: QualityReport } {
  const { id, profile, plan, seo } = args;
  const dropped: string[] = [];
  const blocks = args.blocks.filter((block) => {
    const keep = substantiated(block);
    if (!keep) dropped.push(block.kind);
    return keep;
  });

  const nav = plan.nav.filter((item) => blocks.some((block) => block.kind === item.href.slice(1)));

  let safeTheme = args.theme;
  const textRatio = contrastRatio(safeTheme.palette.text, safeTheme.palette.bg);
  const mutedRatio = contrastRatio(safeTheme.palette.muted, safeTheme.palette.surface);
  const button = readableButton(safeTheme.palette.accent);
  if (textRatio < 4.5 || mutedRatio < 3 || button.onAccent !== safeTheme.palette.onAccent) {
    const dark = luminance(safeTheme.palette.bg) > 0.5;
    safeTheme = {
      ...safeTheme,
      palette: {
        ...safeTheme.palette,
        text: textRatio < 4.5 ? (dark ? '#0B0B0B' : '#FAFAFA') : safeTheme.palette.text,
        muted: mutedRatio < 3 ? (dark ? '#4B5563' : '#A7B3C4') : safeTheme.palette.muted,
        accent: button.accent,
        onAccent: button.onAccent,
      },
    };
  }

  const finalText = contrastRatio(safeTheme.palette.text, safeTheme.palette.bg);
  const finalAccent = contrastRatio(safeTheme.palette.onAccent, safeTheme.palette.accent);
  const finalMuted = contrastRatio(safeTheme.palette.muted, safeTheme.palette.surface);

  const quality: QualityReport = {
    contrast: [
      { pair: 'body text on background', ratio: Number(finalText.toFixed(2)), pass: finalText >= 4.5 },
      { pair: 'button label on accent', ratio: Number(finalAccent.toFixed(2)), pass: finalAccent >= 4.5 },
      { pair: 'muted text on surface', ratio: Number(finalMuted.toFixed(2)), pass: finalMuted >= 3 },
    ],
    issues: [],
    sections: blocks.length,
    words: blocks.reduce((sum, block) => sum + countWords(block), 0),
  };

  if (quality.words < 120) quality.issues.push('Thin content: the upload was short, so sections are lighter than usual.');
  if (dropped.length) quality.issues.push(`Dropped ${dropped.join(', ')} — the upload did not support them.`);
  if (blocks.some((b) => b.kind === 'hero' && b.facts.length === 0)) quality.issues.push('Hero has no supporting facts; add a location, date, or price.');
  if (!profile.email) quality.issues.push('No email found, so contact falls back to the links in the upload.');
  if (!profile.gallery.length && blocks.some((b) => b.kind === 'gallery')) quality.issues.push('Gallery tiles are generated art — upload images to replace them.');

  return {
    site: {
      id,
      generatedAt: new Date().toISOString(),
      category: plan.category,
      sourceKind: profile.kind.replace(/_/g, ' '),
      title: seo.title,
      ownerName: profile.name,
      nav: {
        brand: plan.brand,
        items: nav,
        cta: profile.email || profile.links.length ? { label: plan.category === 'restaurant' ? 'Book' : 'Contact', href: profile.email ? `mailto:${profile.email}` : '#contact' } : undefined,
      },
      theme: safeTheme,
      blocks,
      seo,
      observations: args.observations,
      decisions: [
        ...plan.rationale,
        `Design system: ${safeTheme.name} (${safeTheme.heroLayout} hero, ${safeTheme.artStyle} art, ${safeTheme.signature} signature, ${safeTheme.composition} composition).`,
        `Copy written from ${profile.rawLength} characters of source with ${quality.words} words of output.`,
        `Accessibility: body contrast ${quality.contrast[0].ratio}:1, CTA contrast ${quality.contrast[1].ratio}:1.`,
        ...quality.issues,
      ],
    },
    quality,
  };
}
