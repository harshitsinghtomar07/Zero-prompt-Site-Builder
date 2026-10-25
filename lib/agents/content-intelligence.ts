import type {
  ContentProfile,
  ContentSection,
  EducationRecord,
  ProjectRecord,
  RoleHistory,
  SectionRole,
  SourceKind,
} from '@/lib/types/profile';
import type { SourceAsset } from '@/lib/types/source';
import { DATE_PATTERN, PRICE_PATTERN, TIME_PATTERN, discoverStructure, labelFor, parseItems } from './structure';

const MONTHS =
  '(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';
const YEAR = '(?:19|20)\\d{2}';
const DATE_TOKEN = `(?:${MONTHS}(?:\\.?\\.?\\s*${YEAR})?|${YEAR}|Present|Now|Current|Ongoing)`;
const PERIOD = new RegExp(`(${DATE_TOKEN})\\s*(?:-|–|—|to|until)\\s*(${DATE_TOKEN})`, 'i');
const SOLO_PERIOD = new RegExp(`^\\s*[\\[(]?\\s*(${DATE_TOKEN})\\s*(?:-|–|—|to)\\s*(${DATE_TOKEN})\\s*[\\])]?$`, 'i');

const ROLE_WORDS =
  /\b(engineer|developer|design(?:er| director)?|manager|analyst|scientist|architect|consultant|founder|co-?founder|cto|ceo|cfo|coo|director|head of|vice president|president|officer|marketer|writer|photographer|illustrator|teacher|professor|student|researcher|administrator|accountant|nurse|recruiter|strategist|producer|editor|entrepreneur|associate|specialist|lead|coordinator|curator|chef|artist|advisor|instructor|barista|therapist|planner|architect)\b/i;

const DEGREE_WORDS =
  /\b(bachelor|master|ph\.?d|doctorate|diploma|degree|b\.?(tech|a|e|sc|s|com|des|fa|arch|bus|eng)\b|m\.?(tech|sc|a|s|eng|com|des|arch|bus)\b|secondary|high\s+school|hsc|ssc|cbse|icse|university|institute|college|academy)\b/i;

