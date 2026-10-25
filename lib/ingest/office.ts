import { inflateRawSync } from 'node:zlib';
import { clean, renderTabularRows } from './text-formats';

/**
 * Minimal ZIP reader: Office files (DOCX/PPTX/XLSX) are ZIPs, so this gives us
 * document text without pulling in a native or heavy dependency.
 */
function readEntries(buffer: Buffer): Map<string, Buffer> {
  const entries = new Map<string, Buffer>();
  const eocd = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error('Not a valid Office document (missing ZIP index).');

  const count = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  if (offset + 46 > buffer.length) throw new Error('ZIP central directory is out of range.');

  for (let i = 0; i < count; i++) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== 0x02014b50) {
      break;
    }
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString('utf8');

    // The central directory stores where the local header lives; trusting the
    // central record's own position instead of that pointer mis-reads every
    // entry once the two offsets diverge.
    const localOffset = buffer.readUInt32LE(offset + 42);
    if (localOffset + 30 <= buffer.length && buffer.readUInt32LE(localOffset) === 0x04034b50) {
      const localNameLength = buffer.readUInt16LE(localOffset + 26);
      const localExtraLength = buffer.readUInt16LE(localOffset + 28);
      const dataStart = localOffset + 30 + localNameLength + localExtraLength;
      if (dataStart + compressedSize <= buffer.length) {
        const raw = buffer.subarray(dataStart, dataStart + compressedSize);
        if (method === 0) entries.set(name, Buffer.from(raw));
        else if (method === 8) {
          try {
            entries.set(name, inflateRawSync(raw, { finishFlush: 2 }) as unknown as Buffer);
          } catch {
            entries.set(name, Buffer.alloc(uncompressedSize));
          }
        }
      }
    }

    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function decodeXml(input: string): string {
  return input
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function xmlToText(xml: string): string {
  return xml
    .replace(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g, '$1\n')
    .replace(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g, '$1')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<w:tab[^>]*\/>/g, '\t')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

/** Heading styles are the only reliable outline signal in a DOCX, so keep them as markers. */
function headingLevel(style: string): number {
  const value = style.trim();
  const numbered = /^(?:heading|head)\s*([1-6])$/i.exec(value);
  if (numbered) return Number(numbered[1]);
  return /^title$/i.test(value) ? 1 : 0;
}

/** Text runs of one Word paragraph, honouring tabs and explicit line breaks. */
function wordRunText(block: string): string {
  let out = '';
  const tokens = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\b[^>]*\/>|<w:br\b[^>]*\/>/gi;
  let token: RegExpExecArray | null;
  while ((token = tokens.exec(block)) !== null) {
    if (token[1] !== undefined) out += decodeXml(token[1]);
    else out += /tab/i.test(token[0]) ? '\t' : '\n';
  }
  return out.replace(/[ \t]+\n/g, '\n').trim();
}

/** Paragraph by paragraph, so a `Heading3` style can become a `### ` line. */
function docxBodyText(xml: string): string {
  const paragraphs = [...xml.matchAll(/<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g)];
  if (paragraphs.length < 2) return xmlToText(xml);

  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    const block = paragraph[1];
    const text = wordRunText(block);
    if (!text) continue;
    const level = headingLevel(/<w:pStyle[^>]*w:val="([^"]*)"/i.exec(block)?.[1] ?? '');
    for (const part of text.split(/[\n\t]+/)) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      lines.push(level > 0 ? `${'#'.repeat(level)} ${trimmed}` : trimmed);
    }
  }
  return lines.join('\n');
}

