/** Normal intake contract: Windows newlines first, then collapse trailing spaces, cap blank lines, trim. */
export function clean(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Named entities a hand-written or exported page actually uses. Anything absent
 * here is left exactly as it arrived: guessing at an unknown `&na;`-style token
 * would invent text the file does not contain.
 */
const NAMED_ENTITIES: Record<string, string> = {
  nbsp: ' ', shy: '',
  mdash: '—', ndash: '–', minusb: '−', minus: '−',
  rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', quotes: '“',
  hellip: '…', middot: '·', bull: '•', dot: '⋅',
  copy: '©', reg: '®', trade: '™', deg: '°', prime: '′', Prime: '″',
  times: '×', divide: '÷', sect: '§', para: '¶', dagger: '†', Dagger: '‡',
  euro: '€', pound: '£', yen: '¥', curren: '¤', cent: '¢',
  frac12: '½', frac14: '¼', frac34: '¾', permil: '‰',
  sup1: '¹', sup2: '²', sup3: '³', micro: 'µ', ohm: 'Ω',
  laquo: '«', raquo: '»', lsaquo: '‹', rsaquo: '›',
  iexcl: '¡', iquest: '¿',
  agrave: 'à', aacute: 'á', acirc: 'â', atilde: 'ã', auml: 'ä', aring: 'å',
  egrave: 'è', eacute: 'é', ecirc: 'ê', euml: 'ë',
  igrave: 'ì', iacute: 'í', icirc: 'î', iuml: 'ï',
  ntilde: 'ñ', ograve: 'ò', oacute: 'ó', ocirc: 'ô', otilde: 'õ', ouml: 'ö', oslash: 'ø',
  ugrave: 'ù', uacute: 'ú', ucirc: 'û', uuml: 'ü',
  yacute: 'ý', yuml: 'ÿ', ccedil: 'ç', szlig: 'ß', thorn: 'þ', eth: 'ð',
  Alpha: 'Α', Beta: 'Β', Gamma: 'Γ', Delta: 'Δ', Sigma: 'Σ', Omega: 'Ω', pi: 'π',
};

function decodeEntities(input: string): string {
  const numeric = input
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex: string) => fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_m, dec: string) => fromCodePoint(parseInt(dec, 10)));

  // `&amp;` is resolved last so a double-encoded `&amp;mdash;` still reads as `&mdash;`.
  const named = numeric.replace(/&([A-Za-z][A-Za-z0-9]{1,9});/g, (match, name: string) => {
    if (name === 'amp') return match;
    const replacement = NAMED_ENTITIES[name] ?? NAMED_ENTITIES[name.toLowerCase()];
    return typeof replacement === 'string' ? replacement : match;
  });

  return named
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&');
}

function fromCodePoint(code: number): string {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return '';
  try {
    return String.fromCodePoint(code);
  } catch {
    return '';
  }
}

/** Short lines that are page chrome, not content: cookie banners, skip links, icon labels. */
const NAV_CRUFT =
  /^(skip to|cookie|we use cookies|by using (this|our) site|accept( all)? cookies|reject( all)? cookies|decline|consent|privacy polic|terms of|all rights reserved|copyright|©|follow (us|me) on|find us on|share (this|on)|back to top|scroll (down|up)|close|open menu|main menu|navigation|sign in|log ?in|javascript is (required|not)|your browser)/i;

