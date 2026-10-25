import type { BlockKind, NavItem, SiteCategory } from '@/lib/types/site';
import type { ContentProfile, SectionRole, SourceKind } from '@/lib/types/profile';
import type { ContentSection } from '@/lib/types/profile';

export interface SitePlan {
  category: SiteCategory;
  goal: string;
  audience: string;
  /** Ordered section composition — the uniqueness engine permutes within intent. */
  blocks: BlockKind[];
  /** Section titles, preferring the words the upload itself used. */
  headings: Record<string, string>;
  nav: NavItem[];
  brand: string;
  narrative: string;
  rationale: string[];
}

const CATEGORY_LABELS: Record<SiteCategory, string> = {
  developer_portfolio: 'Developer portfolio',
  personal_portfolio: 'Portfolio',
  resume_site: 'Resume site',
  startup_landing: 'Startup landing page',
  saas: 'Product site',
  agency: 'Agency site',
  consultant: 'Consultant site',
  business: 'Business site',
  creator: 'Creator site',
  restaurant: 'Restaurant site',
  event: 'Event site',
  nonprofit: 'Nonprofit site',
  ecommerce_landing: 'Store landing page',
  blog: 'Blog',
};

const ROLE_LABELS: Partial<Record<SectionRole, string>> = {
  about: 'About',
  offerings: 'Services',
  process: 'How it works',
  narrative: 'The story',
  pricing: 'Menu',
  proof: 'Impact',
  team: 'Team',
  testimonials: 'Kind words',
  faq: 'FAQ',
  agenda: 'Agenda',
  gallery: 'Gallery',
  posts: 'Writing',
  skills: 'Skills',
  experience: 'Experience',
  projects: 'Work',
  education: 'Education',
  contact: 'Contact',
};

/** Which sections each kind of content should lead with, and why. */
const ORDERS: Record<SourceKind, BlockKind[]> = {
  resume: ['hero', 'stats', 'about', 'projects', 'skills', 'experience', 'education', 'cta', 'contact', 'footer'],
  personal: ['hero', 'about', 'projects', 'skills', 'experience', 'education', 'cta', 'contact', 'footer'],
  creator: ['hero', 'marquee', 'about', 'gallery', 'stats', 'offers', 'testimonials', 'posts', 'faq', 'cta', 'contact', 'footer'],
  pitch_deck: ['hero', 'chapters', 'stats', 'features', 'process', 'offers', 'testimonials', 'team', 'faq', 'cta', 'contact', 'footer'],
  agency: ['hero', 'about', 'features', 'gallery', 'process', 'stats', 'testimonials', 'team', 'offers', 'faq', 'cta', 'contact', 'footer'],
  business: ['hero', 'about', 'features', 'process', 'gallery', 'stats', 'testimonials', 'team', 'offers', 'faq', 'cta', 'contact', 'footer'],
  restaurant: ['hero', 'marquee', 'about', 'offers', 'gallery', 'testimonials', 'faq', 'cta', 'contact', 'footer'],
  store: ['hero', 'features', 'offers', 'gallery', 'testimonials', 'process', 'faq', 'cta', 'contact', 'footer'],
  event: ['hero', 'about', 'agenda', 'team', 'stats', 'gallery', 'offers', 'faq', 'cta', 'contact', 'footer'],
  nonprofit: ['hero', 'about', 'stats', 'chapters', 'features', 'gallery', 'testimonials', 'agenda', 'offers', 'team', 'cta', 'contact', 'footer'],
  blog: ['hero', 'about', 'posts', 'stats', 'testimonials', 'cta', 'contact', 'footer'],
};

