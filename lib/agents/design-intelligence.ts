import type { SiteCategory, ThemeTokens } from '@/lib/types/site';
import type { ContentProfile } from '@/lib/types/profile';
import { SeededPicker } from '@/lib/uniqueness';

interface ThemeBase extends Omit<ThemeTokens, 'heroLayout' | 'artStyle'> {
  heroLayouts: ThemeTokens['heroLayout'][];
  artStyles: ThemeTokens['artStyle'][];
  fit: SiteCategory[];
  /** Extra vocabulary that pulls this theme forward for a kind of content. */
  cues: RegExp;
}

const THEMES: ThemeBase[] = [
  {
    name: 'Technical Developer',
    fit: ['developer_portfolio', 'resume_site'],
    cues: /\b(engine|code|software|api|backend|systems?)\b/,
    radius: '10px',
    density: 'compact',
    sectionSpacing: 88,
    fonts: { heading: 'Space Grotesk', body: 'Inter', mono: 'JetBrains Mono' },
    headingWeight: 600,
    headingTracking: '-0.02em',
    maxContentWidth: '1160px',
    signature: 'grid',
    composition: 'bento',
    motion: 'kinetic',
    palette: {
      bg: '#0B0E14', surface: '#121722', surfaceAlt: '#0F1420', border: '#1F2735',
      text: '#E8EDF7', muted: '#93A1B8', accent: '#5EEAD4', accentSoft: '#123C38', onAccent: '#06231F',
      accent2: '#7DD3FC', hero: { from: '#0B0E14', via: '#101A2A', to: '#0B0E14', angle: 140 },
    },
    heroLayouts: ['split', 'canvas', 'asymmetric'],
    artStyles: ['blueprint', 'orbit', 'halftone'],
  },
  {
    name: 'Terminal Revival',
    fit: ['developer_portfolio', 'saas', 'blog'],
    cues: /\b(cli|open\s?source|terminal|linux|rust|go|devtools|sdk)\b/,
    radius: '2px',
    density: 'compact',
    sectionSpacing: 80,
    fonts: { heading: 'IBM Plex Mono', body: 'IBM Plex Sans', mono: 'IBM Plex Mono' },
    headingWeight: 600,
    headingTracking: '0em',
    maxContentWidth: '1020px',
    signature: 'glow',
    composition: 'stack',
    motion: 'kinetic',
    palette: {
      bg: '#08090A', surface: '#101314', surfaceAlt: '#0C0F10', border: '#232A2B',
      text: '#DFF7E9', muted: '#7FA492', accent: '#3BF0A2', accentSoft: '#0E2A20', onAccent: '#04170F',
      accent2: '#F2C14E', hero: { from: '#08090A', via: '#0E1A16', to: '#08090A', angle: 180 },
    },
    heroLayouts: ['stacked', 'split'],
    artStyles: ['blueprint', 'confetti'],
  },
  {
    name: 'Neo Editorial',
    fit: ['blog', 'personal_portfolio', 'agency', 'creator'],
    cues: /\b(writer|journal|essay|story|press|magazine|editor)\b/,
    radius: '0px',
    density: 'roomy',
    sectionSpacing: 128,
    fonts: { heading: 'Instrument Serif', body: 'Source Serif 4', mono: 'IBM Plex Mono' },
    headingWeight: 400,
    headingTracking: '-0.01em',
    maxContentWidth: '1080px',
    signature: 'rules',
    composition: 'editorial',
    motion: 'subtle',
    palette: {
      bg: '#FAF8F3', surface: '#FFFFFF', surfaceAlt: '#F1EDE4', border: '#D9D2C4',
      text: '#141210', muted: '#5F594E', accent: '#B02E2E', accentSoft: '#F6E6E1', onAccent: '#FFFFFF',
      accent2: '#1F3A5F', hero: { from: '#FAF8F3', via: '#EFE9DD', to: '#FAF8F3', angle: 100 },
    },
    heroLayouts: ['editorial', 'stacked'],
    artStyles: ['halftone', 'waves'],
  },
  {
    name: 'Modern Minimalist',
    fit: ['personal_portfolio', 'consultant', 'blog', 'creator'],
    cues: /\b(photograph|minimal|calm|craft|pottery|ceramic)\b/,
    radius: '16px',
    density: 'roomy',
    sectionSpacing: 112,
    fonts: { heading: 'Fraunces', body: 'Inter', mono: 'IBM Plex Mono' },
    headingWeight: 500,
    headingTracking: '-0.015em',
    maxContentWidth: '1040px',
    signature: 'blob',
    composition: 'editorial',
    motion: 'subtle',
    palette: {
      bg: '#FBFAF7', surface: '#FFFFFF', surfaceAlt: '#F3F1EC', border: '#E3DFD6',
      text: '#181A1B', muted: '#6B6F76', accent: '#C2410C', accentSoft: '#FDF0E7', onAccent: '#FFFFFF',
      accent2: '#0F766E', hero: { from: '#FBFAF7', via: '#F1EDE4', to: '#FBFAF7', angle: 120 },
    },
    heroLayouts: ['editorial', 'centered', 'canvas'],
    artStyles: ['waves', 'mesh', 'topo'],
  },
  {
    name: 'Startup Gradient',
    fit: ['startup_landing', 'saas'],
    cues: /\b(saas|platform|ai|automation|beta|early\s+access)\b/,
    radius: '20px',
    density: 'regular',
    sectionSpacing: 100,
    fonts: { heading: 'Sora', body: 'Manrope', mono: 'JetBrains Mono' },
    headingWeight: 700,
    headingTracking: '-0.03em',
    maxContentWidth: '1200px',
    signature: 'glow',
    composition: 'bento',
    motion: 'kinetic',
    palette: {
      bg: '#07070F', surface: '#101024', surfaceAlt: '#0C0C1B', border: '#232345',
      text: '#F4F4FF', muted: '#A0A0C8', accent: '#8B5CF6', accentSoft: '#1D1440', onAccent: '#FFFFFF',
      accent2: '#22D3EE', hero: { from: '#0A0618', via: '#231257', to: '#07070F', angle: 135 },
    },
    heroLayouts: ['centered', 'canvas', 'split'],
    artStyles: ['mesh', 'orbit', 'rays'],
  },
  {
    name: 'Aurora Glass',
    fit: ['saas', 'startup_landing', 'event', 'creator'],
    cues: /\b(analytics|dashboard|collaboration|design\s+tool|community)\b/,
    radius: '24px',
    density: 'regular',
    sectionSpacing: 96,
    fonts: { heading: 'Plus Jakarta Sans', body: 'Inter', mono: 'JetBrains Mono' },
    headingWeight: 700,
    headingTracking: '-0.025em',
    maxContentWidth: '1220px',
    signature: 'blob',
    composition: 'bento',
    motion: 'kinetic',
    palette: {
      bg: '#0A1020', surface: '#141C31', surfaceAlt: '#101828', border: '#26324C',
      text: '#F1F6FF', muted: '#9DB0D0', accent: '#38BDF8', accentSoft: '#0E2A44', onAccent: '#041826',
      accent2: '#F472B6', hero: { from: '#0A1020', via: '#1B2E52', to: '#2A1440', angle: 155 },
    },
    heroLayouts: ['canvas', 'centered'],
    artStyles: ['mesh', 'topo', 'rays'],
  },
  {
    name: 'Premium Corporate',
    fit: ['business', 'agency', 'consultant', 'nonprofit'],
    cues: /\b(enterprise|compliance|advisory|board|partners|regulatory)\b/,
    radius: '6px',
    density: 'regular',
    sectionSpacing: 96,
    fonts: { heading: 'Newsreader', body: 'Inter', mono: 'IBM Plex Mono' },
    headingWeight: 600,
    headingTracking: '-0.01em',
    maxContentWidth: '1140px',
    signature: 'rules',
    composition: 'split',
    motion: 'subtle',
    palette: {
      bg: '#FFFFFF', surface: '#F7F9FC', surfaceAlt: '#EEF2F7', border: '#D8DFE8',
      text: '#0F1B2D', muted: '#5A6B84', accent: '#1D4ED8', accentSoft: '#E8EEFC', onAccent: '#FFFFFF',
      accent2: '#0F766E', hero: { from: '#F7F9FC', via: '#E9EFF8', to: '#FFFFFF', angle: 160 },
    },
    heroLayouts: ['split', 'editorial'],
    artStyles: ['stack', 'waves', 'topo'],
  },
  {
    name: 'Bold Agency',
    fit: ['agency', 'creator', 'personal_portfolio', 'event'],
    cues: /\b(brand|campaign|studio|creative|awards?|bold)\b/,
    radius: '2px',
    density: 'roomy',
    sectionSpacing: 120,
    fonts: { heading: 'Archivo', body: 'Archivo', mono: 'Space Mono' },
    headingWeight: 800,
    headingTracking: '-0.04em',
    maxContentWidth: '1280px',
    signature: 'outline',
    composition: 'bento',
    motion: 'kinetic',
    palette: {
      bg: '#111111', surface: '#1A1A1A', surfaceAlt: '#0C0C0C', border: '#2E2E2E',
      text: '#FAFAF7', muted: '#A6A69E', accent: '#D6FF3F', accentSoft: '#26300B', onAccent: '#111111',
      accent2: '#FF6B35', hero: { from: '#111111', via: '#1C1C18', to: '#0A0A0A', angle: 110 },
    },
    heroLayouts: ['stacked', 'asymmetric', 'editorial'],
    artStyles: ['stack', 'confetti', 'halftone'],
  },
  {
    name: 'Luxury Brand',
    fit: ['restaurant', 'personal_portfolio', 'event', 'agency'],
    cues: /\b(fine\s+dining|wine|whisky|fashion|jewel|heritage|artisan|reserve)\b/,
    radius: '4px',
    density: 'roomy',
    sectionSpacing: 124,
    fonts: { heading: 'Playfair Display', body: 'Jost', mono: 'Cormorant Garamond' },
    headingWeight: 500,
    headingTracking: '0.01em',
    maxContentWidth: '1080px',
    signature: 'grain',
    composition: 'editorial',
    motion: 'subtle',
    palette: {
      bg: '#0F0D0A', surface: '#171410', surfaceAlt: '#120F0B', border: '#2A2318',
      text: '#F3EDE2', muted: '#A99F8C', accent: '#C9A227', accentSoft: '#2A2210', onAccent: '#17130A',
      accent2: '#E8D5B5', hero: { from: '#14100A', via: '#211A10', to: '#0F0D0A', angle: 150 },
    },
    heroLayouts: ['centered', 'editorial', 'canvas'],
    artStyles: ['waves', 'orbit', 'topo'],
  },
  {
    name: 'Roast & Cream',
    fit: ['restaurant', 'business', 'ecommerce_landing'],
    cues: /\b(cafe|coffee|roast|bakery|brunch|espresso|pastry|tea)\b/,
    radius: '18px',
    density: 'regular',
    sectionSpacing: 96,
    fonts: { heading: 'DM Serif Display', body: 'Karla', mono: 'Space Mono' },
    headingWeight: 500,
    headingTracking: '-0.01em',
    maxContentWidth: '1120px',
    signature: 'grain',
    composition: 'bento',
    motion: 'subtle',
    palette: {
      bg: '#F6EFE6', surface: '#FFFDF9', surfaceAlt: '#EFE3D4', border: '#DCC9B2',
      text: '#2A1B12', muted: '#7A6553', accent: '#8C4A2F', accentSoft: '#F0DDCB', onAccent: '#FFF8F1',
      accent2: '#3F6D5A', hero: { from: '#F6EFE6', via: '#E9D8C2', to: '#F6EFE6', angle: 120 },
    },
    heroLayouts: ['split', 'editorial', 'canvas'],
    artStyles: ['confetti', 'waves', 'halftone'],
  },
  {
    name: 'Night Market',
    fit: ['event', 'creator', 'startup_landing'],
    cues: /\b(festival|concert|lineup|ticket|party|night|showcase)\b/,
    radius: '14px',
    density: 'regular',
    sectionSpacing: 104,
    fonts: { heading: 'Bricolage Grotesque', body: 'Inter', mono: 'Space Mono' },
    headingWeight: 800,
    headingTracking: '-0.03em',
    maxContentWidth: '1240px',
    signature: 'glow',
    composition: 'bento',
    motion: 'kinetic',
    palette: {
      bg: '#0B0713', surface: '#171029', surfaceAlt: '#120C21', border: '#2E2148',
      text: '#F7F2FF', muted: '#A493C4', accent: '#FF4D8D', accentSoft: '#3A0F26', onAccent: '#FFFFFF',
      accent2: '#FFD166', hero: { from: '#12071F', via: '#3A1050', to: '#0B0713', angle: 130 },
    },
    heroLayouts: ['canvas', 'stacked', 'asymmetric'],
    artStyles: ['rays', 'confetti', 'mesh'],
  },
  {
    name: 'Elegant Business',
    fit: ['nonprofit', 'event', 'ecommerce_landing', 'business', 'consultant'],
    cues: /\b(community|health|education|sustain|green|impact|family)\b/,
    radius: '14px',
    density: 'regular',
    sectionSpacing: 104,
    fonts: { heading: 'Manrope', body: 'Source Sans 3', mono: 'IBM Plex Mono' },
    headingWeight: 700,
    headingTracking: '-0.02em',
    maxContentWidth: '1160px',
    signature: 'blob',
    composition: 'split',
    motion: 'subtle',
    palette: {
      bg: '#FFFFFF', surface: '#F4F8F6', surfaceAlt: '#E8F1ED', border: '#D2E0DA',
      text: '#12241D', muted: '#4F6A60', accent: '#0F766E', accentSoft: '#E1F3F0', onAccent: '#FFFFFF',
      accent2: '#B45309', hero: { from: '#F4F8F6', via: '#DFF0EA', to: '#FFFFFF', angle: 145 },
    },
    heroLayouts: ['split', 'centered'],
    artStyles: ['mesh', 'waves', 'topo'],
  },
  {
    name: 'Creative Portfolio',
    fit: ['creator', 'personal_portfolio', 'blog', 'developer_portfolio'],
    cues: /\b(illustrat|artist|design|colour|color|playful|bright)\b/,
    radius: '24px',
    density: 'roomy',
    sectionSpacing: 108,
    fonts: { heading: 'Outfit', body: 'DM Sans', mono: 'JetBrains Mono' },
    headingWeight: 700,
    headingTracking: '-0.025em',
    maxContentWidth: '1200px',
    signature: 'blob',
    composition: 'bento',
    motion: 'kinetic',
    palette: {
      bg: '#FFF3EC', surface: '#FFFFFF', surfaceAlt: '#FFE4D6', border: '#F3C9B9',
      text: '#1A0E09', muted: '#7A5344', accent: '#E4572E', accentSoft: '#FFD9C8', onAccent: '#FFF6F1',
      accent2: '#2E5E4E', hero: { from: '#FF8E6B', via: '#FFB38A', to: '#FF7A59', angle: 130 },
    },
    heroLayouts: ['asymmetric', 'split', 'canvas'],
    artStyles: ['orbit', 'stack', 'confetti'],
  },
  {
    name: 'Ink & Ivory',
    fit: ['resume_site', 'consultant', 'business', 'blog', 'personal_portfolio'],
    cues: /\b(teacher|research|law|policy|writer|student|academic)\b/,
    radius: '8px',
    density: 'regular',
    sectionSpacing: 100,
    fonts: { heading: 'Libre Baskerville', body: 'Inter', mono: 'IBM Plex Mono' },
    headingWeight: 700,
    headingTracking: '-0.005em',
    maxContentWidth: '980px',
    signature: 'rules',
    composition: 'stack',
    motion: 'subtle',
    palette: {
      bg: '#FCFCFA', surface: '#FFFFFF', surfaceAlt: '#F2F2EE', border: '#DDDDD5',
      text: '#16161A', muted: '#63636B', accent: '#111114', accentSoft: '#E9E9E3', onAccent: '#FFFFFF',
      accent2: '#7C3AED', hero: { from: '#FCFCFA', via: '#EDEDE7', to: '#FCFCFA', angle: 90 },
    },
    heroLayouts: ['editorial', 'centered', 'split'],
    artStyles: ['halftone', 'topo', 'stack'],
  },
];