function isNavCruft(line: string): boolean {
  const text = line.replace(/^#{1,6}\s+/, '').replace(/^-\s+/, '').trim();
  if (!/[\p{L}\p{N}]/u.test(text)) return true;
  if (text.length > 48) return false;
  return NAV_CRUFT.test(text);
}

/** One readable line per block: headings keep their markers, table rows keep their cells. */
function tidyHtmlText(text: string): string {
  const lines: string[] = [];

  for (const raw of text.split('\n')) {
    let line = raw.replace(/[ \t]+/g, ' ').trim();
    if (!line) continue;

    const heading = /^(#{1,6}) (.+)$/.exec(line);
    if (heading) {
      const title = heading[2].replace(/\s*\|\s*/g, ' · ').replace(/\s+/g, ' ').replace(/^[\s:.\-–—|]+|[\s.|]+$/g, '').trim();
      if (!title) continue;
      line = `${heading[1]} ${title}`;
    } else if (line.includes('|')) {
      const cells = line.split('|').map((cell) => cell.trim()).filter((cell) => cell !== '');
      if (!cells.length) continue;
      line = cells.length === 2 ? `${cells[0]} — ${cells[1]}` : cells.join(' | ');
    }

    if (isNavCruft(line)) continue;
    lines.push(line);
  }

  return clean(lines.join('\n'));
}

export function extractHtml(source: string): string {
  const withoutScript = source
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<template[\s\S]*?<\/template>/gi, ' ')
    // The document title duplicates the page's own <h1>; keeping it out of the body
    // stops the brand line from appearing twice in the generated site.
    .replace(/<title[\s\S]*?<\/title>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');

  const spaced = withoutScript
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<h([1-6])(?:\s[^>]*)?>/gi, (_m, level: string) => `\n${'#'.repeat(Number(level))} `)
    .replace(/<\/(h[1-6]|p|li|ul|ol|div|tr|table|thead|tbody|section|article|header|footer|main|aside|nav|blockquote|pre|dd|dt|hgroup)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<\/?(td|th)[^>]*>/gi, ' | ');

  return tidyHtmlText(decodeEntities(spaced.replace(/<[^>]+>/g, ' ')));
}

export function extractRtf(source: string): string {
  let text = source.replace(/\r\n?/g, '\n');

  // Ignorable groups ({\* ...}) can nest, so peel them with a brace counter rather than a flat regex.
  text = dropIgnorableGroups(text);

  // Bookkeeping tables and embedded pictures — their contents are numbers and hex, never prose.
  text = dropNamedGroups(text, /^(?:font|color|colour|style|list|info|generator|latent|data|theme|shp|pict|object|xmlns|mmu|bkmk)/i);

  text = text
    .replace(/\\par[d]?[ ]?/gi, '\n')
    .replace(/\\line[ ]?/gi, '\n')
    .replace(/\\tab[ ]?/gi, '\t')
    .replace(/\\'[0-9a-f]{2}/gi, (_m, hex: string) => String.fromCharCode(parseInt(hex, 16)));

  text = text.replace(/\\u(-?\d+)\s?\d?/g, (_m, dec: string) => fromCodePoint(parseInt(dec, 10)));
  text = text.replace(/\\[a-z]+-?\d*[ ]?/gi, '');
  text = text.replace(/\\([{}\\])/g, '$1');
  text = text.replace(/[{}]/g, '');

  return clean(text);
}

function dropIgnorableGroups(source: string): string {
  return dropGroupsWhere(source, (head) => head.startsWith('\\*'));
}

/** Removes whole brace groups whose first control word is in `names`. */
function dropNamedGroups(source: string, names: RegExp): string {
  return dropGroupsWhere(source, (head) => names.test(head.slice(1)));
}

function dropGroupsWhere(source: string, isDrop: (groupHead: string) => boolean): string {
  let result = '';
  let i = 0;
  while (i < source.length) {
    if (source[i] === '{' && isDrop(source.slice(i + 1, i + 14))) {
      let depth = 0;
      while (i < source.length) {
        if (source[i] === '{') depth++;
        else if (source[i] === '}') depth--;
        i++;
        if (depth === 0) break;
      }
      continue;
    }
    result += source[i];
    i++;
  }
  return result;
}

function detectDelimiter(lines: string[]): string {
  let best = ',';
  let bestScore = -1;
  for (const delimiter of [',', ';', '\t', '|']) {
    const counts = lines.map((line) => line.split(delimiter).length - 1);
    const total = counts.reduce((sum, n) => sum + n, 0);
    if (total > bestScore) {
      bestScore = total;
      best = delimiter;
    }
  }
  return best;
}

/** RFC4180-ish: embedded delimiters and newlines survive only inside double quotes. */
function parseDelimited(source: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += char;
      continue;
    }
    if (char === '"' && field === '') quoted = true;
    else if (char === delimiter) {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') field += char;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ''));
}

/* ------------------------------------------------------------------ *
 * Shared label heuristics. Delimited tables, spreadsheets and JSON
 * records all get shaped with the same column/role vocabulary, so the
 * structure agent sees "Title — body. ₹480 [Veg]" notes rather than a
 * field dump.
 * ------------------------------------------------------------------ */

const TITLE_HEADER = /^(dish|name|item|product|title|event|session|topic|talk|service|course[_ -]name|product[_ -]name|full[_ -]name)\b/i;
const BODY_HEADER = /^(description|details?|desc|about|summary|notes?|note|blurb|content|body|text|overview)\b/i;
const PRICE_HEADER = /^(price|cost|rate|amount|fare|fee|fees|total|mrp|charges?|charge|value)\b|[₹$€£¥]|\b(inr|usd|eur|gbp|aud|cad|chf|rs|rs\.)\b/i;
const CATEGORY_HEADER = /^(course|courses|category|categories|categor(y|ie)|type|group|collection|section|kind|class|department|dept|chapter|block)\b/i;

const BOOLEAN_WORDS = new Set([
  'yes', 'no', 'true', 'false', 'y', 'n', 't', 'f', 'x', '✓', '✗', '1', '0', 'n/a', 'na', 'null', 'nan', '',
]);
const TRUTHY_WORDS = new Set(['yes', 'true', 'y', 't', '1', '✓', 'in stock', 'in-stock', 'available', 'stocked']);

const CURRENCY_TOKENS: [RegExp, string][] = [
  [/₹|\binr\b|\brs\b|rupee/i, '₹'],
  [/\busd\b|dollar/i, '$'],
  [/\beur\b|euro/i, '€'],
  [/\bgbp\b|pound|sterling/i, '£'],
  [/\bjpy\b|yen/i, '¥'],
];

function oneLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function sentence(text: string): string {
  return /[.!?…:;]$/.test(text) ? text : `${text}.`;
}

function currencySymbol(hint: string): string {
  if (!hint) return '';
  if (hint === 'Rs') return '₹';
  for (const [pattern, symbol] of CURRENCY_TOKENS) if (pattern.test(hint)) return symbol;
  return '';
}

/** A cell that already carries its currency is left alone; otherwise the header says which symbol to use. */
function priceCell(value: string, hint: string): string {
  const text = oneLine(value);
  if (!text) return '';
  if (/[₹$€£¥]|\b(inr|usd|eur|gbp|rs)\b/i.test(text)) return text;
  const symbol = currencySymbol(hint);
  return symbol ? `${symbol}${text}` : `${hint ? `${hint}: ` : ''}${text}`;
}

function splitListValues(value: string): string[] {
  return value
    .split(/[,;|/]|\s{2,}/)
    .map((part) => oneLine(part))
    .filter((part) => part.length > 1 && part.length < 28);
}

interface ColumnProfile {
  index: number;
  header: string;
  values: string[];
  filled: number;
  distinct: number;
  avgLength: number;
  maxLength: number;
  numericRatio: number;
  currencyRatio: number;
  booleanish: boolean;
  blockRepeats: number;
}

function profileColumns(headers: string[], data: string[][]): ColumnProfile[] {
  return headers.map((header, index) => {
    const values = data.map((row) => oneLine(row[index] ?? ''));
    const nonEmpty = values.filter((value) => value !== '');
    const numeric = nonEmpty.filter((value) => /^[₹$€£¥]?\s?-?\d[\d,.]*\s?(k|m|cr|crore|lakh|lakhs|%)?$/i.test(value));
    const withCurrency = numeric.filter((value) => /[₹$€£¥]|\b(inr|usd|eur|gbp|rs)\b/i.test(value));
    const blockRepeats = values.reduce(
      (count, value, position) => (position > 0 && value !== '' && value === values[position - 1] ? count + 1 : count),
      0,
    );
    return {
      index,
      header: oneLine(header),
      values,
      filled: nonEmpty.length,
      distinct: new Set(nonEmpty).size,
      avgLength: nonEmpty.length ? Math.round(nonEmpty.reduce((sum, value) => sum + value.length, 0) / nonEmpty.length) : 0,
      maxLength: nonEmpty.reduce((max, value) => Math.max(max, value.length), 0),
      numericRatio: nonEmpty.length ? numeric.length / nonEmpty.length : 0,
      currencyRatio: nonEmpty.length ? withCurrency.length / nonEmpty.length : 0,
      booleanish:
        nonEmpty.length > 0 &&
        nonEmpty.every((value) => BOOLEAN_WORDS.has(value.toLowerCase())) &&
        nonEmpty.some((value) => /^(yes|no|true|false)$/i.test(value)) &&
        !PRICE_HEADER.test(header),
      blockRepeats,
    };
  });
}

/** The first row is a header when it reads like labels, not like another record. */
function looksLikeHeader(cells: string[], data: string[][]): boolean {
  if (!data.length) return false;
  const labels = cells.map((cell) => oneLine(cell));
  const filled = labels.filter((label) => label !== '');
  if (filled.length < Math.min(cells.length, 2) || filled.length < Math.ceil(cells.length * 0.7)) return false;
  if (filled.some((label) => label.length > 40)) return false;

  const labelLike = filled.filter((label) => /^[A-Za-zÀ-ſ][\w &/'().+#-]{0,39}$/i.test(label));
  if (labelLike.length < Math.ceil(filled.length * 0.7)) return false;
  if (new Set(labelLike.map((label) => label.toLowerCase())).size < Math.ceil(labelLike.length * 0.7)) return false;
  // A row of mostly numbers is a record, not a header.
  const numeric = filled.filter((label) => /^-?[\d.,]+%?$/.test(label)).length;
  return numeric < Math.ceil(filled.length / 2);
}

interface TableShape {
  title: number;
  body: number;
  price: number;
  category: number;
  flags: number[];
  rest: number[];
}

function shapeOf(profiles: ColumnProfile[]): TableShape {
  const active = profiles.filter((column) => column.filled > 0);
  const claimed = new Set<number>();
  const unused = () => active.filter((column) => !claimed.has(column.index));
  const byHeader = (pattern: RegExp, extra?: (column: ColumnProfile) => boolean) => {
    const found = unused().find((column) => pattern.test(column.header) && (!extra || extra(column)));
    if (!found) return -1;
    claimed.add(found.index);
    return found.index;
  };
  const best = (score: (column: ColumnProfile) => number, minScore: number, filter?: (column: ColumnProfile) => boolean) => {
    let chosen = -1;
    let top = minScore;
    for (const column of unused()) {
      if (column.numericRatio >= 0.8 && column.currencyRatio < 0.5) continue;
      if (filter && !filter(column)) continue;
      const value = score(column);
      if (value > top) {
        top = value;
        chosen = column.index;
      }
    }
    if (chosen >= 0) claimed.add(chosen);
    return chosen;
  };

  // Flag columns (Yes/No, true/false) are never body text — they become [Header] tags.
  const flags = active.filter((column) => column.booleanish).map((column) => column.index);
  flags.forEach((index) => claimed.add(index));

  let price = byHeader(PRICE_HEADER, (column) => column.numericRatio >= 0.4 || column.currencyRatio >= 0.3);
  if (price < 0) price = best((column) => column.currencyRatio, 0.49, (column) => column.currencyRatio >= 0.5);

  // A category column either says so in its header or repeats the same value in
  // contiguous blocks down the file ("Starter" on six rows in a row).
  let category = byHeader(CATEGORY_HEADER, (column) => column.distinct >= 2 && column.distinct < column.filled);
  if (category < 0) {
    category = best(
      (column) => (column.distinct <= Math.max(2, Math.ceil(column.filled * 0.6)) ? column.blockRepeats : 0),
      0,
      (column) => column.maxLength <= 40,
    );
  }

  let title = byHeader(TITLE_HEADER, (column) => column.maxLength <= 70);
  if (title < 0) title = best((column) => column.distinct, 0, (column) => column.maxLength <= 70 && column.avgLength <= 48);
  if (title < 0 && category >= 0) title = category;

  let body = byHeader(BODY_HEADER);
  if (body < 0) body = best((column) => column.avgLength, 30, (column) => column.maxLength > 40);

  const rest = active.map((column) => column.index).filter((index) => !claimed.has(index));
  return { title, body, price, category, flags, rest };
}

function usableColumnCount(profiles: ColumnProfile[]): number {
  return profiles.filter((column) => column.filled > 0).length;
}

/**
 * Binary-ish means "not prose": control bytes, a very long run with no spaces
 * (base64, hashes, data URIs) or a value too big to be a sentence. Real
 * descriptions stay intact however long they are — intake never rewrites them.
 */
function isBinaryish(value: string): boolean {
  if (value.length > 4000) return true;
  let controls = 0;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 0x09 || (code >= 0x0e && code <= 0x1f)) controls++;
  }
  if (controls > 0) return true;
  return value.length > 300 && !/\s/.test(value);
}

/** No header or a single column: every row becomes one flat readable line. */
function flatRows(rows: string[][]): string {
  return clean(
    rows
      .map((cells) =>
        cells
          .map((cell) => oneLine(cell))
          .filter((cell) => cell !== '')
          .join(' — '),
      )
      .filter((line) => line !== '')
      .join('\n'),
  );
}

function rowToLine(row: string[], headers: string[], profiles: ColumnProfile[], shape: TableShape): string {
  const value = (index: number) => (index >= 0 ? oneLine(row[index] ?? '') : '');
  const title = value(shape.title);
  const body = value(shape.body);
  const extras: string[] = [];
  const tags: string[] = [];

  for (const index of shape.flags) {
    const cell = oneLine(row[index] ?? '');
    if (!cell || !TRUTHY_WORDS.has(cell.toLowerCase())) continue;
    const label = oneLine(headers[index]);
    if (label.length > 1 && label.length < 28) tags.push(label);
  }

  for (const index of shape.rest) {
    const cell = value(index);
    if (!cell) continue;
    const header = oneLine(headers[index]);
    if (profiles[index].numericRatio >= 0.8) {
      const label = oneLine(`${header} ${cell}`);
      if (label.length < 26) tags.push(label);
      else extras.push(`${header}: ${cell}`);
      continue;
    }
    // Short leftovers read as chips; long prose is kept verbatim in the body.
    if (cell.length <= 30 && cell.split(' ').length <= 5) {
      const parts = splitListValues(cell);
      if (parts.length) tags.push(...parts.slice(0, 2));
      else tags.push(cell);
      continue;
    }
    extras.push(`${header}: ${cell}`);
  }

  const head = title || body;
  const tail = [body, ...extras].filter((part) => part !== '' && part !== head);
  const priced = priceCell(value(shape.price), shape.price >= 0 ? profiles[shape.price].header : '');
  if (!head && !tail.length) return '';

  const text = tail.length ? `${head} — ${tail.map((part) => sentence(part)).join(' ')}` : head;
  const unique = [...new Set(tags.filter((tag) => tag.length > 1 && tag.length < 28 && tag !== head))].slice(0, 4);
  return oneLine(`${text} ${priced} ${unique.map((tag) => `[${tag}]`).join(' ')}`);
}

/**
 * RFC4180 rows shaped into hand-written notes: a `## Category` heading whenever
 * the category value changes, then `Title — body. Price [tags]` per row in file
 * order. Shared with the XLSX reader so spreadsheets read the same way.
 */
export function renderTabularRows(rows: string[][]): string {
  const headerCells = rows[0] ?? [];
  const data = rows.slice(1);
  const headers = headerCells.map((cell, index) => oneLine(cell) || `column ${index + 1}`);
  const profiles = profileColumns(headers, data);

  if (data.length === 0 || !looksLikeHeader(headerCells, data)) return flatRows(rows);
  if (usableColumnCount(profiles) < 2) return flatRows(data.length ? data : rows);

  const shape = shapeOf(profiles);
  if (shape.title < 0 && shape.body < 0) return flatRows(data);

  const out: string[] = [];
  let category = '';
  for (const row of data) {
    const value = shape.category >= 0 ? oneLine(row[shape.category] ?? '') : '';
    if (value && value !== category) {
      category = value;
      out.push('', `## ${sentenceless(category)}`);
    }
    const line = rowToLine(row, headers, profiles, shape);
    if (line) out.push(line);
  }
  return clean(out.join('\n'));
}

function sentenceless(text: string): string {
  return text.replace(/[.!?…:;]+$/, '').trim();
}

export function extractDelimited(source: string, format: 'csv' | 'tsv'): string {
  const normalized = source.replace(/\r\n?/g, '\n');
  const firstLines = normalized.split('\n').filter((line) => line.trim()).slice(0, 5);
  const delimiter = format === 'tsv' ? '\t' : detectDelimiter(firstLines);
  return renderTabularRows(parseDelimited(normalized, delimiter));
}

const NOISE_KEYS = new Set(['id', 'url', 'version']);

/** Schema/format structure words — bookkeeping in any document tree, never site copy. */
const SYSTEM_KEYS = new Set([
  'schema', 'comment', 'anchor', 'id', 'ref', 'definitions', 'defs', 'properties',
  'required', 'additionalproperties', 'patternproperties', 'propertynames', 'dependencies',
  'oneof', 'anyof', 'allof', 'not', 'if', 'then', 'else', 'switch', 'const', 'enum',
  'examples', 'format', 'default', 'minimum', 'maximum', 'exclusiveminimum', 'exclusivemaximum',
  'minlength', 'maxlength', 'minitems', 'maxitems', 'mincontains', 'maxcontains',
  'minproperties', 'maxproperties', 'multipleof', 'uniqueitems', 'contentencoding',
  'contentmediatype', 'deprecated', 'readonly', 'writeonly',
]);

/** Top-of-file package-manifest sections (npm-style): machine wiring, never site copy. */
const MANIFEST_KEYS = new Set([
  'scripts', 'devdependencies', 'peerdependencies', 'optionaldependencies', 'dependencies',
  'engines', 'packagemanager', 'main', 'module', 'unpkg', 'jsdelivr', 'exports', 'bin',
  'files', 'types', 'typings', 'sideeffects', 'browserslist', 'publishconfig', 'workspaces',
  'resolutions', 'overrides', 'husky', 'lint-staged', 'commitlint', 'simple-git-hooks',
  'pnpm', 'yarn', 'npm', 'funding', 'readme', 'man', 'libc', 'private', 'repository', 'bugs',
]);

/** Field names whose value is wiring even when the value itself reads like text. */
const TECHNICAL_KEY =
  /(?:^|[_\s-])(url|uri|host|hostname|endpoint|path|dir|directory|commit|sha|hash|token|secret|uuid|guid|build|version|env|region|zone|replica|replicas|port|timeout|retr(?:y|ies)|ttl|bucket|etag|checksum|fingerprint|target|sourcemap|minify|chunk|runtime|arch|cpu|node|python|jdk)$|^(?:api|cdn|db|internal|admin|notification|alert|webhook|sender|no-?reply)[_.-]/i;

/**
 * Photo-analysis vocabulary (ImageMagick identify, EXIF dumps, screenshot
 * metadata): the file describes an image rather than carrying anyone's words.
 * Generic words (depth, quality, format, type) are deliberately not here.
 */
const IMAGE_META_KEYS = new Set([
  'colorspace', 'endianness', 'channeldepth', 'basedepth', 'imagestatistics', 'channelstatistics',
  'pagegeometry', 'tilegeometry', 'renderingintent', 'chromaticity', 'interlace', 'transparentcolor',
  'mattecolor', 'bordercolor', 'backgroundcolor', 'gamma', 'entropy', 'kurtosis', 'skewness',
  'exif', 'xmp', 'iptc', 'gps', 'dpi', 'filesize', 'numberpixels', 'pixelspersecond', 'pixels',
  'tainted', 'orientation', 'mimetype', 'mime', 'xresolution', 'yresolution', 'resolutionunit',
  'exposuretime', 'fnumber', 'focallength', 'whitebalance', 'aperture', 'photometric', 'samplingfactor',
]);

/** `jpeg:colorspace`, `sampling-factor`, `channelDepth` → one comparable form. */
function imageMetaKey(key: string): string {
  return key.toLowerCase().replace(/^.*[:.$]/, '').replace(/[^a-z0-9]/g, '');
}

const SCHEMA_TYPE_NAMES = new Set(['object', 'array', 'string', 'number', 'integer', 'boolean', 'null', 'nil']);

const SEMVER = /^[~^>=<\s]*v?\d+(?:\.\d+){1,3}(?:[-+][\w.+-]+)?$/;
const PKG_SPEC = /^[\w@/-]+@\d+(?:\.\d+){1,3}$/;
const PATHISH = /^(?:\.{1,2}\/|~\/|[\w@~-]*[a-z@~-][\w@~-]*\/[\w@.~/-]*$|\.{1,2}$|[\w@~-]+\.(?:js|mjs|cjs|jsx|tsx?|json|css|scss|html?|md|png|jpe?g|gif|svg|ico|webp|woff2?|ttf|otf|wasm|ya?ml|map|lock|pdf)$)/i;
const COMMANDISH = /(?:^|\s)(?:&&|\|\||\|)(?:\s|$)|^(?:npx|npm|node|yarn|pnpm|python3?|pip3?|cargo|docker|git|bash|sh|make|tsc|vite|eslint|vitest|jest|next|curl)\b/i;
const STAMPISH = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/;
const HEXISH = /^[0-9a-f]{16,}$/i;
const CODEISH = /^[a-z][a-z0-9_]*\d[a-z0-9_]*$/i;

/**
 * Machine-shaped scalar values: versions, file paths, shell commands, hashes,
 * timestamps and code tokens. Bare domains and URLs are deliberately excluded
 * so contact links survive ("instagram.com/mrittikaclay" is content).
 */
function isMachineValue(text: string): boolean {
  const value = text.trim();
  if (!value || value.length > 300) return false;
  if (SEMVER.test(value) || PKG_SPEC.test(value) || STAMPISH.test(value) || HEXISH.test(value)) return true;
  if (PATHISH.test(value) || COMMANDISH.test(value) || CODEISH.test(value)) return true;
  if (/^(?:true|false|null|nil|undefined)$/i.test(value)) return true;
  return false;
}

function isRegexish(value: string): boolean {
  return !/\s/.test(value) && /[\\^$()*+?[\]{}|]/.test(value) && value.length > 3;
}

/** A key whose scalar value is bookkeeping in a document tree (not inside a record). */
function isSystemEntry(key: string, value: string): boolean {
  const lowered = key.toLowerCase().replace(/^[$@]/, '');
  if (NOISE_KEYS.has(lowered) || SYSTEM_KEYS.has(lowered)) return true;
  if (IMAGE_META_KEYS.has(imageMetaKey(key))) return true;
  if (lowered === 'type' && SCHEMA_TYPE_NAMES.has(value.toLowerCase())) return true;
  if (lowered === 'pattern' && isRegexish(value)) return true;
  if (TECHNICAL_KEY.test(key)) return true;
  return isMachineValue(value);
}

/** Scalar leaves beneath a value, so dropping a subtree reports honest counts. */
function countLeaves(value: unknown): number {
  if (value === null || value === undefined || typeof value !== 'object') return 1;
  if (Array.isArray(value)) return value.reduce((sum: number, item) => sum + countLeaves(item), 0);
  return Object.values(value).reduce((sum: number, child) => sum + countLeaves(child), 0);
}

/** What a structured walk kept versus left out, for the intake observation. */
interface StructStats {
  machine: number;
  prose: boolean;
  phrases: boolean;
  recordArrays: number;
  /** Distinct photo-analysis keys seen; many of them means the file describes an image. */
  imageMeta: number;
}

/* ------------------------------------------------------------------ *
 * JSON: records shaped with the same vocabulary as the table reader.
 * ------------------------------------------------------------------ */

const RECORD_TITLE = /^(title|name|dish|item|product|service|event|session|topic|talk|heading|label|full[_ -]?name|short[_ -]?name)$/i;
const RECORD_QUESTION = /^(q|question|faq|query)$/i;
const RECORD_ANSWER = /^(a|answer|reply|response)$/i;
const RECORD_BODY = /^(description|desc|body|text|details?|detail|summary|about|notes?|content|blurb|story|review|overview|bio)$/i;
const RECORD_PRICE = /^(price|mrp|amount|cost|rate|fare|fee|total|charge|charges|value)$/i;
const RECORD_RATING = /^(rating|stars|score)$/i;
const RECORD_AUTHOR = /^(author|reviewer|customer|client|name|user|by|person)$/i;
const RECORD_TAG = /^(material|category|categories|type|types|tags?|cuisine|collection|section|diet|dietary|features?|size|colour|color|style|genre|format|availability|status|level|difficulty|spice|language|languages|area|areas|audience|occasion|brand|skill|skills|tech|technolog(y|ies)|tool|tools|keyword|keywords|course|group)$/i;
const RECORD_DOCUMENT_NAME = /^(shop|store|brand|business|company|restaurant|cafe|coffee|event|site|page|venue|organisation|organization|outlet|project|team)?[_ -]?(name|title)$/i;

const KEY_ACRONYMS = new Set(['faq', 'faqs', 'api', 'apis', 'gstin', 'cin', 'pdf', 'png', 'jpg', 'svg', 'html', 'ui', 'ux', 'seo', 'gst', 'pos', 'aws', 'ceo', 'cto', 'cfo', 'coo', 'vp', 'it', 'uk', 'us', 'eu', 'nri', 'dob', 'tod']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRecordArray(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0 && value.filter((item) => isRecord(item)).length >= Math.ceil(value.length * 0.6);
}

function titleCaseKey(key: string): string {
  const bare = key.replace(/[-_\s]+/g, ' ').trim();
  if (!bare) return 'Item';
  const spaced = bare.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/\s+/g, ' ').trim();
  return spaced
    .split(' ')
    .map((word) => (KEY_ACRONYMS.has(word.toLowerCase()) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()))
    .join(' ');
}

const MAX_LINES = 400;
const MAX_DEPTH = 6;

function emit(lines: string[], text: string): void {
  if (lines.length < MAX_LINES && text.trim()) lines.push(text);
}

function emitSection(lines: string[], label: string): void {
  if (lines.length >= MAX_LINES) return;
  lines.push('', `## ${sentenceless(label)}`);
}

function rootCurrency(value: unknown): string {
  if (!isRecord(value)) return '';
  for (const [key, child] of Object.entries(value)) {
    if (/^(currency|currency_code|money|price_unit)$/i.test(key) && typeof child !== 'object') return String(child);
    if (/^(currency|currency_code)$/i.test(key) && isRecord(child)) return rootCurrency(child);
  }
  return '';
}

const RECORD_RATING_SCALE = /^(max[_ -]?(rating|stars)|rating[_ -]?(max|scale)|scale|out[_ -]?of|total[_ -]?stars)$/i;

/** One record of an array of objects: `Title — body. Price [tags]`. */
function renderRecord(
  lines: string[],
  record: Record<string, unknown>,
  depth: number,
  currency: string,
  stats: StructStats,
): void {
  if (lines.length >= MAX_LINES || depth > MAX_DEPTH) return;

  const keys = Object.keys(record).filter((key) => !NOISE_KEYS.has(key.toLowerCase()));
  const scalarOf = (key: string): string => {
    const value = record[key];
    if (value === null || value === undefined || typeof value === 'object') return '';
    const text = oneLine(String(value));
    return text && !isBinaryish(text) ? text : '';
  };
  const ratingKey = keys.find((key) => RECORD_RATING.test(key) && scalarOf(key) !== '');
  const titleKey = keys.find((key) => RECORD_TITLE.test(key) || RECORD_QUESTION.test(key));

  let title = '';
  let author = '';
  let rating = '';
  let scale = '';
  let priceValue = '';
  let priceLabel = '';
  const bodies: string[] = [];
  const extras: string[] = [];
  const tags: string[] = [];
  const nested: [string, unknown][] = [];

  for (const key of keys) {
    const value = record[key];
    if (value === null || value === undefined) continue;
    const label = titleCaseKey(key);

    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        const items = value
          .filter((item) => item !== null && typeof item !== 'object')
          .map((item) => oneLine(String(item)))
          .filter((item) => item !== '' && !isBinaryish(item) && !isMachineValue(item));
        if (items.length && items.length === value.length) {
          if (items.every((item) => item.length < 28) && (RECORD_TAG.test(key) || items.length > 1)) tags.push(...items);
          else pushFieldText(extras, tags, label, items.join(', '));
          continue;
        }
      }
      nested.push([key, value]);
      continue;
    }

    const text = oneLine(String(value));
    if (!text || isBinaryish(text)) continue;

    if (key === ratingKey) {
      rating = text;
    } else if (RECORD_RATING_SCALE.test(key)) {
      scale = text;
    } else if (RECORD_PRICE.test(key)) {
      priceValue = text;
      priceLabel = label;
    } else if (key === titleKey) {
      title = title || text;
    } else if (RECORD_AUTHOR.test(key) && ratingKey && key !== titleKey) {
      author = author || text;
    } else if (RECORD_ANSWER.test(key) || RECORD_BODY.test(key)) {
      bodies.push(text);
    } else if (typeof value === 'boolean') {
      if (value) tags.push(label);
    } else if (RECORD_TAG.test(key) && text.length <= 40 && splitListValues(text).length) {
      tags.push(...splitListValues(text));
    } else if (IMAGE_META_KEYS.has(imageMetaKey(key))) {
      if (stats) stats.machine += 1;
    } else if (isMachineValue(text) || TECHNICAL_KEY.test(key)) {
      if (stats) stats.machine += 1;
    } else {
      pushFieldText(extras, tags, label, text);
      if (stats && text.length >= 60 && /\s/.test(text)) stats.prose = true;
    }
  }

  // A review reads as `Author (5/5) — text`; a product keeps its own name as the title.
  if (author && title && title !== author) bodies.unshift(title);
  const named = author || title;
  const head = named && ratingKey ? `${named} (${rating}/${scale || '5'})` : named;
  const tailText = [...bodies, ...extras].map((part) => sentence(part)).join(' ');
  const priced = priceValue ? priceCell(priceValue, currency || priceLabel) : '';

  if (head || tailText) {
    const base = head && tailText ? `${head} — ${tailText}` : head || tailText;
    const unique = [...new Set(tags.filter((tag) => tag.length > 1 && tag.length < 28 && tag !== head))].slice(0, 4);
    emit(lines, oneLine(`${base} ${priced} ${unique.map((tag) => `[${tag}]`).join(' ')}`));
  }

  for (const [key, value] of nested) walkKey(lines, key, value, depth + 1, currency, stats);
}