function intentFor(category: SiteCategory): { audience: string; goal: string } {
  if (category === 'developer_portfolio') return { audience: 'hiring managers and engineering leads', goal: 'get interview callbacks' };
  if (category === 'resume_site') return { audience: 'recruiters and admissions readers', goal: 'make the profile scannable in 30 seconds' };
  if (category === 'personal_portfolio') return { audience: 'clients and creative directors', goal: 'win project enquiries' };
  if (category === 'startup_landing' || category === 'saas') return { audience: 'investors and early customers', goal: 'book a product demo' };
  if (category === 'restaurant') return { audience: 'diners within walking distance', goal: 'fill tables and takeaways' };
  if (category === 'event') return { audience: 'prospective attendees', goal: 'sell tickets and registrations' };
  if (category === 'ecommerce_landing') return { audience: 'shoppers who found the brand online', goal: 'convert visits into orders' };
  if (category === 'nonprofit') return { audience: 'donors, volunteers, and grant makers', goal: 'grow recurring giving and sign-ups' };
  if (category === 'blog') return { audience: 'returning readers and search visitors', goal: 'grow the newsletter list' };
  if (category === 'creator') return { audience: 'fans and brand partners', goal: 'land collaborations and sponsorships' };
  if (category === 'agency') return { audience: 'founders and marketing leads', goal: 'qualify inbound project enquiries' };
  if (category === 'consultant') return { audience: 'prospective clients', goal: 'book a discovery call' };
  return { audience: 'prospective customers and partners', goal: 'start a conversation' };
}

function sectionsByRole(profile: ContentProfile): Map<SectionRole, ContentSection[]> {
  const map = new Map<SectionRole, ContentSection[]>();
  for (const section of profile.sections) {
    map.set(section.role, [...(map.get(section.role) ?? []), section]);
  }
  return map;
}

function availableBlocks(profile: ContentProfile, byRole: Map<SectionRole, ContentSection[]>): Set<BlockKind> {
  const count = (role: SectionRole) => (byRole.get(role) ?? []).reduce((sum, s) => sum + s.items.length + s.paragraphs.length, 0);
  const kinds = new Set<BlockKind>(['hero', 'cta', 'contact', 'footer']);
  const add = (kind: BlockKind, ok: boolean) => {
    if (ok) kinds.add(kind);
  };

  add('about', !!profile.summary || count('about') > 0 || count('summary') > 0);
  add('stats', profile.metrics.length >= 2 || count('proof') >= 3);
  add('features', count('offerings') >= 3);
  add('process', count('process') >= 3);
  add('chapters', count('narrative') >= 3);
  add('offers', count('pricing') >= 3);
  add('team', count('team') >= 2);
  add('testimonials', count('testimonials') >= 1);
  add('faq', count('faq') >= 2);
  add('agenda', count('agenda') >= 2);
  add('posts', count('posts') >= 2);
  add('gallery', profile.gallery.length >= 3 || count('gallery') >= 4);
  add('marquee', profile.skills.reduce((sum, g) => sum + g.items.length, 0) >= 6 || count('offerings') >= 5);
  add('skills', profile.skills.length >= 2);
  add('experience', profile.experience.length >= 1);
  add('projects', profile.projects.length >= 2);
  add('education', profile.education.length >= 1);
  return kinds;
}

function classify(profile: ContentProfile, byRole: Map<SectionRole, ContentSection[]>): { category: SiteCategory } {
  const hasPeople = (byRole.get('team') ?? []).reduce((sum, s) => sum + s.items.length, 0) >= 2;
  const haystack = `${profile.headline} ${profile.summary} ${profile.industries.join(' ')}`.toLowerCase();
  const links = JSON.stringify(profile.links).toLowerCase();
  const technical =
    profile.skills.some((group) => /Languages|Frontend|Backend|Cloud/.test(group.group)) ||
    /\b(typescript|react|python|node|aws|kubernetes|go|sql)\b/.test(haystack);
  const creative = /\b(designer|artist|photographer|illustrator|ux|film|writer|creator|chef|florist)\b/.test(haystack);
  const corporate = /\b(manager|analyst|consultant|account|marketer|strategist|operations|advisor)\b/.test(haystack);
  const student = profile.seniority === 'student';

  switch (profile.kind) {
    case 'resume':
      if (technical && (/github|gitlab/.test(links) || profile.projects.length > 0)) {
        return { category: student ? 'resume_site' : 'developer_portfolio' };
      }
      if (creative) return { category: 'personal_portfolio' };
      return { category: student || !profile.experience.length ? 'resume_site' : 'personal_portfolio' };
    case 'pitch_deck':
      return { category: /\b(saas|platform|api|app|software|cloud)\b/i.test(haystack) ? 'saas' : 'startup_landing' };
    case 'restaurant':
      return { category: 'restaurant' };
    case 'event':
      return { category: 'event' };
    case 'store':
      return { category: 'ecommerce_landing' };
    case 'blog':
      return { category: 'blog' };
    case 'nonprofit':
      return { category: 'nonprofit' };
    case 'agency':
      return { category: 'agency' };
    case 'creator':
      return { category: 'creator' };
    case 'business':
      return { category: corporate && !hasPeople && profile.experience.length <= 1 ? 'consultant' : 'business' };
    default:
      if (technical) return { category: 'developer_portfolio' };
      if (creative) return { category: 'personal_portfolio' };
      return { category: 'personal_portfolio' };
  }
}

