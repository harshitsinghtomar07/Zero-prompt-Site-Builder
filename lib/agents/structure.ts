import type { ContentItem, ContentSection, SectionRole } from '@/lib/types/profile';

/**
 * Structure discovery. Nothing here assumes a resume, a slide deck, or any
 * particular file type: it looks for the shapes humans use to divide a
 * document — headings, labels, bullets, and blank space — and then asks what
 * each block of text is *for*.
 */

const BULLET = /^\s*(?:[-*•◦‣·–—]|\d{1,2}[.)])\s+/;

const ROLE_LEXICON: { role: SectionRole; re: RegExp }[] = [
  { role: 'summary', re: /^(summary|objective|profile|professional\s+summary|about\s+(me|us|the\s+\w+)|who\s+(i|we)\s+(am|are)|intro(duction)?|tagline|bio)\b/i },
  { role: 'about', re: /^(about|who\s+(we|i)\s+are|the\s+story|our\s+story|why\s+(we|it|this)\s+exist|what\s+we\s+believe)\b/i },
  { role: 'experience', re: /^(work\s+|professional\s+|employment\s+|relevant\s+)?(experience|history|career|internships?)\b/i },
  { role: 'education', re: /^(education|academics?|qualifications?|degrees?|certifications?|licen[cs]es?|training)\b/i },
  { role: 'skills', re: /^(skills?|technical\s+skills|core\s+competencies|expertise|competencies|stack|tools|technolog(y|ies))\b/i },
  { role: 'offerings', re: /^(what\s+(we|i)\s+(do|offer|build|make)|services?|solutions?|offerings?|features?|products?|capabilities|what\s+you\s+get|why\s+(choose|us)|how\s+we\s+help|areas?|specialties)\b/i },
  { role: 'process', re: /^(how\s+it\s+works|how\s+(we|i)\s+work|the\s+process|our\s+approach|method(ology)?|steps?|workflow|journey|what\s+happens|engagement)\b/i },
  { role: 'pricing', re: /^(pricing|plans?|packages?|rates?|fees?|cost|menu|tickets?|catalog(ue)?|shop|products?\s*&\s*prices?|donate|donations?|give)\b/i },
  {
    role: 'pricing',
    re: /^(starters?|small\s+plates|appetisers?|appetizers?|entrees?|mains?|main\s+course|from\s+the\s+grill|soups?|salads?|sandwiches|pizzas?|pastas?|burgers?|currys?|curries|biryanis?|thalis?|dosas?|tiffins?|sides|snacks|combos?|platters?|specials?|chef'?s\s+specials?|desserts?|sweets?|beverages?|drinks?|coffees?|teas?|smoothies|wines?|beers?|cocktails?|mocktails?)\b/i,
  },
  { role: 'proof', re: /^(traction|results?|impact|outcomes?|achievements?|by\s+the\s+numbers|the\s+numbers|metrics?|milestones?|growth|proof|stats?|case\s+study\s+results?)\b/i },
  { role: 'team', re: /^(team|our\s+team|people|founders?|leadership|who\s+we\s+are|the\s+crew|staff|board(?!er)|advisors?|speakers?|mentors?|instructors?|chefs?)\b/i },
  { role: 'testimonials', re: /^(testimonials?|kind\s+words|reviews?|feedback|what\s+(clients?|customers?|people|guests?)\s+(say|love)|praise|press|as\s+seen\s+in|loved\s+by)\b/i },
  { role: 'faq', re: /^(faqs?\b|frequently\s+asked|questions?|q\s*&\s*a|help|good\s+to\s+know)\b/i },
  { role: 'agenda', re: /^(agenda|schedule|timetable|programme|program|sessions?|line\s?up|the\s+day|day\s+plan)\b/i },
  { role: 'gallery', re: /^(gallery|photos?|pictures?|our\s+work|work\s+gallery|visuals?|portfolio\s+gallery|the\s+work)\b/i },
  { role: 'posts', re: /^(recent|latest|from\s+the|more)?\s*(blog|posts?|articles?|writing|journal|news(letter)?|essays?|dispatches?)\b/i },
  { role: 'contact', re: /^(contact|reach|get\s+in\s+touch|find\s+(me|us)|visit\s+us|connect|enquir(y|ies)|book(ing)?|reservations?|location|hours)\b/i },
  { role: 'languages', re: /^(languages?|spoken)\b/i },
  { role: 'interests', re: /^(interests?|hobbies|activities|outside\s+(of\s+)?work)\b/i },
  {
    role: 'narrative',
    re: /^(the\s+)?(problem|solution|market\s+(size|opportunity)|opportunity|business\s+model|revenue|competition|competitive|advantage|moat|vision|mission|values|the\s+ask|ask|funding|raise(d|ing)?|why\s+now|go\s?to\s?market|gtm|risk|use\s+of\s+funds|the\s+team|our\s+story)\b/i,
  },
];

const IGNORED = /^(page|slide|footer|header|confidential|copyright|all\s+rights|skip\s+to|menu\s*\{|navigation)/i;

/** Rules, banners and intake bookkeeping: layout, not content. */
const FURNITURE = /^(?:[=\-*_~·—–]{3,}\s*$|(?:#\s*)?columns?:\s|[-=]{3,}\s*\S+\s*[-=]{3,}$)/i;

/** A key written for a machine rather than a reader: `products[0].name`, `kiln_note`, `a.b.c`. */
const CODE_PATH = /^(?:[a-z0-9_$]+(?:\.\w+){2,}|[a-z0-9_$]+(?:_[a-z0-9]+)+|\w+\[\d+\][.\w[\]-]*)\s*:\s*/i;

function stripMarkers(line: string): string {
  return line
    .replace(/^\s*#{1,6}\s+/, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/`/g, '')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 $2')
    .replace(CODE_PATH, '')
    .replace(/\s*-{2,}\s*/g, ' — ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** A title only earns a heading when a human would read it out loud. */
function isReadable(text: string): boolean {
  if (!text || /^[\s.,;:|_—–\-·*#'"“”()[\]{}…-]+$/.test(text)) return false;
  if (/^[a-z][a-z0-9_]*(?:[._-][a-z0-9_]+)*$/.test(text) && text.includes('_')) return false;
  return /[\p{L}]/u.test(text);
}

function titleCased(text: string): boolean {
  const words = text.split(/\s+/);
  return words.every((word) => /^[A-ZÀ-Ý][\w'’&.-]*$/.test(word) || word.length <= 2);
}

export function labelFor(heading: string): SectionRole {
  const clean = stripMarkers(heading).replace(/[:|]+$/, '').trim();
  const found = ROLE_LEXICON.find((entry) => entry.re.test(clean));
  return found?.role ?? 'other';
}

interface HeadedLine {
  index: number;
  text: string;
  role: SectionRole;
  /** Markdown depth, or 1 for headings the markup never graded. */
  level: number;
  /** Only markup-declared headings can own a group; a guessed one must not swallow the next section. */
  marked: boolean;
}

/**
 * A line becomes a heading when it is marked up as one (Markdown, trailing
 * colon, slide title), when it names a known section, or when it is short,
 * title-cased, and introduces a run of detail.
 */
function findHeadings(lines: string[]): HeadedLine[] {
  const found: HeadedLine[] = [];
  const limit = Math.min(lines.length, 4000);

  for (let i = 0; i < limit; i++) {
    const raw = lines[i];
    const text = stripMarkers(raw);
    if (!text || text.length > 62 || IGNORED.test(text) || FURNITURE.test(text) || !isReadable(text)) continue;
    if (/^---*\s*$/.test(raw.trim()) || /^[-=]{3,}$/.test(raw.trim())) continue;
    if (/\S+@\S+\.\S+/.test(text) || /https?:\/\//i.test(text)) continue;

    const words = text.split(/\s+/);
    const marked = /^\s*#{1,6}\s+\S/.test(raw);
    const level = marked ? (raw.match(/^\s*(#{1,6})/)?.[1].length ?? 1) : 1;
    /** `License: MIT` is a field line, not a heading; a lexicon label only heads prose (`Course: two weeks of knives`). */
    const fieldValue = /^\w[\w &'/-]{0,28}:\s+(.+)$/.exec(text);
    const labelled =
      !/[.,;!?]$/.test(text) &&
      !text.includes(',') &&
      words.length <= 6 &&
      labelFor(text) !== 'other' &&
      (!fieldValue || fieldValue[1].split(/\s+/).length >= 3);
    /** A banner the lexicon recognises is a heading even when it carries a comma. */
    const shoutyLabel = !/[a-z]/.test(text) && !/[.!?]$/.test(text) && words.length <= 6 && /[A-ZĀ-Ū]{3}/.test(text) && labelFor(text) !== 'other';
    const colonLed = /^[A-Z][\w&/' -]{2,44}:$/.test(text);
    const numbered = /^\d{1,2}[.)]\s+[A-Z]/.test(text) && words.length <= 8 && !/[.,;]$/.test(text);

    let structural = false;
    if (!marked && !labelled && !colonLed && !numbered && i > 6 && words.length <= 4 && text.length <= 34 && !text.includes(',')) {
      const next = lines.slice(i + 1, i + 3).find((line) => line.trim());
      const previousBlank = i === 0 || !lines[i - 1]?.trim();
      const introducesDetail = !!next && (BULLET.test(next) || next.trim().length > text.length * 1.6);
      const plainLabel = (text === text.toUpperCase() && /[A-Z]{3}/.test(text)) || titleCased(text);
      structural = previousBlank && introducesDetail && plainLabel && !/[.,;:!?]$/.test(text);
    }

    if (marked || labelled || colonLed || numbered || structural || shoutyLabel) {
      found.push({ index: i, text: text.replace(/:$/, ''), role: labelFor(text), level, marked });
    }
    if (found.length >= 60) break;
  }
  return found;
}

/** A number wearing a currency: `Rs. 1,28,000`, `₹92k`, `$1,400 per night`. */
const AMOUNT =
  /(?:(?:[₹$€£]\s?)|(?:\b(?:rs|inr|usd|eur|gbp)\b\.?\s?))\d[\d,]*(?:\.\d+)?(?:\s*(?:k|m|cr|crore|lakh|lakhs)\b)?(?:\s*(?:\/|per\s+)(?:mo|month|yr|year|hr|hour|guest|person|night|session|class|plate|day|sq ?ft|sqft))?/i;
/** A price can also wear an explicit label instead of a currency: `Price: 120`, `Fee: 500`. */
const LABELLED_PRICE = `\\b(?:price|cost|mrp|fee|rate|charges?)\\s*[:=]\\s*(?:${AMOUNT.source}|\\d[\\d,]*(?:\\.\\d+)?)`;
const PRICE = new RegExp(`${LABELLED_PRICE}|${AMOUNT.source}|\\b\\d[\\d,]*(?:\\.\\d+)?\\s*(?:%|off)\\b`, 'i');
/** `Rs. 3,95,000 to Rs. 5,40,000` is one price, not two. */
const RANGE = new RegExp(`${AMOUNT.source}\\s*(?:to|/|[-–—])\\s*${AMOUNT.source}`, 'i');
/** A menu row prices itself without a currency: `Cold Coffee 90`, `Sundae * 249`, `Lemon Tea 109 (crushed ice & mint)`. */
const BARE_PRICE = /(?:^|[*•·|]|\s)\s?(\d{2,6}(?:\.\d{1,2})?)\s*(?:\([^)\d]{2,60}\))?\s*$/;
/** `Plot 14, Velachery Main Road, Chennai 600042`, `Springfield, IL 62704` — comma clauses closing on a post code. */
function addressLike(text: string): boolean {
  return text.split(',').length >= 2 && /\b\d{5,6}\s*$/.test(text) && /[A-Za-z]/.test(text);
}
/** A trailing number is a date, not a price, when the row names a day. */
const DATEISH_PLAIN = /\b(?:jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?\b|\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}[/.]\d{1,2}[/.]\d{2,4}\b/i;
const DATEISH = /\b(?:\d{1,2}(?:st|nd|rd|th)?\s+)?(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|[a-z]{3})\.?\s+\d{1,2}?(?:,?\s+\d{4})?\b|\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}[/.]\d{1,2}[/.]\d{2,4}\b|\b(?:mon|tue|wed|thu|fri|sat|sun)(?:day)?\b/i;
const TIMEISH = /\b(?:\d{1,2}(?::\d{2})?\s*(?:am|pm)|\d{2}:\d{2})\b/i;

/**
 * `Name: X` / `Fee: Y` — YAML, XML and email headers all arrive as runs of
 * field lines, and the reader above would shatter them (the key becomes the
 * title, the next record bleeds into the body). Consecutive field lines are
 * regrouped into one row per record, shaped like the JSON renderer's output.
 */
const KEYVAL = /^\s*(?:[-*•]|\d{1,2}[.)])?\s*([A-Za-z][\w &'/-]{0,24}):\s+(.{2,})$/;
const RECORD_NAME_KEY = /^(?:item|title|name|service|product|dish|course|package|plan|offering)$/i;
const RECORD_PRICE_KEY = /^(?:price|fee|cost|rate|charges?|mrp)$/i;
/** Contact and envelope fields stay in the raw text, where the fact finders read them. */
const RECORD_DROP_KEY = /^(?:phone|tel(?:ephone)?|mobile|email|e-?mail|address|venue|location|where|from|to|sender|date|hours?|timing|timings?|website|url|link)$/i;
const CURRENCY_LED = /^(?:[₹$€£]|\b(?:rs|inr|usd|eur|gbp)\b\.?\s)/i;

function renderKeyvalRecords(pairs: { key: string; value: string }[]): string[] {
  const records: { title: string; price: string; bodies: string[] }[] = [];
  let seen = new Set<string>();
  const startNew = () => {
    const fresh: { title: string; price: string; bodies: string[] } = { title: '', price: '', bodies: [] };
    records.push(fresh);
    seen = new Set();
    return fresh;
  };
  let record = startNew();
  for (const { key, value } of pairs) {
    if (RECORD_DROP_KEY.test(key)) continue;
    const lowered = key.toLowerCase();
    if ((RECORD_NAME_KEY.test(key) && record.title) || seen.has(lowered)) record = startNew();
    if (RECORD_PRICE_KEY.test(key)) {
      if (record.price) record = startNew();
      record.price = value;
    } else if (RECORD_NAME_KEY.test(key) && !record.title) {
      record.title = value;
    } else {
      record.bodies.push(value);
    }
    seen.add(lowered);
  }
  return records
    .map((record) => {
      const tail = record.bodies.join('. ');
      const price = record.price ? (CURRENCY_LED.test(record.price) ? record.price : `Price: ${record.price}`) : '';
      return ([record.title, tail].filter(Boolean).join(' — ') + (price ? ` ${price}` : '')).trim();
    })
    .filter(Boolean);
}

/** Regroups consecutive `Key: Value` lines into one row per record; everything else passes through. */
function collapseKeyvalRuns(lines: string[]): string[] {
  const out: string[] = [];
  let run: { key: string; value: string }[] = [];
  const flush = () => {
    if (run.length >= 2) out.push(...renderKeyvalRecords(run));
    else for (const pair of run) out.push(`${pair.key}: ${pair.value}`);
    run = [];
  };
  for (const line of lines) {
    const pair = KEYVAL.exec(line);
    if (pair && pair[2].trim()) run.push({ key: pair[1].trim(), value: pair[2].trim() });
    else {
      flush();
      out.push(line);
    }
  }
  flush();
  return out;
}

function tagsFrom(text: string): string[] {
  const bracketed = [...text.matchAll(/[([]([^)[\]]{2,60})[)\]]/g)]
    .flatMap((match) => match[1].split(/[,;/|]/))
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 1 && tag.length < 28 && !/\d{5,}/.test(tag));
  return [...new Set(bracketed)].slice(0, 5);
}

/** The price a row is charging, extended across `to` when the row quotes a range. */
function priceOf(text: string): string | undefined {
  const at = text.search(PRICE);
  if (at < 0) {
    /** Menus priced in bare numbers: the trailing figure is the price unless the row is a date or a postal address. */
    const bare = BARE_PRICE.exec(text);
    if (bare && !DATEISH_PLAIN.test(text) && !TIMEISH.test(text) && !addressLike(text)) return bare[1];
    return undefined;
  }
  const ranged = new RegExp(`^(?:${RANGE.source})`, 'i').exec(text.slice(at));
  return (ranged?.[0] ?? text.slice(at).match(PRICE)?.[0] ?? '').replace(/\s+/g, ' ').trim() || undefined;
}

/** The price sentence a row does not need twice, because the badge already carries it. */
function priceSentence(text: string): string {
  const lead = /^(.{2,90}?[.!?])\s+(?=[A-Z₹$€£]|\b(?:rs|inr)\b)/.exec(text)?.[0];
  if (!lead || !PRICE.test(lead)) return '';
  return lead.replace(new RegExp(PRICE.source, 'gi'), '').replace(/[^a-z0-9]/gi, '').length <= 45 ? lead : '';
}

function splitTitleBody(text: string, numbered = false): { title: string; body: string } {
  return promoteSentenceTitle(rowFrom(text, numbered));
}

/** `Step 2 — Concept and layout, two options…` — the enumerator is bookkeeping, the sentence is the title. */
function promoteSentenceTitle(pair: { title: string; body: string }): { title: string; body: string } {
  if (!/^(?:step|phase|stage|part|unit|week|day|lesson|module|item|no\.?)\s*\d{1,2}$/i.test(pair.title)) return pair;
  const sentence = /^(.{6,46}?[.!?])\s+/.exec(pair.body);
  if (sentence?.[1]) return { title: sentence[1].replace(/[.!?]$/, '').trim(), body: pair.body.slice(sentence[0].length).trim() };
  const clause = /^(.{6,46}?),\s+/.exec(pair.body);
  return clause?.[1] ? { title: clause[1].trim(), body: pair.body.slice(clause[1].length).replace(/^\s*,\s*/, ' ').trim() } : pair;
}

function rowFrom(text: string, numbered: boolean): { title: string; body: string } {
  /** `Question? Answer` is one row in a FAQ table — the mark ends the title. */
  const question = text.match(/^([^?!]{6,140}\?)\s*[-–—:|]?\s*(.{6,})$/);
  if (question) return { title: question[1].trim(), body: question[2].trim() };
  /** `2. The Full Story (3 to 5 days). Rs. 3,95,000. Everything from…` — a numbered row with a price is titled. */
  if (numbered && PRICE.test(text)) {
    const first = /^(.{6,58}?)[.!?]\s+(?=[A-Z₹$€£]|\b(?:rs|inr)\b)/.exec(text);
    if (first?.[1]) {
      const after = text.slice(first[0].length).trim();
      const badge = priceSentence(after);
      return { title: first[1].trim(), body: badge ? after.slice(badge.length).trim() : after };
    }
  }
  const colon = text.match(/^([^:|—–-]{2,46}?)\s*[:|—–-]\s+(.{4,})$/);
  /** Backslashes and pipes in the head are OCR noise, not a name before its description. */
  if (colon && !/[\\{}<>|]/.test(colon[1])) return { title: colon[1].trim(), body: colon[2].trim() };
  const emDash = text.match(/^([^—–]{2,46}?)\s*[—–-]\s+(.{4,})$/);
  if (emDash && !/[\\{}<>|]/.test(emDash[1])) return { title: emDash[1].trim(), body: emDash[2].trim() };
  /**
   * `Cold Coffee 159`, `Sundae * 249`, `Lemon Tea 109 (crushed ice & mint)` —
   * a priced menu row names its dish: the trailing price splits off, and what
   * trails the price becomes the description. Whatever sits before a dash is
   * noise from a scanner, so the name is the last dash-separated segment.
   */
  const priced = priceOf(text);
  if (priced) {
    const trailing = new RegExp(
      `^(.{2,60}?)\\s*(?:[*•·|]|[-–—])?\\s*${priced.replace(/[.*+?^${}()|[\\]\\\\]/g, '$\\&')}\\s*(?:[.,;])?\\s*(.*)$`,
      'i',
    ).exec(text);
    if (trailing) {
      const head = (trailing[1].trim().split(/\s+[—–-]\s+/).pop()?.trim() ?? '').replace(/[,;:]$/, '');
      const description = (trailing[2] ?? '').replace(/^\((.*)\)$/, '$1').trim();
      if (head.length >= 2) return { title: head, body: description };
    }
    /** `Property title check, five working days, Rs. 15,000` — the first clause names the row. */
    const clause = /^(.{4,46}?),\s+/.exec(text);
    if (clause && text.indexOf(priced) >= clause[0].length) {
      return { title: clause[1].trim(), body: text.slice(clause[0].length).trim() };
    }
  }
  /** `1) Sea-facing apartment, Panampilly Nagar, 1,850 sq ft` — a numbered case study is named by its first clause. */
  if (numbered && text.length > 46) {
    const clause = /^(.{6,44}?),\s+/.exec(text);
    if (clause?.[1]) return { title: clause[1].trim(), body: text.slice(clause[0].length).trim() };
  }
  if (text.length <= 46 && !/[.,;]$/.test(text)) return { title: text, body: '' };
  return { title: '', body: text };
}

/** A line shaped like `Mythili Ramaswamy` — two or three capitalised words, nothing else. */
function personShaped(value: string): boolean {
  return /^[A-Z][\p{L}'’.-]*(?:\s+[A-Z][\p{L}'’.-]*){1,3}$/u.test(value.trim());
}

/** A cell that is nothing but a number, optionally with a currency on the front. */
const CELL_AMOUNT = /^(?:[₹$€£]\s?\d[\d,]*(?:\.\d+)?|\b(?:rs|inr|usd|eur|gbp)\b\.?\s?\d[\d,]*(?:\.\d+)?|\d[\d,]*(?:\.\d+)?)$/i;

/** Flags, not content: a table's `Veg` and `Popular` columns say yes and no. */
const JUNK_CELL = /^(?:yes|no|n\/?a|none|tbd|in stock|out of stock|available|unavailable|veg(?:etarian)?|non-?veg(?:etarian)?|vegan|gluten[- ]free|contains?|[\d.]+(?:%|off)?)$/i;

/** A body of `A | B | C` rows is a table that was pasted in, whatever its heading is called. */
function isColumnar(body: string[]): boolean {
  const rows = body.filter((line) => line.includes(' | '));
  if (rows.length < 3) return false;
  const priced = rows.filter((line) => line.split(/\s*\|\s*/).some((cell) => CELL_AMOUNT.test(cell.trim())));
  return priced.length / rows.length >= 0.6;
}

/**
 * One row of a pasted table keeps its column order: a category, then the name,
 * then the long description, then the money. The name is the last short cell
 * before the prose, because the column before it is the group it belongs to.
 */
function rowFromCells(cells: string[]): ContentItem {
  const money = cells.find((cell) => CELL_AMOUNT.test(cell)) ?? '';
  const rest = cells.filter((cell) => cell !== money && !JUNK_CELL.test(cell) && !/^\W+$/.test(cell));
  const longAt = rest.findIndex((cell) => cell.length > 46);
  const head = longAt < 0 ? [] : rest.slice(0, longAt);
  const title = head.length ? (head[head.length - 1] ?? '') : (rest[0] ?? '');
  const tail = head.length ? rest.slice(longAt === -1 ? 1 : longAt) : rest.slice(1);
  return {
    title,
    body: tail.join(' · '),
    meta: money || undefined,
    tags: [...new Set([...head.slice(0, -1), ...tagsFrom(`${title} ${tail.join(' ')}`)])].slice(0, 5),
    url: cells.join(' ').match(/https?:\/\/\S+/)?.[0],
  };
}

/** Turns a run of body lines into titled items without losing the original words. */
export function parseItems(input: string[], columnar = false): ContentItem[] {
  const lines = collapseKeyvalRuns(input);
  const items: ContentItem[] = [];
  let current: ContentItem | null = null;
  let tableRows = 0;

  const push = () => {
    if (current && (current.title || current.body)) items.push(current);
    current = null;
  };

  for (const raw of lines) {
    const isBullet = BULLET.test(raw);
    const numbered = /\d/.test(BULLET.exec(raw)?.[0] ?? '');
    const text = stripMarkers(raw.replace(BULLET, ''));
    if (FURNITURE.test(raw.trim())) {
      /** A rule closes the entry above it — ASCII documents use them as paragraph breaks. */
      push();
      continue;
    }
    if (!text) {
      if (current && !current.body) push();
      continue;
    }

    const url = text.match(/https?:\/\/\S+/)?.[0];
    const price = priceOf(text);

    /**
     * `THREE JOBS, WITH NUMBERS` is a banner over the rows under it. Kept as an
     * entry it reads on the page as a service nobody offers.
     */
    if (!price && /^[^a-z]{3,46}$/.test(text) && /[A-ZĀ-Ū]{3}/.test(text)) {
      push();
      continue;
    }
    /** `UPI: vachan@ybl`, `Acc 4120 7788 3310` — a receipt line never belongs on a card. */
    if (!price && BOOKKEEPING.test(text) && (/^[a-z][\w &/.-]{1,20}\s*[:=]/i.test(text) || /\d[\d\s]{7,}\d/i.test(text) || /@/.test(text))) {
      push();
      continue;
    }
    /** `Plot 14, Velachery Main Road, Chennai 600042` is a postal address, not a thing on offer; contact picks it up from the raw text. */
    if (!price && addressLike(text)) {
      push();
      continue;
    }

    /** A pasted table is read by its columns, not by guessing where its titles are. */
    if (columnar && !isBullet && text.includes(' | ')) {
      const cells = text.split(/\s*\|\s*/).map((cell) => cell.trim()).filter(Boolean);
      if (cells.length >= 3) {
        const row = rowFromCells(cells);
        const headerish = !row.meta && cells.every((cell) => cell.length <= 24);
        tableRows++;
        if (headerish && tableRows === 1) {
          push();
          continue;
        }
        push();
        current = row;
        continue;
      }
    }
    const { title, body } = splitTitleBody(text.replace(/https?:\/\/\S+/, '').replace(/\s{2,}/g, ' ').trim(), numbered);
    const usable = isReadable(title) ? title : '';

    /** `Aditya Sawant` then `Staff Engineer, Razorpay` — the second line describes the first. */
    if (title && !body && current?.title && !current.body && !isBullet && personShaped(current.title) && !personShaped(title)) {
      current.body = text;
      if (price && !current.meta) current.meta = price;
      continue;
    }

    /**
     * Hard-wrapped prose: a line that does not begin a thought and follows one
     * that never finished it is the same sentence. Plain-text uploads arrive this
     * way constantly, and treating the fragment as a new entry invents sections.
     */
    if (!isBullet && !numbered && title && current?.body && !price && !/[.!?:;)\]]$/.test(current.body)) {
      current.body = `${current.body} ${text}`.replace(/\s+/g, ' ').trim();
      if (price && !current.meta) current.meta = price;
      if (url && !current.url) current.url = url;
      continue;
    }

    if (title) {
      push();
      current = { title: usable, body: usable ? body || '' : text, meta: price, tags: tagsFrom(text), url };
      continue;
    }

    if (!current) {
      current = { title: '', body: text, meta: price, tags: tagsFrom(text), url };
      continue;
    }
    if (body) current.body = `${current.body} ${body}`.trim();
    if (price && !current.meta) current.meta = price;
    if (url && !current.url) current.url = url;
    if (isBullet && current.body.length > 40 && items.length < 40) push();
  }
  push();

  /** `Student`, blank line, `₹700 College ID proof…` — a label and the line under it are one entry. */
  const paired: ContentItem[] = [];
  for (const item of items) {
    const previous = paired[paired.length - 1];
    if (previous && previous.title && !previous.body && !previous.meta && !item.title) {
      paired[paired.length - 1] = {
        ...previous,
        body: item.body,
        meta: item.meta,
        tags: [...new Set([...previous.tags, ...item.tags])].slice(0, 5),
        url: previous.url ?? item.url,
      };
      continue;
    }
    paired.push(item);
  }

  return paired
    .map((item) => ({ ...item, body: item.body.replace(/\s+/g, ' ').trim(), title: item.title.replace(/\s+/g, ' ').trim() }))
    .filter((item) => item.title || item.body.length > 2)
    .slice(0, 40);
}

/**
 * A declared subheading and its rows folded into the group above it. Its title is
 * already known, so a long heading like `### Two years of deadlifts, in an
 * accountant's honest numbers` is not left to be guessed from line shape.
 */
function foldItems(head: string, body: string[]): ContentItem[] {
  const items = parseItems(body, isColumnar(body));
  const title = stripMarkers(head).replace(/\s+/g, ' ').trim();
  if (!title) return items;
  const [first, ...rest] = items;
  if (!first) return [{ title, body: '', tags: tagsFrom(title) }];
  if (!first.title) return [{ ...first, title }, ...rest];
  return [{ ...first, title, body: `${first.title} ${first.body}`.trim() }, ...rest];
}

/** Keys that hold logistics, not a story: they never belong in a paragraph. */
const BOOKKEEPING = /^(address|studio address|office|phone|tel|mobile|whatsapp|e-?mail|hours|timings?|opening hours|website|fax|pin|pincode|gps|map|coordinates?|upi|bank|acc(?:ount)?(?:\s*(?:no|number|id))?|ifsc|swift|micr|gst|cin|uin|reg\.?|registration|pan|aadar?no?|contact)\b/i;

/**
 * A line that splits into a name and a detail is a row the card block will
 * already show. Repeating it as a paragraph reads like a broken page.
 */
function isRow(line: string): boolean {
  if (BULLET.test(line) || line.includes(' | ')) return true;
  const { title, body } = splitTitleBody(stripMarkers(line), false);
  return !!title && body.length > 20;
}

function paragraphsFrom(lines: string[]): string[] {
  return lines
    .map((line) => stripMarkers(line))
    .filter((line) => !BOOKKEEPING.test(line.trim()))
    .map((line) => {
      /** A key dump reads better as prose: `Tagline: Hand-thrown…` becomes the sentence itself. */
      const labelled = /^[A-Z][A-Za-z ]{2,18}:\s+(?=[A-Z])/.exec(line);
      return labelled && line.length - labelled[0].length > 40 ? line.slice(labelled[0].length) : line;
    })
    .filter(
      (line) =>
        line.length > 40 &&
        !isRow(line) &&
        !BULLET.test(line) &&
        line.split(/\s+/).length > 6 &&
        !/\S+@\S+\.\S+/.test(line) &&
        !/https?:\/\//i.test(line) &&
        !/\+\d[\d\s-]{8,}/.test(line) &&
        !/\b(?:19|20)\d{2}\b.*\b(?:19|20)\d{2}\b/.test(line),
    )
    .slice(0, 6);
}

/**
 * A heading the lexicon does not recognise ("## Starters", "## Products") still
 * says what it holds: rows with times are an agenda, rows with prices are a
 * price list, rows named after people are a team, rows with titles are an
 * offering list. That keeps menus, schedules and catalogues on the same path as CVs.
 */
function inferRole(items: ContentItem[]): SectionRole {
  const titled = items.filter((item) => item.title && isReadable(item.title));
  if (titled.length < 2) return 'other';

  const share = (rows: ContentItem[]) => rows.length >= 3 && rows.length / titled.length >= 0.5;
  const timed = titled.filter((item) => TIMEISH.test(`${item.title} ${item.body}`));
  const priced = titled.filter((item) => item.meta);
  const dated = titled.filter((item) => DATEISH.test(`${item.title} ${item.body}`));
  const named = titled.filter((item) => /^[A-Z][\w'’.-]*(?:\s+[A-Z][\w'’.-]*){1,3}$/.test(item.title));

  if (share(timed)) return 'agenda';
  if (share(priced)) return 'pricing';
  if (share(dated)) return 'posts';
  if (share(named) && priced.length === 0) return 'team';
  if (titled.length >= 3) return 'offerings';
  const prose = items.filter((item) => item.body.length > 90);
  if (prose.length) return 'about';
  return 'other';
}

/** Splits any document into labelled sections. Preamble text becomes a summary. */
export function discoverStructure(text: string): ContentSection[] {
  const lines = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    /** Rulers are layout, not content — tested on the raw line, because a ruled line strips down to one dash. */
    .filter((line) => !/^---\s*[\w .-]+\s---$/.test(line.trim()) && !FURNITURE.test(line.trim()));
  const headings = findHeadings(lines);
  const sections: ContentSection[] = [];

  const preambleEnd = headings.length ? headings[0].index : lines.length;
  const preamble = lines.slice(0, preambleEnd).filter((line) => line.trim());
  if (preamble.length) {
    const items = parseItems(preamble, isColumnar(preamble));
    const priced = items.filter((item) => item.meta).length;
    /** A heading-less upload of priced rows (NDJSON records, a bare catalogue) is a price list, not a summary. */
    const priceList = headings.length === 0 && items.length >= 3 && priced / items.length >= 0.5;
    sections.push({
      heading: priceList ? 'On offer' : 'Overview',
      role: priceList ? 'pricing' : 'summary',
      items,
      paragraphs: paragraphsFrom(preamble),
      lines: preamble.map((line) => line.trim()),
    });
  }

  /** A named group ("Recent posts", "Starters") keeps collecting its own entries. */
  let openGroup: ContentSection | null = null;
  let openLevel = 0;
  let openMarked = false;

  headings.forEach((heading, position) => {
    const start = heading.index + 1;
    const end = position + 1 < headings.length ? headings[position + 1].index : lines.length;
    const body = lines.slice(start, end).filter((line) => line.trim());
    const columnar = isColumnar(body);
    const items = parseItems(body, columnar);
    const paragraphs = paragraphsFrom(body);

    /**
     * A heading the markup never graded is only a guess. When the rows underneath
     * it are priced or timed, the rows outvote the guess.
     */
    const inferred = inferRole(items);
    const role =
      heading.role === 'other'
        ? columnar
          ? 'pricing'
          : inferred
        : !heading.marked && (inferred === 'pricing' || inferred === 'agenda' || inferred === 'posts')
          ? inferred
          : heading.role;

    /**
     * A deeper heading belongs to the group above it — `## Experience` holding
     * `### Role at company` — but only while it does not name a different kind
     * of thing. A dated `### Post` under a prose `## About the author` is its own
     * section, and a label the markup never graded is not proof of depth at all.
     */
    const nested = heading.marked && openMarked && heading.level > openLevel;
    const sameFamily = inferred === 'other' || inferred === openGroup?.role || heading.role === openGroup?.role;
    if (
      openGroup &&
      nested &&
      sameFamily &&
      heading.role !== 'contact' &&
      heading.role !== 'summary' &&
      openGroup.role !== 'summary'
    ) {
      openGroup.items = [...openGroup.items, ...foldItems(heading.text, body)];
      openGroup.paragraphs = [...openGroup.paragraphs, ...paragraphs];
      openGroup.lines = [...openGroup.lines, ...body.map((line) => line.trim())];
      return;
    }

    const section: ContentSection = {
      heading: heading.text,
      role,
      items,
      paragraphs,
      lines: body.map((line) => line.trim()),
    };
    sections.push(section);
    const ownsGroup = role !== 'other';
    openGroup = ownsGroup ? section : null;
    openLevel = heading.level;
    openMarked = heading.marked;
  });

  for (const section of sections) {
    section.items = section.items.slice(0, 40);
    section.paragraphs = section.paragraphs.slice(0, 8);
    section.lines = section.lines.slice(0, 140);
  }

  /** A heading that only ever held other headings, and was not claimed by them. */
  return sections.filter((section) => section.items.length > 0 || section.paragraphs.length > 0);
}

/** Sections that describe the same thing are merged so a site gets one services block. */
export function mergeByRole(sections: ContentSection[]): Map<SectionRole, ContentSection[]> {
  const merged = new Map<SectionRole, ContentSection[]>();
  for (const section of sections) {
    const group = merged.get(section.role) ?? [];
    group.push(section);
    merged.set(section.role, group);
  }
  return merged;
}

export function textOf(sections: ContentSection[], role: SectionRole): string {
  return sections
    .filter((section) => section.role === role)
    .map((section) => [section.heading, ...section.paragraphs, ...section.lines].join(' '))
    .join(' ')
    .toLowerCase();
}

export const DATE_PATTERN = DATEISH;
export const TIME_PATTERN = TIMEISH;
export const PRICE_PATTERN = PRICE;