/**
 * A list of records. When every record repeats the same name/title value (an
 * export that stamps the shop or brand on each row), that value is hoisted out
 * once so the items themselves carry the interesting words.
 */
function renderRecordArray(
  lines: string[],
  records: Record<string, unknown>[],
  depth: number,
  currency: string,
  stats: StructStats,
): void {
  stats.recordArrays += 1;
  let hoistKey: string | undefined;
  if (depth <= 1 && records.length > 1) {
    for (const key of Object.keys(records[0])) {
      if (!(RECORD_TITLE.test(key) || RECORD_DOCUMENT_NAME.test(key))) continue;
      const first = records[0][key];
      if (typeof first !== 'string' || first.length < 3 || first.length > 60 || isMachineValue(first)) continue;
      if (records.every((record) => record[key] === first)) {
        hoistKey = key;
        break;
      }
    }
  }
  if (hoistKey) emit(lines, String(records[0][hoistKey]));
  for (const record of records) {
    if (!hoistKey) {
      renderRecord(lines, record, depth, currency, stats);
      continue;
    }
    const rest = { ...record };
    delete rest[hoistKey];
    renderRecord(lines, rest, depth, currency, stats);
  }
}

/** Short leftovers become chips; anything that reads like prose keeps its label and its words. */
function pushFieldText(extras: string[], tags: string[], label: string, text: string): void {
  if (text.length <= 30 && text.split(' ').length <= 5 && !/\d{5,}/.test(text)) {
    if (/^[\d.,%]+\s?(k|cr|lakh)?$/i.test(text)) {
      const chip = oneLine(`${label} ${text}`);
      if (chip.length < 26) tags.push(chip);
      else extras.push(`${label}: ${text}`);
      return;
    }
    const parts = splitListValues(text);
    if (parts.length) tags.push(...parts.slice(0, 2));
    else tags.push(text);
    return;
  }
  extras.push(`${label}: ${text}`);
}