export function planSite(profile: ContentProfile, rotate: number): SitePlan {
  const byRole = sectionsByRole(profile);
  const { category } = classify(profile, byRole);
  const { audience, goal } = intentFor(category);
  const available = availableBlocks(profile, byRole);

  const order = ORDERS[profile.kind] ?? ORDERS.personal;
  let blocks = order.filter((kind) => available.has(kind));
  for (const kind of ['about', 'contact', 'cta', 'footer'] as BlockKind[]) {
    if (!blocks.includes(kind)) blocks.splice(blocks.indexOf('hero') + 1, 0, kind);
  }

  // Uniqueness: rotate the middle band so two similar uploads never match.
  const first = blocks.indexOf('about') === -1 ? 1 : blocks.indexOf('about');
  const last = blocks.indexOf('cta') === -1 ? blocks.length - 1 : blocks.indexOf('cta');
  const middle = blocks.slice(first + 1, last);
  if (middle.length >= 3) {
    const turns = rotate % middle.length;
    blocks = [...blocks.slice(0, first + 1), ...middle.slice(turns), ...middle.slice(0, turns), ...blocks.slice(last)];
  }

  const kindOf = new Map<BlockKind, SectionRole>([
    ['features', 'offerings'],
    ['process', 'process'],
    ['chapters', 'narrative'],
    ['offers', 'pricing'],
    ['stats', 'proof'],
    ['team', 'team'],
    ['testimonials', 'testimonials'],
    ['faq', 'faq'],
    ['agenda', 'agenda'],
    ['gallery', 'gallery'],
    ['posts', 'posts'],
    ['skills', 'skills'],
    ['experience', 'experience'],
    ['projects', 'projects'],
    ['education', 'education'],
    ['about', 'about'],
    ['contact', 'contact'],
  ]);

  const CTA_HEADINGS = ['Ready when you are', 'Let us talk', 'Start something', 'Next step'];
  const headingFor = (kind: BlockKind): string => {
    if (kind === 'cta') return CTA_HEADINGS[rotate % CTA_HEADINGS.length];
    if (kind === 'hero' || kind === 'footer' || kind === 'marquee' || kind === 'quote') return '';
    const role = kindOf.get(kind);
    if (!role) return ROLE_LABELS.about!;
    const source = byRole.get(role)?.[0]?.heading;
    return source && source.length <= 26 ? source.replace(/\s+/g, ' ') : (ROLE_LABELS[role] ?? kind);
  };

  const nav: NavItem[] = [];
  const headings = new Map<BlockKind, string>();
  for (const kind of blocks) {
    headings.set(kind, headingFor(kind));
    if (['hero', 'footer', 'cta', 'marquee', 'quote'].includes(kind)) continue;
    nav.push({ label: headingFor(kind), href: `#${kind}` });
  }

  const brand = profile.name || 'Untitled site';
  const label = CATEGORY_LABELS[category];
  return {
    category,
    goal,
    audience,
    blocks,
    headings: Object.fromEntries(headings),
    nav: nav.slice(0, 6),
    brand,
    narrative: `${label} for ${brand}, built to ${goal}.`,
    rationale: [
      `Read the upload as ${article(profile.kind).toLowerCase()} from ${profile.rawLength} characters — no format was chosen.`,
      `Type evidence: ${profile.kindEvidence.join(', ')}.`,
      `Optimised for ${audience}; the primary conversion goal is to ${goal}.`,
      `Kept ${blocks.length} sections and dropped anything the upload could not substantiate.`,
    ],
  };
}

function article(kind: SourceKind): string {
  const vowels = /^[aeiou]/i.test(kind);
  return `${vowels ? 'an' : 'a'} ${kind.replace(/_/g, ' ')}`;
}
