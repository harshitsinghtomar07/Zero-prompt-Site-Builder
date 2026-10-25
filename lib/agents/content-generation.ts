import type { ContentItem, ContentProfile, ContentSection, SectionRole } from '@/lib/types/profile';
import type { Block, SeoMeta, ThemeTokens } from '@/lib/types/site';
import type { SitePlan } from './site-strategy';
import { SeededPicker } from '@/lib/uniqueness';
import { PRICE_PATTERN, TIME_PATTERN } from './structure';
import { KIND_HEADLINE } from './content-intelligence';

function condense(text: string, max: number): string {
  const clean = (text ?? '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > max * 0.6 ? lastSpace : max).replace(/[,;:.\-]+$/, '')}…`;
}

function titleCase(input: string): string {
  return input.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

/**
 * A label is cut at a word or clause boundary and never wears an ellipsis: a
 * title that stops mid-thought reads as a bug, so the copy is shortened where
 * it can be read out loud instead.
 */
function clip(value: string, max: number): string {
  const text = clean(value);
  if (text.length <= max) return text;
  const head = text.slice(0, max + 2);
  const at = Math.max(head.lastIndexOf(' '), head.lastIndexOf(','), head.lastIndexOf(';'));
  return clean(head.slice(0, Math.max(10, at)).replace(/[,;:.\s—–-]+$/, ''));
}

function sentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function counted(items: unknown[], noun: string, plural = `${noun}s`): string {
  return `${items.length} ${items.length === 1 ? noun : plural}`;
}

/** A stat caption: the clause the number actually lives in, cut where it can still be read out loud. */
function shortLabel(text: string, value: string, max = 68): string {
  const flat = clean(text);
  const at = flat.indexOf(value);
  if (at >= 0) {
    const clause = flat
      .slice(Math.max(0, flat.lastIndexOf(',', at) + 1), flat.indexOf('.', at) === -1 ? flat.length : flat.indexOf('.', at))
      .replace(/^[,\s-]+|[,\s-]+$/g, '');
    if (clause.length > 8) return clip(clause, max);
  }
  const first = flat.split(/(?<=[.!?])\s+/)[0] ?? flat;
  return clip(first, max);
}

/**
 * `Net revenue retention 118 percent.` becomes the number — with the unit that
 * makes it mean something — and the words that own it. A sentence usually names
 * its figure before the digits; when it does not, what follows them does.
 */
function statOf(text: string): { value: string; label: string } | null {
  const NUMBER = /(?:[₹$€£]\s?)?\d[\d,.]*(?:\s*(?:%|k|m|cr|crore|lakhs?|billion|million|trillion|percent))?\b/i;
  const source = clean(text.replace(/^[-•*◦]\s*/, ''));

  /**
   * A caption that names its figure after a colon (`Books issued: 3,14,600`) is
   * the honest reading: the words before the colon own the number, and the first
   * figure after it is the one being reported — not a year or an ordinal buried
   * in the label.
   */
  const colon = source.indexOf(':');
  if (colon > 2) {
    const after = source.slice(colon + 1);
    const figure = NUMBER.exec(after);
    if (figure?.[0]) {
      const value = clean(figure[0]);
      const label = clean(source.slice(0, colon).replace(/\b\((?:[^)]*)\)$/i, ''));
      if (/\d/.test(value) && label.split(/\s+/).length <= 8 && !/^\d+$/.test(label)) {
        return { value, label: says(clip(label, 56)) };
      }
    }
  }

  const match = NUMBER.exec(source);
  if (!match?.[0]) return null;
  const value = clean(match[0]);
  const lead = clean(source.slice(0, match.index).replace(/\b(?:is|are|was|were|of|at|to|in|about|roughly|nearly|just|over|around|only|with|and)\b.*$/i, '')).replace(/[\s,;:—–.-]+$/, '');
  /** Keep whole words only, and drop a signature that trails on a dangling preposition. */
  const afterWords = (source.slice(match.index + match[0].length).match(/^\s*[^,.;:—–]{1,30}/)?.[0] ?? '')
    .trim()
    .replace(/\s+(?:a|an|the|of|to|in|for|at|on|by|per|against|than|from|up|down|over|under|and|or|is|are|was|were|that|which)$/, '');
  const after = clean(afterWords).replace(/[\s,;:—–.-]+$/, '');
  const named = lead.length >= 3 && lead.length <= 28 && !/[,;]/.test(lead) ? lead : after.length >= 3 ? after : clip(source.replace(match[0], ' '), 56);
  return { value, label: says(named) };
}

/** The headline is a phrase a person would say out loud, not a bare year or number. */
function isPhrase(value: string): boolean {
  const text = clean(value);
  return /[a-zÀ-ÿ]{3}/i.test(text) && text.split(/[\s—–-]+/).filter(Boolean).length >= 2 && !/^(?:19|20)\d{2}$/.test(text);
}

function firstPerson(summary: string, name: string): string {
  const withoutThirdPerson = summary
    .replace(new RegExp(`^${name}\\s*(?:is|is a|is an|has)?[,:\\s]*`, 'i'), '')
    .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\s+(?:is|has|was)\b/g, (m) => m.replace(/\b(is|has|was)\b/, 'are'))
    .trim();
  return sentenceCase(withoutThirdPerson);
}

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 24);
}

/**
 * Registration numbers, statutory approvals and price tables are prose in the
 * upload but noise in a headline. A claim has to read like a sentence a person
 * would say out loud.
 */