function walkKey(
  lines: string[],
  key: string,
  value: unknown,
  depth: number,
  currency: string,
  stats: StructStats,
): void {
  if (lines.length >= MAX_LINES || depth > MAX_DEPTH) return;
  if (value === null || value === undefined) return;
  const lowered = key.toLowerCase();

  // Schema structure and package-manifest sections are bookkeeping, not writing.
  if (NOISE_KEYS.has(lowered) || SYSTEM_KEYS.has(lowered.replace(/^[$@]/, ''))) {
    stats.machine += Math.max(1, countLeaves(value));
    return;
  }
  if (IMAGE_META_KEYS.has(imageMetaKey(key))) {
    stats.machine += Math.max(1, countLeaves(value));
    stats.imageMeta += 1;
    return;
  }
  if (lowered === 'type' && typeof value === 'string' && SCHEMA_TYPE_NAMES.has(value.toLowerCase())) {
    stats.machine += 1;
    return;
  }
  if (depth === 0 && MANIFEST_KEYS.has(lowered)) {
    stats.machine += Math.max(1, countLeaves(value));
    return;
  }
  if (lowered === 'items' && isRecord(value)) {
    stats.machine += Math.max(1, countLeaves(value));
    return;
  }
  const label = titleCaseKey(key);

  if (Array.isArray(value)) {
    const mark = lines.length;
    const objects = value.filter((item) => isRecord(item));
    const scalars = value.filter((item) => item !== null && typeof item !== 'object');
    if (objects.length) {
      emitSection(lines, label);
      renderRecordArray(lines, objects as Record<string, unknown>[], depth + 1, currency, stats);
    }
    const flat = scalars
      .map((item) => oneLine(String(item)))
      .filter((item) => item !== '' && !isBinaryish(item) && !isMachineValue(item));
    if (flat.length) {
      if (flat.some((item) => /\s/.test(item) || item.includes('@'))) stats.phrases = true;
      emit(lines, `${label}: ${flat.join(', ')}`);
    }
    if (lines.length === mark + 2) lines.length = mark; // the section came out empty
    for (const item of value) if (Array.isArray(item)) walkKey(lines, key, item, depth + 1, currency, stats);
    return;
  }

  if (isRecord(value)) {
    const mark = lines.length;
    emitSection(lines, label);
    walkObject(lines, value, depth + 1, currency, stats);
    if (lines.length === mark + 2) lines.length = mark; // the section came out empty
    return;
  }

  if (typeof value === 'boolean' || isMachineValue(oneLine(String(value))) || TECHNICAL_KEY.test(key)) {
    stats.machine += 1;
    return;
  }

  const text = oneLine(String(value));
  if (!text || isBinaryish(text)) return;
  if (/\s/.test(text) || text.includes('@')) stats.phrases = true;
  if (text.length >= 60 && /\s/.test(text)) stats.prose = true;
  // A document's own name is its title line, not a `Shop Name:` field.
  if (depth === 0 && RECORD_DOCUMENT_NAME.test(key) && text.length <= 60 && !text.includes(':')) {
    emit(lines, text);
    return;
  }
  emit(lines, `${label}: ${text}`);
}

