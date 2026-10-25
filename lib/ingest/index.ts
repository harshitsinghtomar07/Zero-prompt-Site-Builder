import type { ExtractedDocument, IntakeResult, SourceAsset, SourceFormat } from '../types/source';
import { sniffFormat } from './detect';
import { extractDocx, extractPptx, extractXlsx } from './office';
import { extractImage, imageMime, MAX_ASSETS, MAX_IMAGE_BYTES } from './images';
import { isRaster, ocrImage, svgText } from './ocr';
import {
  clean,
  extractDelimited,
  extractEmail,
  extractHtml,
  extractJson,
  extractRtf,
  extractXml,
  extractYaml,
  plainText,
  scrapeOleStrings,
} from './text-formats';

export type { ExtractedDocument, IntakeResult } from '../types/source';

const OLE_MAGIC = [0xd0, 0xcf, 0x11, 0xe0];

function isLegacyOffice(buffer: Buffer): boolean {
  if (buffer.length < OLE_MAGIC.length) return false;
  return OLE_MAGIC.every((byte, index) => buffer[index] === byte);
}

function textDoc(name: string, format: SourceFormat, text: string): ExtractedDocument {
  return { name, format, text };
}

function asText(buffer: Buffer): string {
  return buffer.toString('utf8');
}

async function extractPdf(name: string, buffer: Buffer): Promise<ExtractedDocument> {
  // The pdf-parse entrypoint touches the filesystem when it detects no parent
  // module, so the parser itself is imported directly.
  const mod = await import('pdf-parse/lib/pdf-parse.js');
  const parse = ((mod as { default?: unknown }).default ?? mod) as (
    data: Uint8Array,
  ) => Promise<{ text: string; numpages: number }>;
  // pdf.js reads the underlying ArrayBuffer, so a pooled Node Buffer must be
  // copied into an exact-length view before parsing.
  const parsed = await parse(new Uint8Array(buffer));
  const text = clean(parsed.text.replace(/\s+\n/g, '\n'));
  const perPage = parsed.numpages > 0 ? text.length / parsed.numpages : 0;
  const observation =
    parsed.numpages > 0 && perPage < 30
      ? `${name} looks like a scanned PDF (about ${Math.round(perPage)} characters per page); it has no text layer, so OCR or a pasted transcript is needed.`
      : undefined;
  return { name, format: 'pdf', text, pages: parsed.numpages, observation };
}

async function extractImageDocument(
  name: string,
  buffer: Buffer,
  mime: string,
  canRead: boolean,
): Promise<ExtractedDocument> {
  const assets =
    buffer.length > MAX_IMAGE_BYTES
      ? undefined
      : [extractImage(name, buffer, mime)];
  const carried = assets ? ' It is used as a site image.' : ` It is larger than ${MAX_IMAGE_BYTES / 1024 / 1024} MB, so it is not shown on the site.`;

  if (mime === 'image/svg+xml') {
    const text = svgText(buffer);
    return {
      name,
      format: 'image',
      text,
      assets,
      observation: text
        ? `${name} is a vector graphic; its ${text.length} characters of drawn text were read straight from the markup.`
        : `${name} is a vector graphic with no text drawn in it.${carried}`,
    };
  }

  if (!isRaster(mime)) {
    return {
      name,
      format: 'image',
      text: '',
      assets,
      observation: `${name} is not a picture this reader can open.${carried}`,
    };
  }

  if (!canRead) {
    return {
      name,
      format: 'image',
      text: '',
      assets,
      observation: `${name} was used as a site image; the other files already carried the words for this site.`,
    };
  }

  const text = await ocrImage(buffer);
  return {
    name,
    format: 'image',
    text,
    assets,
    observation: text
      ? `${name} was read with on-device text recognition; ${text.length} characters came out of the picture and the site is built from them.`
      : `${name} is a photo with no readable text in it, so there was nothing to write a page about.${carried}`,
  };
}