function looksLikeClaim(sentence: string): boolean {
  const words = sentence.split(/\s+/).filter(Boolean);
  if (words.length < 5 || words.length > 24) return false;
  if (/[A-Za-z]{2,}\/\d|\d{2,}\/\d{2,}|\b(?:12A|80G|GST|CIN|UIN|SEBI|IRDAI|FAD|NAS|ISO)\b/i.test(sentence)) return false;
  if (/https?|@|\d{5,}|(?:[₹$€£]\s?\d)|\b(?:rs|inr)\s?\d/i.test(sentence)) return false;
  if (/^\W*(?:with|and|or) /i.test(sentence)) return false;
  /** A sentence that opens with `So` or `If` is the second half of a thought; a headline opens its own. */
  if (/^(?:so|but|and|or|nor|yet|then|also|anyway|because|since|which|while|though|although|if|when|unless|even|instead|well|now|therefore|however|moreover)\b/i.test(sentence)) return false;
  const shouty = words.filter((word) => /^[A-Z0-9/&().,-]{4,}$/.test(word)).length;
  if (shouty / words.length > 0.25) return false;
  return /[a-z]{3}/.test(sentence);
}

function roleSections(profile: ContentProfile, role: SectionRole): ContentSection[] {
  return profile.sections.filter((section) => section.role === role);
}

function gather(profile: ContentProfile, role: SectionRole): ContentItem[] {
  return roleSections(profile, role).flatMap((section) => section.items);
}

function linesOf(profile: ContentProfile, role: SectionRole): string[] {
  return roleSections(profile, role).flatMap((section) => section.lines);
}

function proseOf(profile: ContentProfile, roles: SectionRole[]): string {
  for (const role of roles) {
    const paragraphs = roleSections(profile, role).flatMap((section) => section.paragraphs);
    const joined = paragraphs.join(' ').trim();
    if (joined.length > 60) return joined;
    // A menu's lines are its items, which the list below already shows; prose is everything else.
    const lines = roleSections(profile, role)
      .flatMap((section) => section.lines)
      .filter((line) => !PRICE_PATTERN.test(line))
      .join(' ')
      .trim();
    if (lines.length > 60) return lines;
  }
  return profile.summary;
}

function clean(value: string): string {
  return value.replace(/\s+/g, ' ').replace(/^["“'']+|["”'']+$/g, '').trim();
}