function walkObject(
  lines: string[],
  value: Record<string, unknown>,
  depth: number,
  currency: string,
  stats: StructStats,
): void {
  for (const [key, child] of Object.entries(value)) walkKey(lines, key, child, depth, currency, stats);
}

/* ------------------------------------------------------------------ *
 * JSON parsing that survives real files: byte-order marks, comments,
 * trailing commas, smart quotes, and several documents in one file.
 * ------------------------------------------------------------------ */

/** Removes // and slash-star comments outside string literals. */
function stripJsonComments(source: string): string {
  let out = '';
  let inString = false;
  let escape = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (inString) {
      out += char;
      if (escape) escape = false;
      else if (char === '\\') escape = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      out += char;
      continue;
    }
    if (char === '/' && source[i + 1] === '/') {
      while (i < source.length && source[i] !== '\n') i++;
      out += '\n';
      continue;
    }
    if (char === '/' && source[i + 1] === '*') {
      i += 2;
      while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) i++;
      continue;
    }
    out += char;
  }
  return out;
}

/** Slices concatenated or newline-delimited documents apart, string-aware. */
function splitTopLevel(source: string): string[] {
  const docs: string[] = [];
  let start = -1;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (inString) {
      if (escape) escape = false;
      else if (char === '\\') escape = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{' || char === '[') {
      if (depth === 0) start = i;
      depth += 1;
      continue;
    }
    if (char === '}' || char === ']') {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        docs.push(source.slice(start, i + 1));
        start = -1;
      }
      continue;
    }
  }
  return docs;
}