function scoreTheme(theme: ThemeBase, category: SiteCategory, profile: ContentProfile, seed: SeededPicker): number {
  let score = theme.fit.includes(category) ? 40 : 0;
  const text = `${profile.headline} ${profile.summary} ${profile.industries.join(' ')} ${profile.name}`.toLowerCase();
  if (theme.cues.test(text)) score += 16;
  if (theme.name === 'Luxury Brand' && profile.gallery.length) score += 8;
  if (theme.name === 'Night Market' && (profile.when || profile.prices.length)) score += 8;
  if (theme.name === 'Roast & Cream' && profile.prices.length >= 4) score += 10;
  if (theme.density === 'compact' && profile.experience.length > 4) score += 6;
  if (theme.composition === 'bento' && profile.gallery.length >= 3) score += 6;
  if (theme.palette.text === '#16161A' && profile.rawLength < 900) score += 4;
  score += seed.next() * 26;
  return score;
}

export type ThemeDecision = { theme: ThemeTokens; candidates: { name: string; score: number }[] };

/** Agent 3: chooses and parameterises a design system without being told to. */
export function designTheme(category: SiteCategory, profile: ContentProfile, seedKey: string): ThemeDecision {
  const seed = new SeededPicker(`${seedKey}:design`);
  const ranked = THEMES.map((theme) => ({ theme, score: scoreTheme(theme, category, profile, seed) }))
    .sort((a, b) => b.score - a.score);

  const chosen = ranked[0].theme;
  const shift = seed.int(4);
  const palette = { ...chosen.palette };
  if (shift === 1) palette.accentSoft = mix(palette.accent, palette.bg, 0.86);
  if (shift === 2) palette.hero = { ...palette.hero, angle: (palette.hero.angle + 25) % 360 };
  if (shift === 3) palette.surfaceAlt = mix(palette.surface, palette.accent, 0.05);

  const theme: ThemeTokens = {
    name: chosen.name,
    radius: chosen.radius,
    density: chosen.density,
    sectionSpacing: chosen.sectionSpacing + (seed.int(2) ? 8 : -8),
    fonts: chosen.fonts,
    headingWeight: chosen.headingWeight,
    headingTracking: chosen.headingTracking,
    maxContentWidth: chosen.maxContentWidth,
    palette,
    heroLayout: seed.pick(chosen.heroLayouts),
    artStyle: seed.pick(chosen.artStyles),
    signature: chosen.signature,
    composition: seed.chance(0.25) ? (chosen.composition === 'bento' ? 'stack' : chosen.composition) : chosen.composition,
    motion: chosen.motion,
  };

  return {
    theme,
    candidates: ranked.slice(0, 4).map((entry) => ({ name: entry.theme.name, score: Math.round(entry.score) })),
  };
}

function mix(hex: string, other: string, weight: number): string {
  const parse = (h: string) => {
    const v = h.replace('#', '');
    return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
  };
  const [a, b] = [parse(hex), parse(other)];
  const out = a.map((channel, i) => Math.round(channel * weight + b[i] * (1 - weight)));
  return `#${out.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}
