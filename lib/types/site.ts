export type SiteCategory =
  | 'developer_portfolio'
  | 'personal_portfolio'
  | 'resume_site'
  | 'startup_landing'
  | 'saas'
  | 'agency'
  | 'consultant'
  | 'business'
  | 'creator'
  | 'restaurant'
  | 'event'
  | 'nonprofit'
  | 'ecommerce_landing'
  | 'blog';

export type BlockKind =
  | 'hero'
  | 'marquee'
  | 'about'
  | 'quote'
  | 'stats'
  | 'features'
  | 'process'
  | 'chapters'
  | 'offers'
  | 'gallery'
  | 'agenda'
  | 'team'
  | 'testimonials'
  | 'faq'
  | 'posts'
  | 'skills'
  | 'experience'
  | 'projects'
  | 'education'
  | 'cta'
  | 'contact'
  | 'footer';

export interface Palette {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  accent2: string;
  hero: { from: string; via: string; to: string; angle: number };
}

export interface ThemeTokens {
  name: string;
  radius: string;
  density: 'compact' | 'regular' | 'roomy';
  sectionSpacing: number;
  fonts: { heading: string; body: string; mono: string };
  palette: Palette;
  headingWeight: number;
  headingTracking: string;
  maxContentWidth: string;
  heroLayout: 'split' | 'centered' | 'asymmetric' | 'editorial' | 'canvas' | 'stacked';
  artStyle: 'mesh' | 'blueprint' | 'waves' | 'orbit' | 'stack' | 'topo' | 'rays' | 'confetti' | 'halftone';
  /** One distinctive visual device per theme, so sites do not read as one template. */
  signature: 'grain' | 'glow' | 'rules' | 'outline' | 'grid' | 'blob';
  /** How sections are composed: bento mixes sizes, editorial uses full-bleed bands. */
  composition: 'bento' | 'editorial' | 'stack' | 'split';
  motion: 'subtle' | 'kinetic';
}

export interface NavItem {
  label: string;
  href: string;
}

export interface ProfileFact {
  label: string;
  value: string;
}

export interface HeroBlock {
  kind: 'hero';
  variant: string;
  eyebrow: string;
  headline: string;
  subheadline: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  facts: ProfileFact[];
  art: string;
}

export interface MarqueeBlock {
  kind: 'marquee';
  variant: string;
  items: string[];
}

export interface AboutBlock {
  kind: 'about';
  variant: string;
  heading: string;
  body: string[];
  highlights: string[];
}

export interface QuoteBlock {
  kind: 'quote';
  variant: string;
  text: string;
  attribution?: string;
}

export interface Stat {
  value: string;
  label: string;
}

export interface StatsBlock {
  kind: 'stats';
  variant: string;
  heading?: string;
  items: Stat[];
}

export interface FeatureItem {
  title: string;
  body: string;
  tags: string[];
}

export interface FeaturesBlock {
  kind: 'features';
  variant: string;
  heading: string;
  intro: string;
  items: FeatureItem[];
}

export interface ProcessBlock {
  kind: 'process';
  variant: string;
  heading: string;
  intro: string;
  steps: { title: string; body: string }[];
}

export interface ChapterItem {
  title: string;
  body: string;
  tags: string[];
}

export interface ChaptersBlock {
  kind: 'chapters';
  variant: string;
  heading: string;
  intro: string;
  items: ChapterItem[];
}

export interface OfferItem {
  name: string;
  price: string;
  detail: string;
  tags: string[];
  featured: boolean;
}

export interface OffersBlock {
  kind: 'offers';
  variant: string;
  heading: string;
  /** Real prose only; a priced list never needs its own rows repeated above it. */
  intro?: string;
  note?: string;
  items: OfferItem[];
}

export interface GalleryBlock {
  kind: 'gallery';
  variant: string;
  heading: string;
  intro: string;
  items: { src: string; caption: string }[];
  /** True when tiles are generated art rather than uploaded photography. */
  generated: boolean;
}

export interface AgendaBlock {
  kind: 'agenda';
  variant: string;
  heading: string;
  intro: string;
  items: { time: string; title: string; body: string }[];
}

export interface TeamBlock {
  kind: 'team';
  variant: string;
  heading: string;
  intro: string;
  items: { name: string; role: string; note: string }[];
}

export interface Testimonial {
  quote: string;
  author: string;
  role: string;
}

export interface TestimonialsBlock {
  kind: 'testimonials';
  variant: string;
  heading: string;
  items: Testimonial[];
}

export interface FaqBlock {
  kind: 'faq';
  variant: string;
  heading: string;
  items: { question: string; answer: string }[];
}

export interface PostsBlock {
  kind: 'posts';
  variant: string;
  heading: string;
  items: { title: string; body: string; meta?: string }[];
}

export interface SkillGroup {
  name: string;
  items: string[];
}

export interface SkillsBlock {
  kind: 'skills';
  variant: string;
  heading: string;
  intro: string;
  groups: SkillGroup[];
}

export interface TimelineEntry {
  role: string;
  org: string;
  period: string;
  location?: string;
  bullets: string[];
  stack?: string[];
}

export interface ExperienceBlock {
  kind: 'experience';
  variant: string;
  heading: string;
  entries: TimelineEntry[];
}

export interface ProjectEntry {
  name: string;
  blurb: string;
  tags: string[];
  link?: string;
}

export interface ProjectsBlock {
  kind: 'projects';
  variant: string;
  heading: string;
  intro: string;
  items: ProjectEntry[];
}

export interface EducationEntry {
  award: string;
  org: string;
  period: string;
  detail?: string;
}

export interface EducationBlock {
  kind: 'education';
  variant: string;
  heading: string;
  items: EducationEntry[];
}

export interface CtaBlock {
  kind: 'cta';
  variant: string;
  heading: string;
  body: string;
  button: { label: string; href: string };
}

export interface ContactBlock {
  kind: 'contact';
  variant: string;
  heading: string;
  body: string;
  email?: string;
  phone?: string;
  address?: string;
  links: { label: string; href: string }[];
  availability?: string;
}

export interface FooterBlock {
  kind: 'footer';
  variant: string;
  note: string;
  nav: NavItem[];
}

export type Block =
  | HeroBlock
  | MarqueeBlock
  | AboutBlock
  | QuoteBlock
  | StatsBlock
  | FeaturesBlock
  | ProcessBlock
  | ChaptersBlock
  | OffersBlock
  | GalleryBlock
  | AgendaBlock
  | TeamBlock
  | TestimonialsBlock
  | FaqBlock
  | PostsBlock
  | SkillsBlock
  | ExperienceBlock
  | ProjectsBlock
  | EducationBlock
  | CtaBlock
  | ContactBlock
  | FooterBlock;

export interface SeoMeta {
  title: string;
  description: string;
  keywords: string[];
  openGraph: { title: string; description: string; type: 'website' | 'profile' | 'article' };
}

export interface SiteSpec {
  id: string;
  generatedAt: string;
  category: SiteCategory;
  /** Human label for whatever the upload turned out to be. */
  sourceKind: string;
  title: string;
  ownerName: string;
  nav: { brand: string; items: NavItem[]; cta?: NavItem };
  theme: ThemeTokens;
  blocks: Block[];
  seo: SeoMeta;
  observations: string[];
  decisions: string[];
}

export interface PipelineStage {
  agent: string;
  label: string;
  startedAt: number;
  durationMs?: number;
  output: string;
  detail?: string;
}

export interface BuildResult {
  id: string;
  site: SiteSpec;
  stages: PipelineStage[];
  totalMs: number;
  usedLlm: boolean;
  url: string;
}