function sharedStrings(xml: string): string[] {
  const out: string[] = [];
  const blocks = /<si>([\s\S]*?)<\/si>/g;
  let block: RegExpExecArray | null;
  while ((block = blocks.exec(xml)) !== null) {
    const runs = [...block[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => decodeXml(t[1]));
    out.push(runs.join(''));
  }
  return out;
}

/** Cell arrays, not tab-joined strings — the shared table reader does the shaping. */
function sheetRows(xml: string, strings: string[]): string[][] {
  const rows: string[][] = [];
  const rowRe = /<row[^>]*>([\s\S]*?)<\/row>/g;
  let row: RegExpExecArray | null;
  while ((row = rowRe.exec(xml)) !== null) {
    const cells: string[] = [];
    const cellRe = /<c\b([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let cell: RegExpExecArray | null;
    while ((cell = cellRe.exec(row[1])) !== null) {
      const attrs = cell[1] ?? '';
      const inner = cell[2] ?? '';
      const type = /t="([^"]+)"/.exec(attrs)?.[1];
      if (type === 's') {
        const index = Number(/<v[^>]*>([\s\S]*?)<\/v>/.exec(inner)?.[1] ?? -1);
        cells.push(strings[index] ?? '');
      } else if (type === 'inlineStr') {
        cells.push([...inner.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => decodeXml(t[1])).join(''));
      } else {
        cells.push(decodeXml(/<v[^>]*>([\s\S]*?)<\/v>/.exec(inner)?.[1] ?? ''));
      }
    }
    if (cells.some((value) => value.trim() !== '')) rows.push(cells);
  }
  return rows;
}

interface SlideShape {
  name: string;
  placeholder: string;
  text: string;
}

/** Shape text paragraph by paragraph, so a slide keeps its own line structure. */
function slideShapes(xml: string): SlideShape[] {
  return [...xml.matchAll(/<p:sp\b[\s\S]*?<\/p:sp>/g)].map((match) => {
    const block = match[0];
    return {
      name: /<p:cNvPr[^>]*\bname="([^"]*)"/i.exec(block)?.[1] ?? '',
      placeholder: /<p:ph\b[^>]*\btype="([^"]+)"/i.exec(block)?.[1] ?? '',
      text: [...block.matchAll(/<a:p\b[\s\S]*?<\/a:p>/g)]
        .map((paragraph) =>
          [...paragraph[0].matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g)]
            .map((run) => decodeXml(run[1]))
            .join('')
            .trim(),
        )
        .filter((line) => line !== '')
        .join('\n'),
    };
  });
}

const TITLE_PLACEHOLDERS = /^(title|ctrtitle)$/i;
const CHROME_PLACEHOLDERS = /^(sldnum|ftr|dt|hdr)$/i;

/** A slide is `## Title` plus its body text; an untitled slide keeps the old marker. */
function slideText(xml: string, index: number): string {
  const shapes = slideShapes(xml).filter((shape) => !CHROME_PLACEHOLDERS.test(shape.placeholder));
  const title = shapes.find(
    (shape) => TITLE_PLACEHOLDERS.test(shape.placeholder) || /^title\b/i.test(shape.name),
  );
  const heading = title?.text.split('\n')[0]?.trim();
  const body = shapes
    .filter((shape) => shape !== title)
    .flatMap((shape) => shape.text.split('\n'))
    .map((line) => line.trim())
    .filter((line) => line !== '');

  if (!heading) return clean([`--- Slide ${index + 1} ---`, ...body].join('\n'));
  return clean([`## ${heading}`, ...body.filter((line) => line !== heading)].join('\n'));
}

function sheetNames(workbookXml: string): string[] {
  return [...workbookXml.matchAll(/<sheet\b[^>]*\bname="([^"]*)"/g)].map((match) => decodeXml(match[1]));
}

export async function extractDocx(buffer: Buffer): Promise<string> {
  const entries = readEntries(buffer);
  const body = entries.get('word/document.xml');
  if (!body) throw new Error('DOCX has no document body.');
  return clean(docxBodyText(body.toString('utf8')));
}

export async function extractPptx(buffer: Buffer): Promise<string> {
  const entries = readEntries(buffer);
  const slides = [...entries.keys()]
    .filter((key) => /^ppt\/slides\/slide\d+\.xml$/.test(key))
    .sort((a, b) => Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0]));
  if (!slides.length) throw new Error('PPTX has no slides.');
  return clean(slides.map((key, index) => slideText(entries.get(key)!.toString('utf8'), index)).join('\n\n'));
}

export async function extractXlsx(buffer: Buffer): Promise<string> {
  const entries = readEntries(buffer);
  const strings = entries.has('xl/sharedStrings.xml')
    ? sharedStrings(entries.get('xl/sharedStrings.xml')!.toString('utf8'))
    : [];

  const sheets = [...entries.keys()]
    .filter((key) => /^xl\/worksheets\/sheet\d+\.xml$/.test(key))
    .sort((a, b) => Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0]));
  if (!sheets.length) throw new Error('XLSX has no worksheets.');

  const names = entries.has('xl/workbook.xml') ? sheetNames(entries.get('xl/workbook.xml')!.toString('utf8')) : [];

  return clean(
    sheets
      .map((key, index) => {
        const rows = sheetRows(entries.get(key)!.toString('utf8'), strings);
        // Same readable-row shape as a CSV, so a sheet with columns is not a tab dump.
        const body = renderTabularRows(rows);
        const name = (names[index] ?? '').trim();
        return sheets.length > 1 && name ? `## ${name}\n\n${body}` : body;
      })
      .join('\n\n'),
  );
}
