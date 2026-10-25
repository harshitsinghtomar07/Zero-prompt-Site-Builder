import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { clean } from './text-formats';

/**
 * Language data is checked in so recognition never waits on a CDN; when the
 * file is missing the worker downloads it once and caches it here.
 */
const TESS_DATA_DIR = join(process.cwd(), 'tessdata');
const OCR_TIMEOUT_MS = 60_000;
/** Under this many letters and digits the pass is noise: a logo, a portrait, a texture. */
const MIN_USEFUL_CHARS = 18;

type Worker = import('tesseract.js').Worker;
type PSM = import('tesseract.js').PSM;
type Line = { text: string; top: number; bottom: number };

let workerPromise: Promise<Worker> | null = null;
/** A tesseract worker runs one job at a time, so the queue is ours to keep. */
let lane: Promise<unknown> = Promise.resolve();

async function spawn(): Promise<Worker> {
  mkdirSync(TESS_DATA_DIR, { recursive: true });
  const { createWorker } = await import('tesseract.js');
  return createWorker('eng', 1, { cachePath: TESS_DATA_DIR });
}

function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = spawn().catch((error: unknown) => {
      workerPromise = null;
      throw error;
    });
  }
  return workerPromise;
}

async function withTimeout<T>(work: Promise<T>, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out.`)), OCR_TIMEOUT_MS);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/** Recognition is serial, and a wedged worker is replaced rather than reused. */
function schedule<T>(task: (worker: Worker) => Promise<T>): Promise<T> {
  const run = lane
    .then(() => getWorker())
    .then((worker) => withTimeout(task(worker), 'Optical character recognition'))
    .catch(async (error: unknown) => {
      const pending = workerPromise;
      workerPromise = null;
      const stale = await pending?.catch(() => null);
      void stale?.terminate().catch(() => undefined);
      throw error;
    });
  lane = run.then(() => undefined, () => undefined);
  return run;
}

const bandOverlap = (a: Line, b: Line): number => {
  const span = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return span / Math.max(1, Math.min(a.bottom - a.top, b.bottom - b.top));
};

/** Whitespace and punctuation are unreliable between passes; letters and digits are not. */
const normalise = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Page-layout mode finds headings and columns but skips rows it reads as rules
 * (dotted leader lines), while single-block mode reads every row top to bottom
 * but misjoins multi-column pages. Running both and reconciling by position
 * keeps the headings and recovers the priced rows either pass drops.
 */
async function readLines(worker: Worker, image: Buffer): Promise<Line[]> {
  const passes: Line[][] = [];
  for (const mode of ['3', '6'] as const) {
    await worker.setParameters({ tessedit_pageseg_mode: mode as PSM });
    const { data } = await worker.recognize(image, {}, { blocks: true });
    const lines: Line[] = (data.blocks ?? [])
      .flatMap((block) => block.paragraphs)
      .flatMap((paragraph) => paragraph.lines)
      .map((line) => ({ text: line.text.trim(), top: line.bbox.y0, bottom: line.bbox.y1 }))
      .filter((line) => line.text);
    passes.push(lines.length ? lines : textLines(data.text));
  }
  return reconcile(passes[0], passes[1]);
}

function textLines(text: string): Line[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => ({ text: line, top: index, bottom: index + 1 }));
}

function reconcile(layout: Line[], linear: Line[]): Line[] {
  const merged = [...layout];

  for (const line of linear) {
    const overlapping = merged.filter((row) => bandOverlap(row, line) > 0.5);
    if (overlapping.length === 1) {
      const row = overlapping[0];
      const rowWords = normalise(row.text);
      const lineWords = normalise(line.text);
      if (rowWords === lineWords) continue;
      if (rowWords.includes(lineWords) || lineWords.includes(rowWords)) {
        // Same physical row: keep whichever pass read more of it.
        if (line.text.length > row.text.length) row.text = line.text;
        continue;
      }
      continue;
    }
    if (overlapping.length === 0) merged.push(line);
  }

  return merged
    .sort((a, b) => a.top - b.top || a.bottom - b.bottom);
}

/** `Podi Bonda ....... Rs. 160` — leaders are rules to the eye and noise to a parser. */
const LEADERS = /\s*(?:\.{2,}|…|[_·••—–]{2,}|[-–—]{3,})\s*/g;
const ONLY_PRICE = /^(?:rs\.?|inr|usd|eur|gbp)?\s*[₹$€£]?\s*\d[\d,.]{0,9}$/i;

/** White space in a photo is paragraph structure the text layer lost. */
function tidy(rows: Line[]): string {
  const heights = rows
    .map((row) => row.bottom - row.top)
    .filter((height) => height > 0)
    .sort((a, b) => a - b);
  const median = heights.length ? heights[Math.floor(heights.length / 2)] : 0;

  const lines: string[] = [];
  let previous: Line | null = null;
  for (const row of rows) {
    const gapped = !!previous && median > 0 && row.top - previous.bottom > median * 1.7;
    const line = row.text.replace(LEADERS, ' ').replace(/\s{2,}/g, ' ').trim();
    previous = row;
    if (!line || !/[a-z0-9]/i.test(line)) continue;
    const written = lines[lines.length - 1];
    // A price row the layout pass split off belongs to the item above it.
    if (!gapped && written && ONLY_PRICE.test(line) && !/\d/.test(written) && written.length < 60) {
      lines[lines.length - 1] = `${written} ${line}`;
      continue;
    }
    if (gapped && lines.length) lines.push('');
    lines.push(line);
  }
  return clean(lines.join('\n'));
}

/** True for the picture formats that need recognition; a vector is read as markup. */
export function isRaster(mime: string): boolean {
  return mime !== 'image/svg+xml' && mime !== 'application/octet-stream';
}

/**
 * Reads the words out of a photo or scan. Returns an empty string when there is
 * nothing worth building a page from, so the caller can say so honestly.
 */
export async function ocrImage(buffer: Buffer): Promise<string> {
  try {
    const text = await schedule(async (worker) => tidy(await readLines(worker, Buffer.from(buffer))));
    return text.replace(/[^A-Za-z0-9]/g, '').length < MIN_USEFUL_CHARS ? '' : text;
  } catch (error: unknown) {
    console.error('[ocr] recognition failed:', error instanceof Error ? error.message : error);
    return '';
  }
}

/** Word-shaped text drawn inside an SVG, which needs no recognition pass. */
export function svgText(buffer: Buffer): string {
  const markup = buffer.toString('utf8');
  const drawn = markup.match(/<(?:text|tspan|textPath)[^>]*>([\s\S]*?)<\/(?:text|tspan|textPath)>/gi) ?? [];
  return drawn
    .map((chunk) => chunk.replace(/<[^>]*>/g, ''))
    .map((value) => value.replace(/&\w+;|&#\d+;/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}