function parseJsonDocuments(source: string): unknown[] {
  const repaired = stripJsonComments(source).replace(/,(\s*[}\]])/g, '$1');
  const attempts = [source, repaired, repaired.replace(/[\u201c\u201d]/g, '"').replace(/[\u2018\u2019]/g, "'")];
  for (const attempt of attempts) {
    try {
      return [JSON.parse(attempt)];
    } catch {
      // fall through to the split scan
    }
    const docs: unknown[] = [];
    for (const chunk of splitTopLevel(attempt)) {
      try {
        docs.push(JSON.parse(chunk));
      } catch {
        // a malformed chunk is skipped; the rest still count
      }
    }
    if (docs.length) return docs;
  }
  return [];
}

/** Last resort for truncated or exotic files: lift `"key": value` pairs out of the text. */
const PAIR_SCAN = /"((?:[^"\\]|\\.)+)"\s*:\s*(?:"((?:[^"\\]|\\.)*)"|(-?\d+(?:\.\d+)?)|true|false|null)/g;

function pairScan(source: string): { text: string; machineFields: number } {
  const lines: string[] = [];
  const stats: StructStats = { machine: 0, prose: false, phrases: false, recordArrays: 0, imageMeta: 0 };
  const seen = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = PAIR_SCAN.exec(source)) !== null && lines.length < MAX_LINES) {
    let key = match[1];
    let value = match[2] ?? match[3] ?? '';
    try {
      key = JSON.parse(`"${key}"`);
      if (match[2] !== undefined) value = JSON.parse(`"${value}"`);
    } catch {
      // keep the raw forms when they are not valid JSON escapes
    }
    const text = oneLine(String(value));
    if (!text || isBinaryish(text) || seen.has(`${key}|${text}`)) continue;
    seen.add(`${key}|${text}`);

    if (isSystemEntry(key, text) || MANIFEST_KEYS.has(key.toLowerCase())) {
      stats.machine += 1;
      continue;
    }
    if (/^(?:true|false)$/i.test(text)) {
      stats.machine += 1;
      continue;
    }
    if (/\s/.test(text) || text.includes('@')) stats.phrases = true;
    if (text.length >= 60 && /\s/.test(text)) stats.prose = true;
    if (RECORD_DOCUMENT_NAME.test(key) && text.length <= 60 && !text.includes(':')) emit(lines, text);
    else emit(lines, `${titleCaseKey(key)}: ${text}`);
  }

  const text = clean(lines.join('\n'));
  if (looksLikePureConfig(stats, text)) return { text: '', machineFields: stats.machine + lines.length };
  return { text, machineFields: stats.machine };
}