/** Copy only reaches the page when it is a real phrase, not a stray marker. */
function says(value: string, min = 2): string {
  const text = clean(value);
  if (!text || /^[\s.,;:|_—–\-·*#'"“”()[\]{}…-]+$/.test(text)) return '';
  if (/^(https?:\/\/|data:)/i.test(text)) return '';
  return text.replace(/[\p{L}\p{N}]/gu, '').length > text.length * 0.6 ? '' : text.length >= min ? text : '';
}

/** Titles a person can hold — if a phrase uses one, it is a role, not a name. */
const ROLE_HINT =
  /\b(engineer|developer|designer|architect|manager|director|founder|co-?founder|lead|head|officer|analyst|consultant|researcher|professor|doctor|advocate|chef|photographer|writer|editor|artist|partner|associate|strategist|minister|teacher|trainer|specialist|relations|vp|ceo|cto|coo|cfo|cmo)\b/i;

function looksLikePerson(value: string): boolean {
  const text = clean(value);
  if (!text || text.length > 44) return false;
  if (/₹|rs\.?|\$|€|£|%|\b\d{3,}\b|\binr\b|\bcr\b|\blakh\b|[,;:!?]/.test(text)) return false;
  if (ROLE_HINT.test(text)) return false;
  const words = text.split(/\s+/);
  return words.length >= 1 && words.length <= 4 && words.every((word) => /^[A-ZÀ-Ý][a-zà-ÿ'’.]*$/.test(word));
}

/** Words that head a list instead of naming a thing — never a card title. */
const SECTIONISH =
  /^(?:outcomes?|details?|highlights?|summary|overview|notes?|info|information|results?|tags?|more|also|then|how|what\s+(?:we|i|you)\s+(?:did|do|built))\b/i;

/** `Price: 120` keeps its label for the parser; a badge or a fact wants the number. */
function barePrice(value: string): string {
  return value.replace(/^(?:price|cost|mrp|fee|rate|charges?)\s*[:=]\s*/i, '').trim();
}

function stripPrice(text: string): { body: string; price: string } {
  const match = text.match(new RegExp(PRICE_PATTERN.source, 'i'));
  if (!match?.[0]) return { body: clean(text), price: '' };
  return {
    body: clean(text.replace(match[0], ' ').replace(/[,;|–—-]\s*$/, '')),
    price: barePrice(match[0].replace(/\s+/g, ' ').trim()),
  };
}

/**
 * One priced row. Some uploads lead with the number (`₹750 a month — one child's
 * year`), others with the name (`Essentials — ₹9.5 lakh to ₹16 lakh`), and the
 * badge and the label have to come out the right way round either time.
 */
function offerOf(item: ContentItem): { name: string; price: string; detail: string; tags: string[]; featured: boolean } {
  const title = clean(item.title);
  const body = clean(item.body);
  const money = new RegExp(PRICE_PATTERN.source, 'gi');
  const priceLed = new RegExp(`^(?:${PRICE_PATTERN.source})`, 'i').test(title);
  const trim = (value: string) => clean(value).replace(/^[\s—–:|,.-]+|[\s—–:|,.-]+$/g, '');
  const lead = trim(body.split(/[,;:]/)[0] ?? '').replace(money, '').trim();
  const usable = (value: string) => value.split(/\s+/).length >= 2 && value.length >= 6;

  const name = priceLed && usable(lead) ? lead : trim(title.replace(money, '')) || trim(title) || trim(body.replace(money, ''));
  const detail = priceLed && name === lead ? trim(body.slice((body.split(/[,;:]/)[0] ?? '').length)) : body;
  const price = priceLed ? trim(title) : item.meta ? barePrice(clean(item.meta)) : stripPrice(`${title} ${body}`).price;

  return {
    name: says(clip(name, 56)),
    price: says(price),
    detail: says(condense(trim(detail.replace(money, ' ')), 160)),
    tags: item.tags,
    featured: false,
  };
}

/** Quotes are only ever lifted from the upload — never written. */
/**
 * A quote pasted from a plain-text document arrives broken across lines, with
 * its attribution (`-- Jomon Pillai, residential client`) on the line below. A
 * testimonial is only readable as one, so a wrapped line or a signature is
 * folded onto the quote it belongs to. Whitespace is the only thing flattened:
 * the double dash and the quote marks have to survive for `parseQuotes` to see
 * where the sentence ends and the signature starts.
 */
function stitchQuotes(lines: string[]): string[] {
  const flat = (value: string) => value.replace(/\s+/g, ' ').trim();
  const merged: string[] = [];
  for (const raw of lines) {
    const line = flat(raw);
    if (!line) continue;
    const previous = merged[merged.length - 1];
    /** A line that opens with `--`, `—` or `–` signs the quote above it. */
    const attribution = /^(?:—|–|--)\s+\S/.test(line);
    /** A new quote or a fresh bullet never belongs to the sentence before it. */
    const startsFresh = /^[-•*◦]\s/.test(line) || /^[“"']/.test(line);
    const unfinished = !!previous && !/[.!?:…]["”]?$/.test(previous) && !/[”"]$/.test(previous);
    if (previous && !startsFresh && (attribution || unfinished)) {
      merged[merged.length - 1] = `${previous} ${line}`;
      continue;
    }
    merged.push(line);
  }
  return merged;
}

function parseQuotes(lines: string[]): { quote: string; author: string; role: string }[] {
  const found: { quote: string; author: string; role: string }[] = [];
  for (const raw of stitchQuotes(lines)) {
    const line = clean(raw.replace(/^[-•*◦]\s*/, ''));
    if (!line) continue;
    const quoted = line.match(/[“"]([^”"]{16,320})[”"]/);
    if (quoted) {
      const tail = line.slice((quoted.index ?? 0) + quoted[0].length).replace(/^[\s,.—–-]+/, '');
      const [author, ...rest] = tail.split(/[,—–-]/).map((part) => clean(part)).filter(Boolean);
      found.push({ quote: quoted[1], author: author || 'From the upload', role: rest.join(' · ') });
      continue;
    }
    const dashed = line.match(/^(.{16,240}?)\s*(?:—|–|--)\s+(.{2,90})$/);
    if (dashed && /[.!"”]$/.test(dashed[1]) && /^[A-Z][\p{L}'’.]+(?:\s+[A-Z][\p{L}'’.]+){0,3}/u.test(dashed[2])) {
      const [author, ...rest] = dashed[2].split(/[,;]/).map((part) => clean(part)).filter(Boolean);
      found.push({ quote: clean(dashed[1]), author: author || 'From the upload', role: rest.slice(0, 2).join(' · ') });
    }
  }
  /** The same quote can arrive once as a line and once as a row. */
  const unique = found.filter((entry, index) => found.findIndex((other) => other.quote.slice(0, 40) === entry.quote.slice(0, 40)) === index);
  return unique.slice(0, 6);
}

/** `Asha Rao — Asha Rao, Founder` should read `Founder`, not the name twice. */
function withoutNameLead(role: string, name: string): string {
  const roleWords = role.split(/\s+/);
  const nameWords = name.split(/\s+/);
  let lead = 0;
  while (lead < nameWords.length && lead < roleWords.length && roleWords[lead]?.toLowerCase() === nameWords[lead]?.toLowerCase()) lead++;
  return clean(roleWords.slice(lead).join(' ').replace(/^[\s,;—–:-]+/, ''));
}

/** A team member's line is a title and an employer, never a sentence about what they do. */
function looksLikeRole(value: string): boolean {
  const text = clean(value);
  if (!text || text.endsWith('.') || text.includes('…') || text.length > 52) return false;
  if (/\d{3,}|[$€£₹]\s?\d|https?|@/.test(text)) return false;
  if (ROLE_HINT.test(text)) return true;
  /** `before that, nine years at Machhan` is the tail of a sentence, not a title. */
  if (/^(?:before|after|then|also|and|or|but|nor|who|which|that|this|these|from|with|without|previously|formerly|currently|where|when|because|so)\b/i.test(text)) return false;
  return text.split(/[\s,]+/).filter(Boolean).length <= 4;
}

function parsePeople(items: ContentItem[]): { name: string; role: string; note: string }[] {
  return items
    .map((item) => {
      const name = clean(item.title);
      if (!looksLikePerson(name)) return { name: '', role: '', note: '' };

      /** Everything the card says after the person's name. */
      let rest = item.body;
      const at = rest.toLowerCase().indexOf(name.toLowerCase());
      if (at >= 0) rest = `${rest.slice(0, at)} ${rest.slice(at + name.length)}`;
      const segments = clean(rest)
        .split(/[,;]|\s*(?:—|–)\s*|\.\s+/)
        .map(clean)
        .filter((segment) => segment.length > 2);
      const roleAt = segments.findIndex((segment) => looksLikeRole(segment));
      const role = roleAt >= 0 ? (segments.splice(roleAt, 1)[0] ?? '') : '';
      /** A card carries one line under the title, not the whole biography. */
      const detail = segments.filter((segment) => segment.split(/\s+/).length >= 3).slice(0, 2);
      const note = [item.meta, ...detail].filter(Boolean).join(' · ');
      return { name: clip(name, 40), role: clip(role, 48), note: condense(note, 120) };
    })
    .filter((person) => person.name)
    .slice(0, 8);
}

function parseFaq(items: ContentItem[], lines: string[]): { question: string; answer: string }[] {
  const pairs = items
    .map((item) => ({
      question: condense(item.title || item.body, 120),
      answer: condense(item.title ? item.body.replace(/^[\s—–:-]+/, '') : '', 320),
    }))
    .concat(
      lines
        .filter((line) => line.trim().endsWith('?'))
        .map((line) => ({ question: condense(line, 120), answer: '' })),
    )
    .filter((pair) => pair.question.includes('?') || pair.answer);

  /** The same question often arrives twice: once cut short, once in full. Keep the longest and any answer. */
  const unique = new Map<string, { question: string; answer: string }>();
  for (const pair of pairs) {
    const key = pair.question.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 24);
    const seen = unique.get(key);
    if (!seen) {
      unique.set(key, pair);
      continue;
    }
    unique.set(key, {
      question: pair.question.length > seen.question.length ? pair.question : seen.question,
      answer: pair.answer || seen.answer,
    });
  }

  /**
   * A truncated copy of a question is a different key but the same question:
   * "I have a disability" and "I have a disability — is the venue accessible?"
   * are one entry, so the fragment that opens a longer question is dropped.
   */
  const kept = [...unique.values()];
  const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const deduped = kept.filter(
    (entry) => !kept.some((other) => other !== entry && norm(other.question).startsWith(norm(entry.question)) && norm(other.question).length > norm(entry.question).length),
  );
  return deduped.slice(0, 8);
}

/** The number the deck is actually asking for, not the first price it happens to mention. */
function raiseOf(profile: ContentProfile): string | undefined {
  const stated = profile.sections
    .flatMap((section) => section.lines)
    .join(' ')
    .match(/\brais(?:e|ing|ed)\s+((?:₹|rs\.?|inr|\$|usd|€)\s?[\d.,]+\s*(?:cr|crore|lakh|lakhs|k|m|mn)?)/i)?.[1];
  return stated ?? (profile.prices.length > 1 ? profile.prices[profile.prices.length - 1] : undefined);
}

const HERO_EYEBROWS: Record<string, (p: ContentProfile) => string> = {
  resume: (p) => p.location ?? (p.email ? 'Open to new work' : 'Portfolio'),
  pitch_deck: (p) => {
    const ask = raiseOf(p);
    return ask ? `Raising ${ask}` : p.when ?? 'Now raising';
  },
  restaurant: (p) => [p.location, p.when].filter(Boolean).join(' · ') || 'Menu',
  event: (p) => [p.when, p.where].filter(Boolean).join(' · ') || 'Register',
  store: (p) => {
    const from = priceFrom(p);
    return from ? `From ${from}` : p.location ?? 'Shop';
  },
  blog: (p) => p.location ?? 'Writing',
  nonprofit: (p) => [p.where, p.location].filter(Boolean).join(' · ') || 'Get involved',
  agency: (p) => p.location ?? 'Studio',
  creator: (p) => p.location ?? 'Latest work',
  business: (p) => p.location ?? 'What we do',
  personal: (p) => p.location ?? 'Portfolio',
};

/** What one quoted price is actually worth, in rupees-or-dollars of order of magnitude. */
function amountOf(price: string): number {
  const match = price.match(/(\d[\d,]*(?:\.\d+)?)\s*(k|m|cr|crore|lakh|lakhs)?/i);
  const value = Number((match?.[1] ?? '').replace(/,/g, ''));
  if (!value) return 0;
  const unit = (match?.[2] ?? '').toLowerCase();
  return value * (unit === 'k' ? 1e3 : unit === 'm' ? 1e6 : unit.startsWith('cr') ? 1e7 : unit.startsWith('lakh') ? 1e5 : 1);
}

/** `From …` is the entry price of the listed tiers, not the first number the document mentions. */
function priceFrom(profile: ContentProfile): string | undefined {
  const rows = gather(profile, 'pricing').filter((item) => !/^(?:add-?ons?|extras?|optional|travel|delivery|shipping)\b/i.test(clean(item.title)));
  const quoted = rows.map((item) => barePrice(clean(item.meta ?? ''))).filter((price) => /\d/.test(price));
  const pool = quoted.length ? quoted : profile.prices;
  if (!pool.length) return undefined;
  return [...pool].sort((a, b) => amountOf(a) - amountOf(b))[0];
}

/** The three facts a visitor should see under the headline — chosen per content kind. */
function factsFor(profile: ContentProfile): { label: string; value: string }[] {
  const fact = (label: string, value: string | undefined) => (value ? { label, value: clip(value, 46) } : null);
  const recent = profile.experience[0] ? `${profile.experience[0].role}${profile.experience[0].org ? ` · ${profile.experience[0].org}` : ''}` : undefined;
  const founded = proseOf(profile, ['summary', 'about', 'narrative']).match(/\b(?:since|established|founded|opened)\b[^0-9]{0,14}((?:19|20)\d{2})\b/i)?.[1];
  const ask = raiseOf(profile);
  const from = priceFrom(profile);
  const byKind: Record<string, () => ({ label: string; value: string } | null)[]> = {
    resume: () => [fact('Based in', profile.location), fact('Most recent', recent), fact('Focus', profile.focus)],
    personal: () => [fact('Based in', profile.location), fact('Most recent', recent), fact('Focus', profile.focus)],
    creator: () => [fact('Based in', profile.location ?? profile.where), fact('From', from), fact('Booking', profile.when)],
    pitch_deck: () => [fact('Raising', ask), fact('Since', founded), fact('Market', profile.where)],
    event: () => [fact('When', profile.when), fact('Where', profile.where ?? profile.location), fact('From', from)],
    restaurant: () => [fact('Where', profile.location ?? profile.where), fact('From', from), fact('Hours', profile.when)],
    store: () => [fact('Where', profile.location ?? profile.where), fact('From', from), fact('Since', founded)],
    nonprofit: () => [fact('Where', profile.location ?? profile.where), fact('Giving from', profile.prices[0]), fact('Since', founded)],
    blog: () => [fact('Based in', profile.location), fact('Writing since', founded), fact('Focus', profile.focus)],
    agency: () => [fact('Based in', profile.location), fact('Since', founded), fact('From', from)],
    business: () => [fact('Based in', profile.location), fact('Since', founded), fact('From', from)],
  };
  const build = byKind[profile.kind] ?? byKind.personal;
  return build().filter((item): item is { label: string; value: string } => !!item && !!item.value).slice(0, 3);
}

const CTA_LABELS: Record<string, string> = {
  resume: 'Email me',
  personal: 'Get in touch',
  pitch_deck: 'Request the deck',
  saas: 'Book a demo',
  restaurant: 'Book a table',
  event: 'Get tickets',
  store: 'Shop the collection',
  blog: 'Subscribe',
  nonprofit: 'Donate',
  agency: 'Start a project',
  creator: 'Work with me',
  business: 'Talk to us',
};

/** Agent 4, deterministic core: writes honest copy sourced only from the upload. */
export function composeBlocks(
  profile: ContentProfile,
  plan: SitePlan,
  theme: ThemeTokens,
  seedKey: string,
  visuals: { art: string; tiles: string[] },
): Block[] {
  const seed = new SeededPicker(`${seedKey}:copy`);
  const name = profile.name || 'This site';
  /** `Kitchen & menu` names a kind of site, not this one; a nameless upload wears its own name. */
  const role = condense(profile.headline === KIND_HEADLINE[profile.kind] ? name : profile.headline || name, 70);
  const heading = (kind: string, fallback: string) => plan.headings[kind] || fallback;
  const blocks: Block[] = [];
  const statements = sentences(proseOf(profile, ['summary', 'about']));
  const claims = statements.filter((sentence) => looksLikeClaim(sentence));

  for (const kind of plan.blocks) {
    switch (kind) {
      case 'hero': {
        /** A headline that has to be cut is a headline that was never a headline. */
        const claimIndex = claims.findIndex((sentence) => sentence.length > 36 && sentence.length <= 92);
        const claim = claimIndex >= 0 ? claims[claimIndex] : '';
        const specialty = profile.focus || (profile.industries.length ? profile.industries.slice(0, 2).join(' and ') : '');
        /** The header already carries the brand, so the headline does not say it twice — unless stripping it leaves only a year, which says nothing. */
        const said = role.toLowerCase().startsWith(name.toLowerCase()) ? clean(role.slice(name.length)).replace(/^[\s—–:|,-]+/, '') : role;
        const keep = isPhrase(said) ? said : role;
        /** A specialty enriches a bare role; a descriptor that already names the work and the place needs nothing bolted on. */
        const fallback = `${keep}${specialty && keep.length < 30 ? ` — ${specialty}` : ''}`;
        const eyebrow = (HERO_EYEBROWS[profile.kind] ?? HERO_EYEBROWS.personal)(profile);
        const email = profile.email ? `mailto:${profile.email}` : profile.kind === 'restaurant' || profile.kind === 'store' ? '#offers' : (profile.links[0]?.href ?? '#top');
        const below = claimIndex >= 0 ? (claims[claimIndex + 1] ?? claims[claimIndex - 1] ?? '') : statements[0] ?? '';
        /** A name that is also the description would appear twice in a row, so the plan's own sentence speaks instead. */
        const under = below && below !== claim ? below : role.toLowerCase() !== name.toLowerCase() ? `${name} — ${role}.` : plan.narrative;
        blocks.push({
          kind: 'hero',
          variant: `${profile.kind}-${theme.heroLayout}`,
          eyebrow: clip(eyebrow, 52),
          headline: condense(claim || fallback, 96),
          subheadline: condense(under, 240),
          primaryCta: { label: CTA_LABELS[profile.kind] ?? 'Get in touch', href: email },
          secondaryCta: plan.blocks.includes('offers')
            ? {
                label: profile.kind === 'restaurant' ? 'See the menu' : profile.kind === 'store' ? 'See the collection' : 'See the pricing',
                href: '#offers',
              }
            : plan.blocks.includes('features')
              ? { label: 'What we do', href: '#features' }
              : profile.links[0]
                ? { label: profile.links[0].label, href: profile.links[0].href }
                : undefined,
          facts: factsFor(profile).filter((fact) => !eyebrow.toLowerCase().includes(fact.value.toLowerCase())),
          art: visuals.art,
        });
        continue;
      }

      case 'marquee': {
        const words = [
          ...gather(profile, 'offerings').map((item) => item.title),
          ...profile.skills.flatMap((group) => group.items),
          ...profile.industries.map(titleCase),
          ...gather(profile, 'proof').map((item) => item.title),
        ].map((word) => says(word)).filter((word) => !!word && word.length > 2 && word.length < 30 && !/https?\W|@/.test(word));
        blocks.push({ kind: 'marquee', variant: 'ticker', items: [...new Set(words)].slice(0, 14) });
        continue;
      }

      case 'about': {
        const prose = proseOf(profile, ['summary', 'about']);
        /** An address or a spec sheet is a fact for the contact and offers blocks, not a paragraph about who we are. */
        const LOGISTICS = /\b\d{6}\b|\b(?:degrees?|celsius|fahrenheit|°\s?[CF]\b|sq\s?ft|square\s?(?:feet|foot|inches?)|kilomet(?:er|re)|millimet(?:er|re)|centimet(?:er|re))\b/i;
        const narrativeOnly = sentences(prose).filter((sentence) => !LOGISTICS.test(sentence)).join(' ');
        const body = firstPerson(condense((narrativeOnly.length > 60 ? narrativeOnly : prose) || `${role}, working across ${profile.industries.join(', ') || 'many domains'}.`, 640), name);
        blocks.push({
          kind: 'about',
          variant: seed.chance(0.5) ? 'lead' : 'split',
          heading: heading('about', 'About'),
          body: [body.slice(0, 400), body.slice(400)].filter((part) => part && part.length > 24),
          highlights: [
            ...profile.industries.map((industry) => `Works in ${industry}`),
            profile.languages[0] ? `Speaks ${titleCase(profile.languages[0])}` : '',
            profile.education[0] ? `Trained in ${condense(profile.education[0].award, 40)}` : '',
          ]
            .filter(Boolean)
            .slice(0, 4),
        });
        continue;
      }

      case 'quote': {
        const quotes = parseQuotes(linesOf(profile, 'testimonials'));
        const pull = quotes[0] ?? { quote: statements[0] ?? '', author: '' };
        blocks.push({ kind: 'quote', variant: 'pull', text: condense(pull.quote, 240), attribution: pull.author || undefined });
        continue;
      }

      case 'stats': {
        /**
         * The raw proof lines keep the punctuation that names a figure
         * (`Books issued: 3,14,600`); the parsed title/body pair has already lost
         * the colon, so a reconstruction of it turns "Grade 4" into a stat. Read
         * the lines, and fall back to the rows only when a section has none.
         */
        const proofLines = linesOf(profile, 'proof').join(' ');
        const proofSource = proofLines.length > 40 ? proofLines : gather(profile, 'proof').map((item) => `${item.title}: ${item.body}`).join(' ');
        const fromProof = sentences(proofSource)
          .map(statOf)
          .filter((stat): stat is { value: string; label: string } => !!stat);
        const strong = (value: string) =>
          /[$€£₹]|%|percent|\b(?:k|m|cr|crore|lakhs?|billion|million|trillion)\b/i.test(value) || value.includes(',') || Number(value.replace(/,/g, '')) >= 1000;
        const items = (fromProof.length >= 2 ? fromProof : profile.metrics.map((metric) => statOf(`${metric.label}: ${metric.value}`) ?? metric))
          .map((item) => {
            const value = clean(item.value);
            return { value, label: says(shortLabel(item.label, value)) };
          })
          /** A stat is a captioned figure, not a stray year, an ordinal, or the same number twice. */
          .filter((item, index, all) => item.label && /\d/.test(item.value) && !/^(?:19|20)\d{2}$/.test(item.value) && strong(item.value) && all.findIndex((other) => other.value === item.value) === index)
          .slice(0, 4);
        blocks.push({ kind: 'stats', variant: seed.chance(0.5) ? 'band' : 'grid', heading: heading('stats', 'By the numbers'), items });
        continue;
      }

      case 'features': {
        const items = gather(profile, 'offerings')
          .map((item) => ({ title: says(condense(item.title || item.body, 56)), body: condense(item.title ? item.body : '', 220), tags: item.tags }))
          /** A card named in lower case is the tail of a sentence; one named `Outcome` is a label, not a service. */
          .filter((item) => item.title && !/^\p{Ll}/u.test(item.title) && !SECTIONISH.test(item.title));
        blocks.push({
          kind: 'features',
          variant: theme.composition === 'bento' ? 'bento' : seed.chance(0.5) ? 'cards' : 'rows',
          heading: heading('features', 'What we do'),
          intro: condense(proseOf(profile, ['offerings']).replace(items[0]?.title ?? '\u0000', '').trim(), 200),
          items: items.slice(0, 9),
        });
        continue;
      }

      case 'process': {
        const steps = gather(profile, 'process')
          .map((item) => ({ title: says(clip(item.title || item.body, 56)), body: condense(item.title ? item.body : '', 200) }))
          .filter((step) => step.title);
        blocks.push({
          kind: 'process',
          variant: 'steps',
          heading: heading('process', 'How it works'),
          intro: condense(proseOf(profile, ['process']), 180),
          steps: steps.slice(0, 6),
        });
        continue;
      }

      case 'chapters': {
        const items = roleSections(profile, 'narrative').map((section) => ({
          title: clip(section.heading, 56),
          body: condense(section.paragraphs[0] ?? section.lines.join(' '), 320),
          tags: section.items.slice(0, 3).map((item) => clip(item.title || item.body, 28)).filter(Boolean),
        }));
        blocks.push({
          kind: 'chapters',
          variant: seed.chance(0.5) ? 'sticky' : 'stack',
          heading: heading('chapters', 'The story'),
          intro: '',
          items,
        });
        continue;
      }

      case 'offers': {
        const items = gather(profile, 'pricing')
          .map(offerOf)
          .filter((offer) => {
            if (!offer.name || (offer.price && offer.name === offer.price)) return false;
            /** A shouty label with no price is a heading the intake mistook for an entry. */
            if (!offer.price && !offer.detail && /^[A-ZĀ-Ū0-9\s&/,-]{3,}$/.test(offer.name)) return false;
            /** `Starters` and `Gear, files and delivery` are labels over a list, not lines a buyer can order. */
            if (!offer.price && !offer.detail) return false;
            return true;
          })
          .slice(0, 12);
        const priced = items.filter((item) => item.price);
        /** When the list has real prices to show, a heading with none (`What couples said`) is scaffolding, not an offer. */
        const rows = priced.length >= 2 ? priced : items;
        if (priced.length) priced[seed.int(priced.length)].featured = true;
        // Real prose only: a menu's leftover lines are logistics the contact block already carries.
        const pricingProse = roleSections(profile, 'pricing')
          .flatMap((section) => section.paragraphs)
          .join(' ')
          .trim();
        blocks.push({
          kind: 'offers',
          variant: profile.kind === 'restaurant' ? 'menu' : theme.composition === 'bento' ? 'cards' : 'rows',
          heading: heading('offers', profile.kind === 'restaurant' ? 'Menu' : 'Pricing'),
          intro: pricingProse.length > 60 ? condense(pricingProse, 180) : undefined,
          note: profile.prices.length ? `Prices from ${profile.prices[0]} to ${profile.prices[profile.prices.length - 1]}.` : undefined,
          items: rows.slice(0, 12),
        });
        continue;
      }

      case 'gallery': {
        const uploaded = profile.gallery.map((asset) => ({ src: asset.dataUrl, caption: condense(asset.name.replace(/\.[a-z]+$/i, ''), 48) }));
        const tiles = visuals.tiles.map((src, index) => ({ src, caption: condense(gather(profile, 'gallery')[index]?.title ?? `Piece ${index + 1}`, 48) }));
        blocks.push({
          kind: 'gallery',
          variant: uploaded.length > 4 ? 'masonry' : 'grid',
          heading: heading('gallery', 'Work'),
          intro: condense(proseOf(profile, ['gallery']), 180),
          items: (uploaded.length ? uploaded : tiles).slice(0, 9),
          generated: !uploaded.length,
        });
        continue;
      }

      case 'agenda': {
        /** A row can carry `09:15`, `9:15 am` or `08:30 – 09:15` as its clock. */
        const SPAN = /\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*(?:-|–|—|to)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?|\d{1,2}(?::\d{2})?\s*(?:am|pm)/i;
        const unspanned = (value: string) =>
          clean(value.replace(new RegExp(SPAN.source, 'gi'), '')).replace(/^[\s–—:]+|[\s–—:,]+$/g, '');
        const cellsOf = (value: string) => value.split('|').map(clean).filter((cell) => cell && cell !== '—' && cell !== '-');
        const rows = gather(profile, 'agenda').map((item) => {
          const cells = cellsOf(`${item.title} ${item.body}`.replace(/\s+/g, ' ').trim());
          const timeCell = cells.find((cell) => SPAN.test(cell));
          const time = clean(timeCell?.match(SPAN)?.[0] ?? '');
          const rest = cells.filter((cell) => cell !== timeCell).map(unspanned).filter(Boolean);
          const fallback = unspanned(`${item.title} ${item.body}`.replace(/\s+/g, ' ').trim());
          return { time, title: says(clip(rest[0] ?? fallback, 64)), body: condense(rest.slice(1).join(' · '), 160) };
        });

        /** A talk and its speaker can arrive as two rows; they are one slot. */
        const slots: { time: string; title: string; body: string }[] = [];
        for (const slot of rows) {
          const previous = slots[slots.length - 1];
          if (!slot.time && previous?.time) {
            previous.body = condense([previous.body, slot.title, slot.body].filter(Boolean).join(' · '), 160);
            continue;
          }
          if (slot.title) slots.push(slot);
        }

        const items = slots
          .filter((slot) => slot.title.length > 3)
          .filter((slot) => slot.time || slot.body)
          .filter((slot) => !(slot.time === '' && /^(?:time|when|session|speaker|who|what|slot|schedule|agenda|day|date|duration|track|room)(?:\s+\w+)?$/i.test(slot.title)))
          .slice(0, 12);
        blocks.push({ kind: 'agenda', variant: 'rail', heading: heading('agenda', 'Agenda'), intro: condense(proseOf(profile, ['agenda']), 180), items });
        continue;
      }

      case 'team': {
        blocks.push({
          kind: 'team',
          variant: 'cards',
          heading: heading('team', 'Team'),
          intro: condense(proseOf(profile, ['team']), 180),
          items: parsePeople(gather(profile, 'team')),
        });
        continue;
      }

      case 'testimonials': {
        /**
         * The section's own lines hold the quote and its signature in order; the
         * parsed rows may have folded one into the next. Rows are the fallback.
         */
        const fromLines = parseQuotes(linesOf(profile, 'testimonials'));
        const quotes = fromLines.length
          ? fromLines
          : parseQuotes(gather(profile, 'testimonials').map((item) => (item.title && item.body ? `${item.title} — ${item.body}` : item.title || item.body)));
        blocks.push({
          kind: 'testimonials',
          variant: quotes.length > 2 ? 'wall' : 'pair',
          heading: heading('testimonials', 'Kind words'),
          items: quotes.map((quote) => ({ quote: condense(quote.quote, 260), author: quote.author, role: quote.role })),
        });
        continue;
      }

      case 'faq': {
        blocks.push({ kind: 'faq', variant: 'accordion', heading: heading('faq', 'FAQ'), items: parseFaq(gather(profile, 'faq'), linesOf(profile, 'faq')) });
        continue;
      }

      case 'posts': {
        const items = gather(profile, 'posts')
          .map((item) => ({ title: says(condense(item.title || item.body, 72)), body: condense(item.title ? item.body : '', 220), meta: item.meta }))
          .filter((post) => post.title)
          .slice(0, 6);
        blocks.push({ kind: 'posts', variant: 'list', heading: heading('posts', 'Latest'), items });
        continue;
      }

      case 'skills': {
        blocks.push({
          kind: 'skills',
          variant: seed.chance(0.5) ? 'columns' : 'chips',
          heading: heading('skills', 'Toolkit'),
          intro: `${counted(profile.experience, 'role', 'roles')} and ${counted(profile.projects, 'project')} behind these.`,
          groups: profile.skills.map((group) => ({ name: group.group, items: group.items })),
        });
        continue;
      }

      case 'experience': {
        blocks.push({
          kind: 'experience',
          variant: seed.chance(0.5) ? 'timeline' : 'cards',
          heading: heading('experience', 'Experience'),
          entries: profile.experience.map((entry) => ({
            role: clip(entry.role, 60),
            org: clip(entry.org, 60),
            period: entry.period.replace(/\b(present|now|current)\b/i, 'Present'),
            location: entry.location,
            bullets: entry.bullets.map((bullet) => condense(bullet, 220)).filter(Boolean),
            stack: entry.stack?.slice(0, 8),
          })),
        });
        continue;
      }

      case 'projects': {
        blocks.push({
          kind: 'projects',
          variant: seed.chance(0.5) ? 'grid' : 'rows',
          heading: heading('projects', 'Selected work'),
          intro: `${counted(profile.projects, 'project')} named in the upload${profile.projects.some((p) => p.url) ? ', linked to what is live' : ''}.`,
          items: profile.projects.map((project) => ({
            name: clip(project.name, 52),
            blurb: condense(project.description || `${project.name} — ${project.tags.join(', ')}.`, 220),
            tags: project.tags.slice(0, 4),
            link: project.url,
          })),
        });
        continue;
      }

      case 'education': {
        blocks.push({
          kind: 'education',
          variant: 'stack',
          heading: heading('education', 'Education'),
          items: profile.education.map((entry) => ({
            award: condense(entry.award, 70),
            org: condense(entry.org, 70),
            period: entry.period,
            detail: entry.detail ? condense(entry.detail, 90) : undefined,
          })),
        });
        continue;
      }

      case 'cta': {
        /** A button that scrolls to a block that was dropped is worse than no button. */
        const target = profile.email ? `mailto:${profile.email}` : plan.blocks.includes('offers') ? '#offers' : (profile.links[0]?.href ?? '#top');
        blocks.push({
          kind: 'cta',
          variant: theme.heroLayout === 'centered' || theme.heroLayout === 'canvas' ? 'band' : 'card',
          heading: heading('cta', 'Next step'),
          body: condense(
            profile.kind === 'resume'
              ? 'Tell me what you are building — I reply to anything with a clear question and a real deadline.'
              : `Say hello and tell us what you need. ${profile.location ? `We are based in ${profile.location}.` : ''}`.trim(),
            220,
          ),
          button: { label: CTA_LABELS[profile.kind] ?? 'Get in touch', href: target },
        });
        continue;
      }

      case 'contact': {
        const place = [...new Set([profile.where, profile.location].filter((value): value is string => !!value))].join(' · ');
        const links = profile.links.filter((link) => !link.href.startsWith('mailto:') && link.href !== `https://${profile.email}`).slice(0, 6);
        blocks.push({
          kind: 'contact',
          variant: seed.chance(0.5) ? 'list' : 'panel',
          heading: heading('contact', 'Get in touch'),
          body: condense(`${plan.narrative} The fastest route is ${profile.email ?? links[0]?.label ?? 'the links below'}.`, 260),
          email: profile.email,
          phone: profile.phone,
          address: place ? condense(place, 90) : undefined,
          links,
          availability: profile.when && profile.when !== place ? clip(profile.when, 60) : undefined,
        });
        continue;
      }

      case 'footer': {
        blocks.push({
          kind: 'footer',
          variant: 'simple',
          note: `© ${new Date().getFullYear()} ${name}. Built from a single upload.`,
          nav: plan.nav,
        });
        continue;
      }

      default:
        continue;
    }
  }

  return blocks.filter(Boolean);
}

/** Metadata is the first thing a judge copies into a chat preview: no stray labels. */
function metaText(value: string, name = ''): string {
  let text = says(value) ?? '';
  text = text.replace(new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[—–:-]\\s*`, 'i'), '');
  text = text.replace(/^(overview|summary|about|details|introduction|table|rows|columns)\b\s*[—–:-]?\s*/i, '');
  return clean(text);
}

export function buildSeo(profile: ContentProfile, plan: SitePlan, blocks: Block[]): SeoMeta {
  const hero = blocks.find((block) => block.kind === 'hero');
  const skills = profile.skills.flatMap((group) => group.items).slice(0, 8);
  const subject = [...new Set([profile.name, ...profile.industries, ...plan.category.split('_'), ...skills])].filter(Boolean);
  const name = profile.name || profile.headline || 'A site';
  /** `Malgadi — Malgadi — Seed Deck` reads like a bug report, so a leading brand is lifted off before it is used as a tag. */
  const withoutBrand = (value: string) => {
    const at = value.toLowerCase().indexOf(name.toLowerCase());
    return at === 0 ? clean(value.slice(name.length)).replace(/^[\s—–:|,-]+/, '') : value;
  };
  const head = metaText(hero && hero.kind === 'hero' ? hero.headline : profile.headline, name);
  const blurb = metaText((hero && hero.kind === 'hero' ? hero.subheadline : profile.summary) || profile.summary, name);
  const distinct = head && head.toLowerCase() !== name.toLowerCase() ? withoutBrand(head) : '';
  /**
   * The title is a name and one phrase about it. A phrase that does not fit is
   * shortened to a clause that still reads out loud, and if even that is too
   * long it is dropped — a search result that ends mid-word looks broken.
   */
  const within = (value: string, budget: number) => {
    let phrase = '';
    for (const clause of value.split(/(?<=[,.—–;])\s+/)) {
      const next = `${phrase} ${clause}`.replace(/\s+/g, ' ').trim();
      if (next.length > budget) break;
      phrase = next;
    }
    return clean(phrase.replace(/[,;:.\s—–-]+$/, ''));
  };
  const budget = 60 - name.length - 3;
  const tag = budget >= 18 ? (distinct.length <= budget ? distinct : within(distinct, budget)) : '';
  const title = tag ? clip(`${name} — ${tag}`, 60) : clip(name, 60);
  /**
   * A description is the title's not-a-repeat twin: the first real sentence from
   * the upload that says something the name and headline do not. A sub-headline
   * that is only a date or a slogan is skipped rather than stretched to fit.
   */
  const sameAs = (value: string) => !!value && (value.toLowerCase() === title.toLowerCase() || title.toLowerCase().includes(value.toLowerCase()));
  const descriptions = [withoutBrand(blurb), ...sentences(proseOf(profile, ['summary', 'about', 'narrative'])).map(withoutBrand)]
    .map((value) => clean(value))
    .filter((value) => value.length >= 42 && !sameAs(value));
  const fallback = [name, distinct ? withoutBrand(distinct) : '', profile.location, profile.industries.length ? `Works in ${profile.industries.join(', ')}` : ''].filter(Boolean).join(' — ');
  const description = descriptions.length ? clip(descriptions[0], 152) : !sameAs(fallback) ? clip(fallback, 152) : clip(`${name} — ${plan.category.replace(/_/g, ' ')}`, 152);
  return {
    title,
    description,
    keywords: subject.map((word) => word.toLowerCase()).slice(0, 14),
    openGraph: {
      title: `${name} — ${plan.category.replace(/_/g, ' ')}`,
      description: clip(blurb || profile.headline, 144),
      type: profile.kind === 'resume' || profile.kind === 'personal' ? 'profile' : 'website',
    },
  };
}
