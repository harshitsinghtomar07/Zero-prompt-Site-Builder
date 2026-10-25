import type { SourceFormat } from '../types/source';

function startsWith(buffer: Buffer, bytes: number[], offset = 0): boolean {
  if (buffer.length < offset + bytes.length) return false;
  for (let i = 0; i < bytes.length; i++) {
    if (buffer[offset + i] !== bytes[i]) return false;
  }
  return true;
}

function head(buffer: Buffer, max = 4096): string {
  return buffer.subarray(0, Math.min(buffer.length, max)).toString('utf8');
}

/** Central-directory filenames only; no inflate, so detection stays byte-cheap. */
function zipEntryNames(buffer: Buffer): string[] {
  const eocd = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) return [];
  let count = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  if (count === 0xffff || offset === 0xffffffff) count = Math.min(count, 2048);

  const names: string[] = [];
  for (let i = 0; i < count; i++) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== 0x02014b50) break;
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const start = offset + 46;
    if (start + nameLength > buffer.length) break;
    names.push(buffer.subarray(start, start + nameLength).toString('utf8'));
    offset = start + nameLength + extraLength + commentLength;
  }
  return names;
}

function imageByBytes(buffer: Buffer): boolean {
  return (
    startsWith(buffer, [0x89, 0x50, 0x4e, 0x47]) ||
    startsWith(buffer, [0xff, 0xd8, 0xff]) ||
    startsWith(buffer, [0x47, 0x49, 0x46, 0x38]) ||
    (startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) && startsWith(buffer, [0x57, 0x45, 0x42, 0x50], 8)) ||
    startsWith(buffer, [0x42, 0x4d])
  );
}

/** Text is not "any bytes that happen to decode"; stray control bytes mean it is really a binary blob. */
function looksBinary(text: string): boolean {
  let controls = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code === 0) return true;
    if (code < 0x09 || code === 0x0b || code === 0x0c || (code >= 0x0e && code <= 0x1f) || code === 0x7f) {
      controls++;
    }
  }
  return text.length > 0 && controls / text.length > 0.08;
}

/** A real delimited table keeps a steady column count across lines; prose with the odd comma does not. */
function delimiterCounts(lines: string[]): { delimiter: string; rows: number } {
  const candidates = [',', ';', '\t', '|'];
  let best = { delimiter: '', rows: 0 };
  for (const delimiter of candidates) {
    const columns = lines.map((line) => line.split(delimiter).length);
    const wide = columns.filter((n) => n > 1);
    if (wide.length < 2 || wide.length / columns.length < 0.6) continue;
    const modal = wide.filter((n) => n === wide[0]).length;
    if (modal < wide.length * 0.8) continue;
    if (wide[0] > best.rows) best = { delimiter, rows: wide[0] };
  }
  return best;
}

function isEmailHead(text: string): boolean {
  const lines = text.split('\n', 8);
  const headerish = lines.filter((line) => /^[A-Za-z][A-Za-z-]*:\s/.test(line));
  return headerish.some((line) => /^(subject|from):/i.test(line));
}

function isYaml(text: string, ext: string): boolean {
  if (ext === 'yaml' || ext === 'yml') return true;
  if (/^---\s*\r?\n/.test(text)) return true;
  const lines = text.split('\n').filter((line) => line.trim() && !line.trim().startsWith('#'));
  const pairLines = lines.filter((line) => /^[A-Za-z0-9_.-]+:(\s|$)/.test(line));
  return lines.length >= 2 && pairLines.length === lines.length && !text.includes('{');
}

function isMarkdown(text: string): boolean {
  const lines = text.split('\n');
  const heading = lines.some((line) => /^#{1,6}\s+\S/.test(line));
  const fence = /^```/m.test(text);
  const bullets = lines.filter((line) => /^\s*[-*+]\s+\S/.test(line)).length;
  return heading || fence || bullets >= 2;
}

function byExtension(ext: string, fallback: SourceFormat): SourceFormat {
  switch (ext) {
    case 'pdf':
      return 'pdf';
    case 'docx':
      return 'docx';
    case 'pptx':
      return 'pptx';
    case 'xlsx':
    case 'xlsm':
      return 'xlsx';
    case 'rtf':
      return 'rtf';
    case 'html':
    case 'htm':
      return 'html';
    case 'md':
    case 'markdown':
      return 'markdown';
    case 'csv':
      return 'csv';
    case 'tsv':
      return 'tsv';
    case 'json':
    case 'jsonl':
    case 'ndjson':
    case 'jsonc':
    case 'geojson':
    case 'topojson':
    case 'webmanifest':
      return 'json';
    case 'yaml':
    case 'yml':
      return 'yaml';
    case 'xml':
      return 'xml';
    case 'eml':
      return 'email';
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'webp':
    case 'bmp':
    case 'svg':
      return 'image';
    default:
      return fallback;
  }
}

export function sniffFormat(filename: string, buffer: Buffer): SourceFormat {
  const ext = (filename.split('.').pop() ?? '').toLowerCase();
  if (buffer.length === 0) return 'empty';

  if (startsWith(buffer, [0x25, 0x50, 0x44, 0x46, 0x2d])) return 'pdf';
  if (startsWith(buffer, [0x7b, 0x5c, 0x72, 0x74, 0x66])) return 'rtf';
  if (startsWith(buffer, [0xd0, 0xcf, 0x11, 0xe0])) return 'binary';
  if (startsWith(buffer, [0x50, 0x4b, 0x03, 0x04])) {
    const names = zipEntryNames(buffer);
    if (names.some((name) => name.startsWith('word/'))) return 'docx';
    if (names.some((name) => name.startsWith('ppt/'))) return 'pptx';
    if (names.some((name) => name.startsWith('xl/'))) return 'xlsx';
    return 'binary';
  }
  if (imageByBytes(buffer)) return 'image';

  if (ext === 'svg') return 'image';
  // A .json/.ndjson extension is a strong claim: hand-edited files with leading
  // comments and trailing commas still belong to the JSON reader, which repairs them.
  if (['json', 'jsonl', 'ndjson', 'jsonc', 'geojson', 'topojson', 'webmanifest'].includes(ext)) return 'json';
  const text = head(buffer);
  if (looksBinary(text)) return ext ? byExtension(ext, 'binary') : 'binary';

  const trimmed = text.replace(/^\s+/, '').toLowerCase();
  const stripped = text.replace(/^\s*<\?xml[^>]*>\s*/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/^\s+/, '');

  if (/^<svg[\s>/]/i.test(stripped)) return 'image';
  if (trimmed.startsWith('<!doctype html') || trimmed.startsWith('<html') || /^<html[\s>/]/i.test(stripped)) {
    return 'html';
  }
  if (stripped.startsWith('<?xml')) return 'xml';

  // Leading comments must not hide a JSON document from the reader.
  const jsonProbe = text.replace(/^(?:\s|\/\/[^\n]*|\/\*[\s\S]*?\*\/)*/, '');
  const opener = jsonProbe[0];
  if (opener === '{' || opener === '[') {
    // Brace-opening content always goes to the JSON reader, which repairs
    // comments and trailing commas and splits concatenated documents.
    return 'json';
  }

  if (isEmailHead(text)) return 'email';

  const lines = text.split('\n').filter((line) => line.trim().length > 0).slice(0, 5);
  if (lines.length >= 2) {
    const best = delimiterCounts(lines);
    if (best.delimiter === '\t') return 'tsv';
    if (best.delimiter) return 'csv';
  }

  if (isYaml(text, ext)) return 'yaml';
  if (isMarkdown(text)) return 'markdown';

  return byExtension(ext, 'text');
}