/**
 * A whole document that is nothing but machine settings — no prose sentence, no
 * human phrase and no record list anywhere — would build a nonsense page, so
 * intake refuses it and says so instead.
 */
function looksLikePureConfig(stats: StructStats, text: string): boolean {
  if (stats.prose || stats.phrases || stats.recordArrays > 0) return false;
  const keptLetters = text.replace(/[^a-zA-Z0-9]/g, '').length;
  return stats.machine >= 3 && keptLetters < 400;
}

/**
 * Records shaped with the same vocabulary as the table reader, with machine
 * bookkeeping (schemas, manifests, versions, paths) left out of the result.
 */
export function extractJson(source: string): { text: string; machineFields: number; imageDump?: boolean } {
  const stripped = source.replace(/^\uFEFF/, '');
  // A `.json` file that never contained markup is just someone's notes.
  if (!/[[{]/.test(stripped) && !/["']\s*:/.test(stripped)) return { text: clean(stripped), machineFields: 0 };

  const documents = parseJsonDocuments(stripped);
  if (!documents.length) {
    const scanned = pairScan(stripped);
    // Neither parseable nor pair-scannable: it was prose wearing a .json name.
    return scanned.text || scanned.machineFields ? scanned : { text: clean(stripped), machineFields: 0 };
  }

  const lines: string[] = [];
  const stats: StructStats = { machine: 0, prose: false, phrases: false, recordArrays: 0, imageMeta: 0 };

  // Several documents in one file (NDJSON or concatenated exports) read as one
  // record list, so shared rows keep the same shape as a normal array.
  if (documents.length > 1 && documents.every((document) => isRecord(document))) {
    renderRecordArray(lines, documents as Record<string, unknown>[], 1, rootCurrency(documents[0]), stats);
  } else {
    for (const document of documents) {
      if (Array.isArray(document)) {
        if (isRecordArray(document)) {
          renderRecordArray(lines, document.filter(isRecord), 1, rootCurrency(document), stats);
        } else {
          for (const item of document) walkKey(lines, 'item', item, 1, rootCurrency(document), stats);
        }
      } else if (isRecord(document)) {
        walkObject(lines, document, 0, rootCurrency(document), stats);
      } else if (document !== null && document !== undefined) {
        emit(lines, String(document));
      }
    }
  }

  const text = clean(lines.join('\n'));
  /** A pile of photo-analysis keys with no real sentences is a picture's metadata, not a page. */
  if (stats.imageMeta >= 5 && !stats.prose) {
    return { text: '', machineFields: stats.machine + lines.length, imageDump: true };
  }
  if (looksLikePureConfig(stats, text)) return { text: '', machineFields: stats.machine + lines.length };
  return { text, machineFields: stats.machine };
}

export function extractYaml(source: string): string {
  const lines: string[] = [];
  const unquote = (value: string) => value.replace(/^(['"])([\s\S]*)\1$/, '$2');
  for (const raw of source.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.replace(/\s+#.*$/, '').trimEnd();
    if (!line.trim() || line.trim().startsWith('#') || line.trim() === '---') continue;
    const pair = /^\s*-?\s*([A-Za-z0-9_.-]+):\s*(.*)$/.exec(line);
    if (pair) {
      const key = pair[1];
      const value = unquote(pair[2].trim());
      if (value === '' || isSystemEntry(key, value) || /^(?:true|false|yes|no|null|~)$/i.test(value)) continue;
      lines.push(`${key}: ${value}`);
      continue;
    }
    const item = /^\s*-\s+(.*)$/.exec(line);
    if (item && !NOISE_KEYS.has(item[1].toLowerCase()) && !isMachineValue(item[1])) lines.push(item[1]);
  }
  return clean(lines.join('\n'));
}

export function extractXml(source: string): string {
  const withoutDecl = source.replace(/<\?xml[\s\S]*?\?>/g, ' ').replace(/<!--[\s\S]*?-->/g, ' ');
  const lines: string[] = [];
  const leaf = /<([A-Za-z][\w:.-]*)[^>]*>([^<]+)<\/\1>/g;
  let match: RegExpExecArray | null;
  while ((match = leaf.exec(withoutDecl)) !== null) {
    const key = match[1].split(':').pop() ?? match[1];
    const value = decodeEntities(match[2]).trim();
    if (!value || isSystemEntry(key, value)) continue;
    lines.push(`${titleCaseKey(key)}: ${value}`);
  }
  return clean(lines.join('\n'));
}

export function extractEmail(source: string): string {
  const normalized = source.replace(/\r\n?/g, '\n');
  const boundary = normalized.indexOf('\n\n');
  const headerBlock = boundary >= 0 ? normalized.slice(0, boundary) : normalized;
  const body = boundary >= 0 ? normalized.slice(boundary + 2) : '';

  /** Envelope bookkeeping (To, Date, Message-ID) is not the writer's words; Subject and From are. */
  const headers = headerBlock
    .split('\n')
    .filter((line) => /^(?:subject|from):/i.test(line));

  const bodyLines = body
    .split('\n')
    .filter((line) => !/^--[A-Za-z0-9_]+$/.test(line.trim()))
    .filter((line) => !/^[A-Za-z0-9+/=]{60,}$/.test(line.trim()))
    .filter((line) => !/^content-(type|transfer-encoding|disposition)/i.test(line));

  return clean([...headers, '', bodyLines.join('\n')].join('\n'));
}

/** Legacy Office (.doc/.xls/.ppt) is an OLE container; a printable-string scrape is the best we can do without a parser. */
export function scrapeOleStrings(buffer: Buffer): string {
  /** Newline bytes end a run (they are line structure, not noise); other gaps become single spaces. */
  const scan = (source: string): string => {
    const lines: string[] = [];
    let run = '';
    let gap = 0;
    const flush = () => {
      if (run.length >= 4) lines.push(run);
      run = '';
    };
    for (const ch of source) {
      const code = ch.charCodeAt(0);
      if (code === 0x0a || code === 0x0d) {
        flush();
        gap = 0;
      } else if (code >= 0x20 && code <= 0x7e) {
        if (gap >= 3) flush();
        else if (gap > 0) run += ' ';
        run += ch;
        gap = 0;
        if (run.length > 2000) flush();
      } else {
        gap++;
      }
    }
    flush();
    /** OLE storage names survive the scrape as fragments joined by spaces; a line of only these is bookkeeping. */
    const noiseWord =
      /^(?:microsoft|root|entry|worddocument|documentsummaryinformation|summaryinformation|word|excel|powerpoint|compobj|objectpool|1table|0table|data|workbook|sheet|props|specification)$/i;
    const noise = /^(Microsoft|Root Entry|WordDocument|SummaryInformation|DocumentSummaryInformation|\W+[\w]*)$/;
    return clean(
      lines
        .filter((line) => {
          const trimmed = line.trim();
          if (trimmed.length <= 1 || noise.test(trimmed)) return false;
          return !trimmed.split(/\s+/).every((word) => noiseWord.test(word));
        })
        .join('\n'),
    );
  };

  const narrow = scan(buffer.toString('latin1'));
  let zeros = 0;
  for (const byte of buffer) if (byte === 0) zeros++;
  if (zeros / Math.max(1, buffer.length) <= 0.2) return narrow;
  // Word 97 stores prose as UTF-16LE; decoding the whole container turns ASCII
  // sectors into CJK noise that the scan skips, while the text becomes readable.
  // The narrow scan of interleaved bytes reads `C o a s t a l` — junk that is
  // longer than the real thing, so the two are compared by real-word count.
  const realWords = (text: string) => text.split(/\s+/).filter((word) => word.length >= 3 && /[A-Za-z]/.test(word)).length;
  const wide = scan(buffer.toString('utf16le'));
  return realWords(wide) > realWords(narrow) ? wide : narrow;
}

export function plainText(source: string): string {
  return clean(source);
}