const SKILL_GROUPS: { name: string; re: RegExp }[] = [
  { name: 'Languages', re: /^(js|ts|javascript|typescript|python|java|kotlin|swift|go|rust|c\+\+|c#|c\b|php|ruby|scala|dart|sql|r|matlab|shell|bash|objectiveml)\b/i },
  { name: 'Frontend', re: /(react|next\.?js|vue|angular|svelte|tailwind|html|css|sass|scss|redux|graphql|vite|webpack|accessibility|a11y|pwa)/i },
  { name: 'Backend & Data', re: /(node|express|fastapi|django|flask|spring|postgres|postgresql|mysql|mongo|redis|kafka|rabbitmq|grpc|rest|microservice|elasticsearch|clickhouse|prisma|typeorm|etcd|sqlite)/i },
  { name: 'Cloud & Infra', re: /(aws|gcp|azure|docker|kubernetes|k8s|terraform|ansible|ci\/cd|github\s+actions|jenkins|vercel|cloudflare|serverless|lambda|ec2|s3|linux|grafana|prometheus|opentelemetry|datadog)/i },
  { name: 'AI & Analytics', re: /(machine learning|\bml\b|deep learning|pytorch|tensorflow|langchain|\bllm\b|nlp|pandas|numpy|spark|airflow|tableau|power\s?bi|statistic|data\s?science)/i },
  { name: 'Design', re: /(figma|sketch|adobe|photoshop|illustrator|in-?design|procreate|blender|xd\b|framer|prototyp|wireframe|design\s+system|branding|typography|\bux\b|\bui\b|motion|lettering|signage|packaging)/i },
  { name: 'Product & Business', re: /(roadmap|agile|scrum|okr|a\/b\s+test|growth|\bseo\b|marketing|sales|stakeholder|go-to-market|gtm|pricing|hiring)/i },
];

const INDUSTRY_TERMS: { name: string; re: RegExp }[] = [
  { name: 'software', re: /\b(saas|api|sdk|backend|frontend|devops|repository|microservice|open\s+source)\b/i },
  { name: 'fintech', re: /\b(fintech|payments?|banking|ledger|reconciliation|lending|settlement|invoicing)\b/i },
  { name: 'health', re: /\b(healthcare|clinical|patient|fda|hipaa|medical|diagnosis|wellness|therapy)\b/i },
  { name: 'education', re: /\b(edtech|curriculum|students?|courses?|university|teaching|lecture|literacy|school)\b/i },
  { name: 'ecommerce', re: /\b(ecommerce|checkout|cart|merchants?|sku|retail|conversion\s+rate|shopping)\b/i },
  { name: 'media', re: /\b(content\s+creator|audience|subscribers|podcast|newsletter|brand\s+partner)\b/i },
  { name: 'research', re: /\b(publication|paper|thesis|citation|experiment|dataset)\b/i },
  { name: 'design', re: /\b(ux\b|ui\b|brand|illustration|art\s+direction|design\s+system|interior|architecture)\b/i },
  { name: 'consulting', re: /\b(client\s+engagement|advisory|deliverable|consultanc|compliance|audit)\b/i },
  { name: 'hospitality', re: /\b(restaurant|cafe|dining|kitchen|chef|menu|hotel|banquet|catering|brew)\b/i },
  { name: 'community', re: /\b(nonprofit|ngo|donor|volunteer|beneficiar|grassroots|foundation|cause)\b/i },
  { name: 'logistics', re: /\b(freight|truck|warehouse|supply\s+chain|delivery|fleet|route)\b/i },
];

/** Dishes and drinks — a menu's vocabulary, matched wherever its rows landed. */
const MENU_WORDS =
  /\b(veg|non-?veg|vegan|starters?|mains?|deserts?|desserts|spice[s]?|roast|curry|thali|espresso|latte|coffee|tea|soup|salad|pasta|pizza|grill|bread|biryani|dosa|buffet|entree|appetizer|wine|beer|cocktail|chef|dine[- ]?in|buns?|croissants?|pastr(?:y|ies)|cakes?|cookies?|sourdough|baguettes?|muffins?|brownies?|tarts?|pies?|donuts?|doughnuts?|bakes?|bakery|bakehouse|patisserie|sundae|lemonade|smoothie|shake|juice|mojito|sandwich|burger|noodles?|momos?|fries|pancakes?|waffles?|kulhad|masala|paneer|chicken|mutton|fish|prawns?|idli|vada|uttapam|paratha|naan|roti|samosa|pakora|kebab|tikka|falafel|hummus|sushi|ramen|dumpling|macchiato|americano|cappuccino|mocha|brew|brewed|coldbrew|cold brew)\b/i;

/** Heading vocabulary per content kind — the evidence behind a self-declared type. */
const KIND_SIGNALS: { kind: SourceKind; role?: SectionRole; re: RegExp; weight: number; min?: number; note: string }[] = [
  { kind: 'resume', role: 'experience', re: /.*/, weight: 5, note: 'a work-history block' },
  { kind: 'resume', re: /\b(resume|curriculum vitae|cv)\b/i, weight: 3, note: 'the word résumé/CV' },
  { kind: 'resume', role: 'education', re: /.*/, weight: 2, note: 'an education block' },
  { kind: 'pitch_deck', role: 'narrative', re: /.*/, weight: 3, note: 'investor-style chapters' },
  { kind: 'pitch_deck', re: /\b(tam|sam|som|arr|mrr|seed (round|funding)|pre-?seed|series a|runway|use of funds|the ask)\b/i, weight: 5, note: 'funding language' },
  { kind: 'restaurant', role: 'pricing', re: MENU_WORDS, weight: 5, min: 2, note: 'a priced menu' },
  { kind: 'restaurant', role: 'offerings', re: MENU_WORDS, weight: 5, min: 2, note: 'a menu of dishes' },
  { kind: 'restaurant', re: /\b(restaurant|cafe|dining|reservation|table for|open (daily|from)|timings)\b/i, weight: 3, note: 'dining and reservations' },
  { kind: 'event', role: 'agenda', re: /.*/, weight: 5, note: 'a timed agenda' },
  { kind: 'event', re: /\b(conference|summit|register|registration|ticket tiers?|keynote|hackathon|meetup|call for papers|cfp)\b/i, weight: 4, min: 2, note: 'event registration language' },
  { kind: 'store', re: /\b(in stock|out of stock|ships|shipping|shipped|add to cart|cart|checkout|sku|made[- ]to[- ]order|dispatch|delivery|returns?\b|warranty|buy)\b/i, weight: 4, min: 2, note: 'a product catalogue' },
  { kind: 'store', role: 'pricing', re: /\b(products?|items?|sku|sizes?|packs?|stock|shipping|ships|buy|add to cart|catalog(ue)?)\b/i, weight: 4, min: 2, note: 'priced product rows' },
  { kind: 'store', role: 'offerings', re: /\b(products?|items?|sku|sizes?|packs?|stock|shipping|buy|catalog(ue)?|collection)\b/i, weight: 2, note: 'a product list' },
  { kind: 'blog', role: 'posts', re: /.*/, weight: 5, note: 'dated posts' },
  { kind: 'blog', re: /\b(newsletter|subscribe|read more|min read|latest posts?)\b/i, weight: 3, note: 'publishing language' },
  { kind: 'nonprofit', re: /\b(nonprofit|non-?profit|donate|donor|volunteer|beneficiar|grassroots|foundation|cause|impact report|sdg)\b/i, weight: 5, note: 'mission and donation language' },
  { kind: 'agency', role: 'testimonials', re: /.*/, weight: 2, note: 'client quotes' },
  { kind: 'agency', re: /\b(we (build|design|help|craft)|our clients?|case stud|brand\s*&\s*|studio|agency)\b/i, weight: 4, min: 2, note: 'studio positioning' },
  { kind: 'creator', re: /\b(subscribers|followers|brand deals|sponsor(?:ed|ship)|my (?:channel|page)|audience|collaboration)\b/i, weight: 3, note: 'audience and sponsorship language' },
  { kind: 'creator', re: /\b(photograph(?:er|y)|portraits?|weddings?|films?|illustration|craft(?:sman|people)?|handmade pieces?)\b/i, weight: 4, min: 2, note: 'a making practice with a client book' },
  { kind: 'business', role: 'offerings', re: /.*/, weight: 3, note: 'a services list' },
  { kind: 'business', re: /\b(our (services|clients|company)|serving since|we provide|head office|gst|llp|pvt ltd)\b/i, weight: 3, note: 'company language' },
  { kind: 'personal', re: /\b(i am|i help|my work|personal)\b/i, weight: 1, note: 'first-person writing' },
];

/** A neutral descriptor for uploads that never state who they are for. */
export const KIND_HEADLINE: Record<SourceKind, string> = {
  resume: 'Professional',
  personal: 'Portfolio',
  pitch_deck: 'The pitch',
  restaurant: 'Kitchen & menu',
  event: 'The day',
  store: 'The collection',
  blog: 'Writing',
  nonprofit: 'Our work',
  agency: 'The studio',
  creator: 'Selected work',
  business: 'What we do',
};

function splitList(value: string): string[] {
  return value
    .split(/[,;|•·]|\s{2,}/)
    .map((item) => item.replace(/^[-*\s]+|[:.\s]+$/g, '').trim())
    .filter((item) => item.length > 1 && item.length < 44 && !/^\d+$/.test(item));
}

/** Lines the intake layer inserts to mark file boundaries, plus table/column artefacts. */
function isFurniture(line: string): boolean {
  const value = line.trim();
  return (
    !value ||
    /^-{2,}\s*\S.*\s-{2,}$/.test(value) ||
    /^={2,}\s*\S.*\s={2,}$/.test(value) ||
    /^#?\s*columns?:/i.test(value) ||
    /^---\s*$/.test(value) ||
    /\b[\w -]+\.(pdf|docx?|pptx?|xlsx?|csv|tsv|md|markdown|txt|rtf|html?|json|ya?ml|xml|eml|png|jpe?g|gif|webp|svg)\b$/i.test(value)
  );
}

/** `shop_name: Mrittika Clay Works` — the key is bookkeeping, the value is the content. */
const CODE_KEY = /^[a-z0-9_$]+(?:[_.][a-z0-9]+)+\s*:\s+/;

function unmarkdown(line: string): string {
  return line
    .replace(/^\s*#{1,6}\s+/, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/`/g, '')
    .replace(CODE_KEY, '')
    .replace(/\s*-{2,}\s*/g, ' — ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function looksLikeName(line: string): boolean {
  const clean = line.trim();
  if (!clean || clean.length > 48) return false;
  /** A person's name line never carries a bare figure — `Passion Fruit Lemonade 179` is a menu row. */
  if (/@|\d|http|resume|curriculum\s+vitae/i.test(clean)) return false;
  const words = clean.replace(/[^A-Za-zÀ-ÿ' .-]/g, '').split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 4) return false;
  const upper = clean === clean.toUpperCase();
  return words.every((word) => /^[A-ZÀ-Ý][a-zà-ÿ'’.-]+$/.test(word)) || (upper && words.length <= 3);
}

function titleFrom(line: string): { role: string; org: string; location?: string } | null {
  if (!ROLE_WORDS.test(line)) return null;
  const withoutDate = line.replace(PERIOD, ' ').replace(/\s{2,}/g, ' ').replace(/[|,;-]\s*$/, '').trim();
  if (!withoutDate) return null;

  const at = withoutDate.match(/^(.{3,60}?)\s+at\s+(.{3,60})$/i);
  if (at) return { role: at[1].trim(), org: at[2].trim() };

  const parts = withoutDate
    .split(/\s*(?:\||–|—|,|@|\bat\b)\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts.length) return null;

  const role = (parts.find((part) => ROLE_WORDS.test(part)) ?? parts[0]).slice(0, 80);
  const orgPart = parts.find((part) => part !== role && !/^(remote|hybrid|onsite|india|\w+,\s*\w+)$/i.test(part));
  const locationPart = parts.find((part) => part !== role && part !== orgPart && /^[A-Z][a-z]+(?:,\s*[A-Z][a-zA-Z]+)?$/.test(part));
  if (!orgPart && parts.length === 1) return null;
  return { role, org: (orgPart ?? '').slice(0, 80), location: locationPart?.slice(0, 40) };
}

function isBullet(raw: string, line: string): boolean {
  if (/^[-•*◦o]\s/.test(raw.trim()) || /^[-•*◦]/.test(raw.trim())) return true;
  if (/\.$/.test(line)) return true;
  if (line.length > 88) return true;
  return false;
}

function parseExperienceBlock(lines: string[]): RoleHistory[] {
  const entries: RoleHistory[] = [];
  const last = (): RoleHistory | null => entries[entries.length - 1] ?? null;

  for (const raw of lines) {
    const marker = /^\s*(?:[-•*◦])\s*/.test(raw);
    const line = raw.replace(/^\s*(?:[-•*◦])\s*/, '').trim();
    if (!line) continue;
    const current = last();

    const solo = line.match(SOLO_PERIOD);
    if (solo) {
      const period = `${solo[1]} – ${solo[2]}`;
      if (current && !current.period) current.period = period;
      else entries.push({ role: '', org: '', period, bullets: [] });
      continue;
    }

    if (/^(?:technologies|tech\s*stack|stack|tools)\s*[:\-]/i.test(line)) {
      if (current) current.stack = splitList(line.split(/[:\-]\s*/, 2)[1] ?? '');
      continue;
    }

    const period = line.match(PERIOD);
    const title = titleFrom(line);

    if (title && (!marker || !current)) {
      entries.push({
        role: title.role,
        org: title.org,
        location: title.location,
        period: period ? `${period[1]} – ${period[2]}` : '',
        bullets: [],
      });
      continue;
    }

    if (current) {
      if (isBullet(raw, line) || !title) current.bullets.push(line);
      else entries.push({ role: title.role, org: title.org, location: title.location, period: '', bullets: [] });
      continue;
    }

    if (period || title) {
      entries.push({
        role: title?.role ?? '',
        org: title?.org ?? '',
        period: period ? `${period[1]} – ${period[2]}` : '',
        bullets: [line],
      });
    }
  }

  for (let i = entries.length - 1; i > 0; i--) {
    if (!entries[i].role && entries[i].bullets.length && titleFrom(entries[i].bullets[0])) {
      const title = titleFrom(entries[i].bullets.shift()!)!;
      entries[i].role = title.role;
      entries[i].org = entries[i].org || title.org;
    }
  }

  return entries
    .filter((entry) => entry.role || entry.org)
    .map((entry) => ({ ...entry, bullets: entry.bullets.filter(Boolean).slice(0, 6) }))
    .slice(0, 8);
}

function parseProjectsBlock(lines: string[]): ProjectRecord[] {
  const projects: ProjectRecord[] = [];
  let current: ProjectRecord | null = null;

  for (const raw of lines) {
    const line = raw.replace(/^\s*(?:[-•*◦])\s*/, '').trim();
    if (!line) continue;

    if (/^(?:technologies|tech\s*stack|stack|tools|url|link)\s*[:\-]/i.test(line)) {
      if (current) current.tags = [...current.tags, ...splitList(line.split(/[:\-]\s*/, 2)[1] ?? '')];
      continue;
    }

    const url = line.match(/https?:\/\/\S+/)?.[0];
    const words = line.split(/\s+/);
    const isName =
      !url &&
      words.length <= 5 &&
      line.length <= 52 &&
      !/[.!?,;]$/.test(line) &&
      (words.length === 1 || /[A-Z]/.test(words[0][0]) || /[-_]/.test(line));

    if (isName) {
      const separator = line.search(/\s[–—-]\s|\s\|\s|:\s/);
      const name = (separator > 2 ? line.slice(0, separator) : line).trim();
      const rest = separator > 2 ? line.slice(separator).replace(/^\s*[–—|:\-]\s*/, '') : '';
      current = { name, description: rest, tags: [] };
      projects.push(current);
      continue;
    }

    if (!current) continue;
    if (url) current.url = url;
    else current.description = `${current.description} ${line}`.trim();
  }

  return projects
    .map((project) => ({
      ...project,
      description: project.description.replace(/\s+/g, ' ').trim(),
      tags: [...new Set(project.tags)].filter((tag) => tag.length < 24).slice(0, 5),
    }))
    .filter((project) => project.name && project.description)
    .slice(0, 6);
}

function parseEducationBlock(lines: string[]): EducationRecord[] {
  const items: EducationRecord[] = [];

  for (const raw of lines) {
    const line = raw.replace(/^\s*(?:[-•*◦])\s*/, '').trim();
    if (!line) continue;

    const solo = line.match(SOLO_PERIOD);
    if (solo) {
      const previous = items[items.length - 1];
      if (previous && !previous.period) previous.period = `${solo[1]} – ${solo[2]}`;
      continue;
    }

    const period = line.match(PERIOD);
    const withoutDate = line.replace(PERIOD, ' ').replace(/[|]\s*$/, '').replace(/\s{2,}/g, ' ').trim();
    const parts = withoutDate.split(/\s*(?:,|\||–|—|@|\bat\b)\s*/).map((part) => part.trim()).filter(Boolean);
    const award = parts.find((part) => DEGREE_WORDS.test(part));
    const org = parts.find((part) => part !== award && /(university|institute|college|school|academy|iit|iim|nit|bits|polytechnic)/i.test(part));

    if (award || org) {
      items.push({
        award: (award ?? parts[0] ?? '').slice(0, 90),
        org: (org ?? parts.find((part) => part !== award) ?? '').slice(0, 90),
        period: period ? `${period[1]} – ${period[2]}` : '',
        detail: undefined,
      });
      continue;
    }

    const current = items[items.length - 1];
    if (current && line.length > 10 && !current.detail) current.detail = line.slice(0, 120);
  }

  return items.filter((item) => item.award || item.org).slice(0, 4);
}

function groupSkills(items: string[]) {
  const rejected =
    /^(?:project|projects|experience|education|skills?|work|summary|contact|achievements?|awards?|honou?rs?|certifications?|interests?|languages?|profile|objective|introduction|overview|portfolio|publications?|references?|additional|highlights?|tools?|details?|information)(?:\s+(?:section|list))?$/i;
  const datedFragment = /^(?:[A-Za-z]{3,9}\.?\s+(?:19|20)\d{2}|(?:19|20)\d{2}\s*[-–—]?\s*(?:present|ongoing|now)?)$/i;
  const cleaned = [
    ...new Set(
      items
        .map((item) => item.replace(/\s*\(\d+\s*y(?:ears?|rs?)?\)/i, '').trim())
        .filter(
          (item) =>
            item.length > 1 &&
            item.length < 40 &&
            !/^\d+$/.test(item) &&
            !/\s{4,}/.test(item) &&
            !PERIOD.test(item) &&
            !datedFragment.test(item) &&
            !rejected.test(item) &&
            !ROLE_WORDS.test(item) &&
            !/^[A-Z]{2,}\s+[A-Z]{2,}$/.test(item) &&
            !/^(https?|www)\./i.test(item),
        ),
    ),
  ];

  const groups: { group: string; items: string[] }[] = [];
  const claimed = new Set<string>();

  for (const group of SKILL_GROUPS) {
    const matches = cleaned.filter((item) => !claimed.has(item) && group.re.test(item));
    if (matches.length >= 2) {
      matches.forEach((item) => claimed.add(item));
      groups.push({ group: group.name, items: matches.slice(0, 12) });
    }
  }

  const rest = cleaned.filter((item) => !claimed.has(item) && item.split(/\s+/).length <= 4);
  if (rest.length) groups.push({ group: 'Strengths', items: rest.slice(0, 12) });
  return groups.slice(0, 5);
}

const SHORT_UNITS = new Set(['%', 'x', 'k', 'm', 'bn', 'cr', 'ms', 's']);
const METRIC = /(\d[\d,]*(?:\.\d+)?)\s?(%|x|k|m|bn|cr|crore|lakh|ms|s\b|hours?|days?|weeks?|months?|years?|requests|users|customers|engineers|services|stars|students?|guests?|dishes|orders?|trucks?|campaigns?)?/g;

function extractMetrics(sources: string[]): { value: string; label: string }[] {
  const found: { value: string; label: string }[] = [];

  for (const bullet of sources) {
    for (const match of bullet.matchAll(METRIC)) {
      const number = match[1];
      const unit = (match[2] ?? '').toLowerCase();
      if (/^(19|20)\d{2}$/.test(number.replace(/,/g, ''))) continue;
      if (!unit && !/,\d/.test(number)) continue;
      if (bullet.replace(/\s+/g, ' ').length < 30) continue;
      found.push({ value: `${number}${SHORT_UNITS.has(unit) ? unit : ''}`, label: bullet.replace(/\s+/g, ' ').trim() });
      break;
    }
    if (found.length >= 6) break;
  }

  return [...new Map(found.map((item) => [item.value, item])).values()].slice(0, 4);
}

function detectSeniority(text: string): ContentProfile['seniority'] {
  if (/\b(student|intern|fresher|trainee|undergraduate)\b/i.test(text)) return 'student';
  if (/\b(head of|vp|vice president|chief \w+ officer|director|partner|principal)\b/i.test(text)) return 'lead';
  if (/\b(staff|senior|lead|architect|manager)\b/i.test(text)) return 'senior';
  const years = text.match(/(\d{1,2})\+?\s*(?:years?|yrs?)\b/i);
  if (years) {
    const n = Number(years[1]);
    if (n <= 2) return 'junior';
    if (n <= 6) return 'mid';
    return 'senior';
  }
  if (/\b(junior|entry\s?level|associate)\b/i.test(text)) return 'junior';
  return 'unknown';
}

function dedupeLinks(links: ContentProfile['links']): ContentProfile['links'] {
  const byShallow = [...links].sort((a, b) => {
    const depth = (href: string) => new URL(href).pathname.split('/').filter(Boolean).length;
    return depth(a.href) - depth(b.href) || a.href.length - b.href.length;
  });
  const seen = new Set<string>();
  const out: ContentProfile['links'] = [];
  for (const link of byShallow) {
    const { host } = new URL(link.href);
    const key = `${link.label}|${host}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(link);
  }
  return out.slice(0, 6);
}

function collectLinks(text: string, name: string): ContentProfile['links'] {
  const emailPattern = /[\w.+-]+@[\w-]+\.[\w.]{2,}/;
  const email = text.match(emailPattern)?.[0];
  const withoutEmails = text.replace(new RegExp(emailPattern, 'g'), ' ');

  const urls = [...withoutEmails.matchAll(/(?:https?:\/\/)?(?:www\.)?[\w-]+(?:\.[\w-]+)+(?:\/[\w./%#?=&+-]*)?/gi)]
    .map((match) => match[0])
    .filter((candidate) => {
      const host = candidate.replace(/^https?:\/\/(www\.)?/i, '').split(/[/.]/)[0];
      return host.length > 1 && host === host.toLowerCase() && !/^\d+$/.test(host);
    })
    .filter((candidate) => /\.(com|dev|io|ai|co|org|net|app|me|tech|in|uk|de|shop|studio|design|cafe|restaurant)\b/i.test(candidate))
    .filter((candidate) => !/[,;]\s*$/.test(candidate));

  return [...new Set(urls)]
    .slice(0, 8)
    .map((href) => {
      const clean = href.startsWith('http') ? href : `https://${href.replace(/^\/+/, '')}`;
      const host = clean.replace(/^https?:\/\//, '').split('/')[0].toLowerCase();
      const known = Object.entries({
        github: 'GitHub',
        linkedin: 'LinkedIn',
        behance: 'Behance',
        dribbble: 'Dribbble',
        instagram: 'Instagram',
        youtube: 'YouTube',
        x: 'X',
        twitter: 'X',
      }).find(([key]) => host.includes(key));
      const firstName = name.split(' ')[0]?.toLowerCase() ?? '';
      const label = known?.[1] ?? (firstName && host.includes(firstName) ? 'Website' : host.replace(/^www\./, ''));
      return { label, href: clean };
    })
    .filter((link) => /^https?:\/\/[\w.-]+\.[a-z]{2,}/i.test(link.href) && link.href.replace(/https?:\/\//, '').includes('.'));
}

function classifyKind(text: string, sections: ContentSection[]): { kind: SourceKind; evidence: string[] } {
  const scores = new Map<SourceKind, number>();
  const evidence = new Map<SourceKind, string[]>();
  const byRole = new Map<SectionRole, ContentSection[]>();
  for (const section of sections) {
    byRole.set(section.role, [...(byRole.get(section.role) ?? []), section]);
  }
  /** Intake's `--- file.ext ---` markers name the file, not the business; a filename must not vote on the kind. */
  const body = text.replace(/^---\s*\S[^\n]*?\s*---\s*$/gm, ' ');

  /** Role signals read the section they point at, so "priced rows" can mean products or dishes. */
  const sectionText = (section: ContentSection) =>
    `${section.heading} ${section.items.map((item) => `${item.title} ${item.body} ${item.meta ?? ''} ${item.tags.join(' ')}`).join(' ')}`.slice(0, 1200);

  for (const signal of KIND_SIGNALS) {
    const haystack = signal.role ? (byRole.get(signal.role) ?? []).map(sectionText).join(' ') : body;
    if (!haystack) continue;
    const hit = signal.min
      ? new Set([...haystack.matchAll(new RegExp(signal.re.source, 'gi'))].map((m) => m[1]?.toLowerCase())).size >= signal.min
      : signal.re.test(haystack);
    if (!hit) continue;
    scores.set(signal.kind, (scores.get(signal.kind) ?? 0) + signal.weight);
    evidence.set(signal.kind, [...(evidence.get(signal.kind) ?? []), signal.note]);
  }

  const narrativeRoles = new Set(
    sections.filter((section) => section.role === 'narrative').map((section) => section.heading.toLowerCase()),
  );
  if (narrativeRoles.size >= 4) {
    scores.set('pitch_deck', (scores.get('pitch_deck') ?? 0) + 3);
    evidence.set('pitch_deck', [...(evidence.get('pitch_deck') ?? []), `${narrativeRoles.size} investor chapters`]);
  }

  /**
   * Priced rows alone are ambiguous: a workshop sells hours, a shop sells goods.
   * Read how the rows talk — shipping, stock and pack sizes mean a store; site
   * visits, scopes, sessions and per-hour rates mean a services business.
   */
  const GOODS_ROW =
    /\b(in stock|out of stock|ships|shipping|shipped|delivery|dispatch|add to cart|cart|sku|made[- ]to[- ]order|sizes?|packs?|per (?:piece|unit|kg|gram|metre|meter))\b/i;
  const SERVICE_ROW =
    /\b(per (?:sq\.?\s?ft|sq\.?\s?m|sqft|hour|hr|session|day|week|month|project|person|guest|visit)|\d{1,2}\s*[- ]?(?:hours?|days?)\b|consult(?:ation)?|site visit|survey|proposal|deliverable|engagement|retainer|scope|turnaround|on[- ]site|fitting|session)\b/i;

  const pricedRows = (byRole.get('pricing') ?? []).flatMap((section) =>
    section.items.filter((item) => item.meta).map((item) => `${item.title} ${item.body} ${item.meta ?? ''} ${item.tags.join(' ')}`),
  );
  if (pricedRows.length >= 3) {
    const hits = (re: RegExp) => pricedRows.reduce((sum, row) => sum + (row.match(new RegExp(re.source, 'gi')) ?? []).length, 0);
    if (hits(SERVICE_ROW) > hits(GOODS_ROW)) {
      const servicesKind: SourceKind = (byRole.get('testimonials')?.length ?? 0) > 0 || /\bstudio\b/i.test(body) ? 'agency' : 'business';
      scores.set(servicesKind, (scores.get(servicesKind) ?? 0) + 3);
      evidence.set(servicesKind, [...(evidence.get(servicesKind) ?? []), 'a priced list of services']);
    } else {
      scores.set('store', (scores.get('store') ?? 0) + 3);
      evidence.set('store', [...(evidence.get('store') ?? []), 'a priced list of things on offer']);
    }
  }

  const ranked = [...scores].sort((a, b) => b[1] - a[1]);
  const winner = ranked[0];
  if (!winner || winner[1] < 3) return { kind: 'personal', evidence: ['no strong type signals — built a personal site'] };
  return { kind: winner[0], evidence: [...new Set(evidence.get(winner[0]) ?? [])].slice(0, 4) };
}

/** Words that open a heading but never name an organisation. */
const NOT_A_BRAND =
  /^(how|what|why|who|when|where|our|the|a|an|and|get|book|see|about|contact|menu|pricing|faq|overview|recent|latest|welcome|tagline|course|dish|main|mains?|starter|starters|tiffin|dessert|beverage|side|price|cost|category|type|name|item|session|speaker|venue|notes?|details?|terms|hours|day|evening|lunch|dinner|review|reviews|agenda|schedule|gallery|products?|services?)\b/i;

/** A label written for a reader of fields, not a masthead: `Shop Name`, `bakery_name`, `Tagline`, an email's `Subject`. */
const FIELD_LABEL =
  /(?:^|[^a-z])(?:name|title|label|heading|brand|business|shop|store|company|organisation|organization|studio|category|type|tagline|slogan|subtitle|subheading|subject)(?:[^a-z]|$)/i;

/** `Bakery Name: The Flour Room` — the label is bookkeeping; the value is the claim. */
function brandCandidate(line: string): string {
  const labelled = /^(.{2,30}?)\s*:\s+(.{3,})$/.exec(line);
  return labelled && FIELD_LABEL.test(labelled[1]) ? labelled[2].trim() : line;
}

/** Turns `VACHAN READING ROOMS` into something a header can show. */
function prettifyBrand(value: string): string {
  const text = value.replace(/[:•|].*$/, '').replace(/\s*[—–-]\s*.*$/, '').trim();
  if (text !== text.toUpperCase() || !/[A-Z]{3}/.test(text)) return text;
  return text
    .split(' ')
    .map((word) => (word.length <= 3 || !/[A-Z]/.test(word) ? word : word[0] + word.slice(1).toLowerCase()))
    .join(' ');
}

/** A line short enough and proper-noun-shaped enough to sit in a site header. */
function isBrandLine(line: string, leads = false): boolean {
  if (line.length > 90 || /₹|\$|€|£|\d{5,}|\[[\w]/.test(line) || /https?:|@/.test(line)) return false;
  /** `Bakery Name: The Flour Room` — a generic label hands the claim to its value. */
  const labelled = /^(.{2,30}?)\s*:\s+(.{3,})$/.exec(line);
  const flipped = !!(labelled && FIELD_LABEL.test(labelled[1]));
  const name = (flipped ? labelled[2] : line)
    .replace(/[:•|].*$/, '')
    .replace(/\s*[—–:-]{1,2}\s.*$/, '')
    .replace(/\s*\(?(?:19|20)\d{2}\)?\s*$/, '')
    .trim();
  if (!name || name.length > 40 || name.length < 3 || /[!?;,."]$/.test(name)) return false;
  /** Backslashes and angle brackets are OCR noise or markup, never part of a name. */
  if (/[\\{}<>|]/.test(name)) return false;
  // A value side was already vetted by its label, so the heading blacklist (which bars "The …") does not apply.
  if (isFurniture(name) || (!flipped && NOT_A_BRAND.test(name))) return false;
  const words = name.split(/\s+/);
  // A one-word masthead only counts when it is the very first line of the document.
  if (words.length === 1) return leads && /^[A-Z][\w'’-]{2,}$/.test(name);
  // Fragments of two letters or fewer on every word (`RE Re pn qd`) is a garbled line, not a name,
  // and a number on its own is a price — `Masala Chai 79` is a menu row, not a masthead.
  return (
    words.length <= 5 &&
    words.every((word) => !/^\d+$/.test(word)) &&
    words.some((word) => word.length >= 3) &&
    words.every((word) => /^[A-Z&'’]/.test(word) || word.length <= 2)
  );
}

/**
 * `--- Spice Garden Menu.pdf ---` is intake's own marker, and the name a person
 * gives a file is a claim about whose site this is. It beats a placeholder.
 */
function fileBrand(text: string): string {
  const marker = text.match(/^---\s*(.{3,60}?)\.(?:pdf|docx?|pptx?|xlsx?|csv|tsv|txt|md|markdown|rtf|html?|json|ya?ml|xml|eml|png|jpe?g|webp)\s*---$/im)?.[1];
  if (!marker) return '';
  const words = marker
    .replace(/[._+]+/g, ' ')
    .replace(/[-/]/g, ' ')
    .split(/\s+/)
    /** Camera and OS names (`IMG_4032`, `unnamed`, `Screenshot`) say nothing about whose site this is. */
    .filter((word) => word && !/^\d+$/.test(word) && !/^(?:final|draft|copy|v\d+|the|and|of|for|img|image|photo|unnamed|screenshot|scan|download|file|document|doc)\d*$/i.test(word))
    .slice(0, 5);
  if (!words.length) return '';
  return words
    .map((word) => (/^[A-ZÀ-Ý]/.test(word) ? word : word[0]!.toUpperCase() + word.slice(1)))
    .join(' ')
    .slice(0, 44);
}

function brandFrom(text: string, lines: string[], kind: SourceKind, personName: string): string {
  const head = lines
    .slice(0, 12)
    .map((line, index) => (isBrandLine(line, index === 0) ? brandCandidate(line).trim() : ''))
    .filter(Boolean);
  if (kind === 'resume' || kind === 'personal') {
    if (personName) return personName;
    const signature = head.find((line) => looksLikeName(line));
    if (signature) return prettifyBrand(signature);
  }

  const masthead = head.find(looksLikeName) ?? head[0];
  if (masthead) return prettifyBrand(masthead);

  const emailDomain = text.match(/[\w.+-]+@([\w-]+)\.[\w.]{2,}/)?.[1];
  if (emailDomain && !/gmail|yahoo|outlook|hotmail|proton|icloud/i.test(emailDomain)) {
    return emailDomain.split('.')[0].replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return personName;
}

function firstSentences(paragraphs: string[], max: number): string {  return paragraphs
    .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' ')
    .slice(0, max)
    .trim();
}

const FULL_DATE = `(?:${MONTHS}\\.?\\s+,?\\s*${YEAR}|${MONTHS}\\.?\\s*\\d{1,2}(?:st|nd|rd|th)?(?!\\d)(?:\\s*,?\\s*${YEAR})?|\\d{1,2}(?:st|nd|rd|th)?(?!\\d)\\s+(?:of\\s+)?${MONTHS}(?:\\.?\\s*,?\\s*${YEAR})?|${YEAR}[-/.]\\d{1,2}[-/.]\\d{1,2}(?!\\d)|\\d{1,2}[-/.]\\d{1,2}[-/.]\\d{2,4}(?!\\d))`;
const DATE_RANGE = new RegExp(`${FULL_DATE}(?:\\s*(?:-|–|—|to|until|upto)\\s*${FULL_DATE})?`, 'i');

/** Only a genuine calendar date is worth a "When" fact — "Sun" or "2019" alone is not. */
function findDate(value: string): string | undefined {
  const match = value.match(DATE_RANGE);
  if (!match) return undefined;
  const text = match[0].replace(/\s+/g, ' ').trim();
  return text.length >= 6 && text.length <= 46 ? text : undefined;
}

/** A photographed menu prints its hours; that line becomes the site's availability. */
function hoursLine(value: string): string | undefined {
  return value
    .split('\n')
    .map((line) => line.trim())
    .find(
      (line) =>
        line.length <= 90 &&
        /\b(?:open|hours|timings?)\b/i.test(line) &&
        /\d{1,2}[.:]\d{2}\s*(?:am|pm)\b/i.test(line) &&
        /\d{1,2}[.:]\d{2}\s*(?:am|pm)\b[^|]*\b(?:to|until|till|-|–|—)\b/i.test(line),
    );
}

function findVenue(value: string): string | undefined {
  const labelled = value.match(/\b(?:venue|located\s+at|situated\s+in|based\s+in|address|office)\s*[:\-]?\s+([A-Z][\w.&' -]{4,54})/);
  if (labelled) {
    const place = labelled[1].split(/[,.;|]/)[0].replace(/\s+/g, ' ').trim();
    if (/^[A-Z][\w'&.]+(?:\s+[A-Z][\w'&.]+){0,4}$/.test(place)) return place;
  }
  /** An unlabelled address: a line of clauses that ends in a post code. */
  const pinned = value
    .split('\n')
    .map((line) => line.trim().replace(/^(?:[a-z]+\s+)?(?:address|office|venue|located\s+at|situated\s+in|based\s+in)\s*[:\-]\s*/i, ''))
    .find((line) => line.split(',').length >= 3 && line.length <= 90 && /\b\d{5,6}\b\s*$/.test(line) && /[A-Za-z]/.test(line));
  return pinned;
}

/** Unit prices only — no crore-scale market figures, no percentages. */
function findPrices(value: string): string[] {
  const matches = (value.match(new RegExp(PRICE_PATTERN.source, 'gi')) ?? [])
    .map((price) => price.replace(/^(?:price|cost|mrp|fee|rate|charges?)\s*[:=]\s*/i, '').replace(/\s+/g, ' ').trim());
  const usable = matches.filter((price) => {
    if (/crore|lakh|billion|million|%|\boff\b|\bcr\b/i.test(price)) return false;
    const digits = price.replace(/\D/g, '');
    if (!digits.length || digits.length > 8) return false;
    if (/^0+$/.test(digits)) return false;
    return !/^(19|20)\d{2}$/.test(digits);
  });
  return [...new Set(usable)]
    .sort((a, b) => Number(a.replace(/\D/g, '')) - Number(b.replace(/\D/g, '')))
    .slice(0, 8);
}

function findPhone(value: string): string | undefined {
  for (const candidate of value.matchAll(/\+?\d[\d\s().-]{8,16}\d/g)) {
    const raw = candidate[0];
    const before = value.slice(Math.max(0, (candidate.index ?? 0) - 26), candidate.index ?? 0);
    if (/\b(?:pin|postal|zip|code|reg\.?|gst|cin)\b/i.test(before)) continue;
    const digits = raw.replace(/\D/g, '');
    const longestGroup = Math.max(...raw.split(/[^\d]+/).map((group) => group.length));
    if (digits.length < 10 || digits.length > 13) continue;
    /** Landlines and mobiles written in groups survive when the upload says "call" them. */
    const invited = /\b(?:call|phone|tel(?:ephone)?|dial|whatsapp|mobile|reservations?|book(?:ing)?)\b/i.test(before);
    if (!raw.startsWith('+') && longestGroup < 5 && !invited) continue;
    return raw.replace(/[().\s-]{2,}/g, ' ').trim();
  }
  return undefined;
}

/**
 * Agent 1. Deterministic and dependency-free: it reads whatever arrived —
 * a CV, a menu, a deck, a CSV, a pasted note — and reports what it found.
 */
export function buildContentProfile(text: string, assets: SourceAsset[] = []): ContentProfile {
  const rawLines = text.replace(/\r\n/g, '\n').split('\n');
  const lines = rawLines.map(unmarkdown).filter((line) => line && !isFurniture(line));
  const sections = discoverStructure(text);
  const sectionLines = (role: SectionRole) => sections.filter((s) => s.role === role).flatMap((s) => s.lines);
  const sectionParagraphs = (role: SectionRole) => sections.filter((s) => s.role === role).flatMap((s) => s.paragraphs);

  /**
   * A deck or landing page opens with a masthead and a one-line positioning
   * statement before its first real chapter. Structure files that under `other`
   * unless it was labelled Summary, but it is the honest summary — the sentence
   * the upload chose to lead with.
   */
  const preamble = sections.find((s) => s.role === 'summary') ?? (sections[0]?.role === 'other' ? sections[0] : undefined);
  const headLines = lines.slice(0, 12);
  const personName = headLines.find(looksLikeName) ?? '';
  const name = personName
    ? personName === personName.toUpperCase() && /[A-Z]{2}/.test(personName)
      ? personName.replace(/\w+/g, (word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
      : personName
    : '';

  const kind = classifyKind(text, sections);
  const brand = brandFrom(text, lines, kind.kind, name);

  const roleLineRaw =
    headLines
      .map((line) => line.trim())
      .find(
        (line) =>
          line !== personName &&
          line.length <= 92 &&
          !/[.!?]$/.test(line) &&
          /** `PARTNERS & FUNDERS` is a banner over a list; a descriptor is written in sentence case. */
          /[a-z]/.test(line) &&
          (ROLE_WORDS.test(line) || /\b(we|our)\b/i.test(line)),
      ) ?? '';

  // `THENGA & TEAK — Interior design studio` is the masthead, not the role: drop the brand half.
  const roleLine = (() => {
    if (!roleLineRaw || !brand) return roleLineRaw;
    const sameBrand = (part: string) => prettifyBrand(part).toLowerCase() === brand.toLowerCase();
    const parts = roleLineRaw.split(/\s*(?:[—–]|-{2,})\s+/).map((part) => part.trim()).filter(Boolean);
    const rest = parts.filter((part) => !sameBrand(part));
    return rest.length ? rest.join(' — ') : roleLineRaw;
  })();

  const [roleHeadRaw, ...roleTails] = roleLine.split(/\s*(?:\||·|–|—|\bat\b)\s*/).map((part) => part.trim()).filter(Boolean);
  const roleHead = CODE_KEY.test(roleHeadRaw) ? '' : roleHeadRaw;

  // `THENGA & TEAK — Interior design and joinery studio` also carries its own descriptor.
  const tagline = (() => {
    const line = lines
      .slice(0, 12)
      .find((candidate) => /[—–-]{1,2}\s/.test(candidate) && prettifyBrand(candidate).toLowerCase() === (brand || name).toLowerCase());
    if (!line) return '';
    const tail = line.replace(/^.*?[—–-]{1,2}\s+/, '').trim();
    const words = tail.split(/\s+/).filter(Boolean);
    return tail.length > 8 && tail.length <= 88 && words.length >= 3 && !/https?|@|\d{5}/.test(tail) ? tail : '';
  })();

  const experience = parseExperienceBlock(sectionLines('experience'));
  const projects = parseProjectsBlock([...sectionLines('projects'), ...sectionLines('gallery')]);
  const education = parseEducationBlock(sectionLines('education'));

  const skillItems = [
    ...sectionLines('skills').flatMap((line) =>
      /^[\w &+./#-]{2,30}\s*[:\-]\s+\S/.test(line) && !/^(https?|technologies?\s*$)/i.test(line)
        ? splitList(line.split(/[:\-]\s+/, 2)[1] ?? '')
        : splitList(line),
    ),
    ...sections
      .filter((s) => s.role === 'offerings')
      .flatMap((s) => s.items.flatMap((item) => item.tags))
      .filter((tag) => SKILL_GROUPS.some((group) => group.re.test(tag))),
  ];

  const summaryPool = [
    firstSentences(sectionParagraphs('summary'), 800),
    firstSentences(preamble?.paragraphs ?? [], 800),
    firstSentences(sectionParagraphs('about'), 800),
    preamble?.items.map((item) => item.body).filter(Boolean).join(' ') ?? '',
  ].find((candidate) => candidate.length > 60) ?? '';

  const email = text.match(/[\w.+-]+@[\w-]+\.[\w.]{2,}/)?.[0];
  const phone = findPhone(text);
  const location = lines.find((line) => /^[A-Z][a-z]{2,}(?: [A-Z][a-z]{2,})?, ?[A-Z][a-zA-Z]{2,}$/.test(line) && line.length <= 40);

  const narrative = [
    summaryPool,
    ...experience.flatMap((entry) => [...entry.bullets, entry.role, entry.org]),
    ...projects.map((project) => project.description),
    ...sections.filter((s) => s.role === 'offerings').flatMap((s) => s.lines),
  ].join(' ');
  /** One stray keyword is a coincidence; a domain shows up twice. */
  const industries = INDUSTRY_TERMS.map((term) => ({ name: term.name, hits: (narrative.match(new RegExp(term.re.source, 'gi')) ?? []).length }))
    .filter((term) => term.hits >= 2)
    .slice(0, 3)
    .map((term) => term.name);

  const when = findDate(text) ?? hoursLine(text);
  const where = findVenue(text);
  const prices = findPrices(text);
  const labelledSection = sections.find(
    (section) =>
      section.role !== 'summary' &&
      /** `PARTNERS & FUNDERS` is a banner over a list; a headline is something a reader would say. */
      /[a-z]/.test(section.heading) &&
      !/^(overview|summary|details|table|rows|sheet|course|category|on offer|offerings?|pricing|price list|catalog(?:ue)?)$/i.test(section.heading) &&
      !NOT_A_BRAND.test(section.heading) &&
      section.heading.split(/\s+/).length >= 2,
  );

  const metrics = extractMetrics([
    ...experience.flatMap((entry) => entry.bullets),
    ...sections.filter((s) => s.role === 'proof').flatMap((s) => s.lines),
    ...sections.filter((s) => s.role === 'narrative').flatMap((s) => s.lines),
  ]);

  const links = dedupeLinks(collectLinks(text, brand || name));

  return {
    kind: kind.kind,
    kindEvidence: kind.evidence,
    name: (brand || name || fileBrand(text) || KIND_HEADLINE[kind.kind]).replace(/\s+/g, ' ').trim(),
    headline: (roleHead || experience[0]?.role || tagline || labelledSection?.heading || KIND_HEADLINE[kind.kind]).replace(/\s+/g, ' ').trim(),
    focus: roleTails.join(' · ') || undefined,
    summary: summaryPool.slice(0, 900),
    location,
    email,
    phone,
    links: phone && !email ? [...links, { label: 'Phone', href: `tel:${phone.replace(/\D/g, '')}` }] : links,
    skills: groupSkills(skillItems),
    experience,
    projects,
    education,
    sections,
    metrics,
    languages: sectionLines('languages').flatMap(splitList).slice(0, 6),
    interests: sectionLines('interests').flatMap(splitList).slice(0, 8),
    industries,
    when: when?.replace(/\s+/g, ' ').trim(),
    where: where?.replace(/[|].*$/, '').trim(),
    prices,
    seniority: detectSeniority(text),
    signals: [
      `${sections.length} labelled sections`,
      `${experience.length} roles`,
      `${projects.length} projects`,
      `${sections.reduce((sum, s) => sum + s.items.length, 0)} content items`,
      `${assets.length} images`,
      `${lines.length} content lines`,
    ],
    gallery: assets,
    rawLength: text.length,
  };
}

export { parseItems, labelFor };