export async function extractDocument(
  filename: string,
  buffer: Buffer,
  canReadImages = true,
): Promise<ExtractedDocument> {
  const format = sniffFormat(filename, buffer);

  if (isLegacyOffice(buffer)) {
    const scraped = scrapeOleStrings(buffer);
    if (scraped) {
      return {
        name: filename,
        format: 'text',
        text: scraped,
        observation: `${filename} is a legacy Office file (Word 97-2003 binary format); its text was scraped and may be lossy.`,
      };
    }
    return {
      name: filename,
      format: 'binary',
      text: '',
      observation: `${filename} is a legacy Office file whose text could not be recovered; export it to PDF or DOCX.`,
    };
  }

  try {
    switch (format) {
      case 'pdf':
        return await extractPdf(filename, buffer);
      case 'docx':
        return textDoc(filename, 'docx', await extractDocx(buffer));
      case 'pptx':
        return textDoc(filename, 'pptx', await extractPptx(buffer));
      case 'xlsx':
        return textDoc(filename, 'xlsx', await extractXlsx(buffer));
      case 'rtf':
        return textDoc(filename, 'rtf', extractRtf(buffer.toString('latin1')));
      case 'html':
        return textDoc(filename, 'html', extractHtml(asText(buffer)));
      case 'markdown':
        return textDoc(filename, 'markdown', plainText(asText(buffer)));
      case 'csv':
        return textDoc(filename, 'csv', extractDelimited(asText(buffer), 'csv'));
      case 'tsv':
        return textDoc(filename, 'tsv', extractDelimited(asText(buffer), 'tsv'));
      case 'json': {
        const { text, machineFields, imageDump } = extractJson(asText(buffer));
        const doc = textDoc(filename, 'json', text);
        if (machineFields > 0) {
          doc.observation = text
            ? `${filename} mixes writing with machine bookkeeping: ${machineFields} system fields (versions, paths, settings) were left out and the site uses the written parts.`
            : imageDump
              ? `${filename} is a technical description of a photo (colour channels, resolution, compression) — not something a person wrote. Upload the photo itself (jpg, png, webp) and it becomes a real site.`
              : `${filename} is machine configuration with no written content in it — there was nothing to build a page from.`;
        }
        return doc;
      }
      case 'yaml':
        return textDoc(filename, 'yaml', extractYaml(asText(buffer)));
      case 'xml':
        return textDoc(filename, 'xml', extractXml(asText(buffer)));
      case 'email':
        return textDoc(filename, 'email', extractEmail(asText(buffer)));
      case 'text':
        return textDoc(filename, 'text', plainText(asText(buffer)));
      case 'image':
        return await extractImageDocument(filename, buffer, imageMime(filename, buffer), canReadImages);
      case 'empty':
        return {
          name: filename,
          format: 'empty',
          text: '',
          observation: `${filename} is empty; there was nothing to read from it.`,
        };
      default:
        return {
          name: filename,
          format: 'binary',
          text: '',
          observation: `${filename} appears to be binary data with no extractable text; it was skipped.`,
        };
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'unknown error';
    return {
      name: filename,
      format,
      text: '',
      observation: `${filename} could not be read (${message}); it was skipped.`,
    };
  }
}

/** Matches the guard in the pipeline: this much writing is the bare minimum for a page. */
const MIN_READABLE_LETTERS = 24;
/** Recognition is slow, so a build only ever scans this many pictures. */
const MAX_OCR_IMAGES = 3;

function letters(value: string): number {
  return value.replace(/[^a-z0-9]/gi, '').length;
}

export async function intake(
  files: { name: string; buffer: Buffer }[],
  notes?: string,
): Promise<IntakeResult> {
  const trimmedNotes = (notes ?? '').trim();
  const documents: ExtractedDocument[] = [];

  for (const file of files) {
    try {
      documents.push(await extractDocument(file.name, file.buffer, false));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown error';
      documents.push({
        name: file.name,
        format: 'binary',
        text: '',
        observation: `${file.name} could not be read (${message}); it was skipped.`,
      });
    }
  }

  let readable = letters(documents.map((doc) => doc.text).join('')) + letters(trimmedNotes);

  // A photographed menu or a page torn from a notebook carries its words inside
  // the picture, so recognition runs only when there is nothing else to read.
  let scanned = 0;
  for (let index = 0; index < documents.length; index++) {
    const doc = documents[index];
    const file = files[index];
    if (readable >= MIN_READABLE_LETTERS || doc.format !== 'image' || scanned >= MAX_OCR_IMAGES) continue;
    scanned += 1;
    const recognised = await extractDocument(file.name, file.buffer, true);
    documents[index] = recognised;
    readable += letters(recognised.text);
  }

  const assets: SourceAsset[] = [];
  const observations: string[] = [];
  const seenAssets = new Set<string>();
  let text = '';

  for (const doc of documents) {
    for (const asset of doc.assets ?? []) {
      if (seenAssets.has(asset.name)) continue;
      if (assets.length >= MAX_ASSETS) {
        observations.push(`${asset.name} was skipped: only ${MAX_ASSETS} images are kept per build.`);
        continue;
      }
      seenAssets.add(asset.name);
      assets.push(asset);
    }
  }

  for (const doc of documents) {
    text += `\n\n--- ${doc.name} ---\n\n${doc.text}`;
  }

  for (const doc of documents) {
    if (doc.observation) observations.push(doc.observation);
  }

  if (trimmedNotes) text += `\n\n--- notes from the user ---\n\n${trimmedNotes}`;

  return {
    text,
    documents: documents.map((doc) => ({
      name: doc.name,
      format: doc.format,
      characters: doc.text.length,
      observation: doc.observation,
    })),
    assets,
    observations,
  };
}
