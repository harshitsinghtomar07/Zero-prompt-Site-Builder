import type { SourceAsset } from '../types/source';

/** Anything larger than this is not worth inlining as a data URL. */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const MAX_ASSETS = 8;

const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
};

function startsWith(buffer: Buffer, bytes: number[], offset = 0): boolean {
  if (buffer.length < offset + bytes.length) return false;
  for (let i = 0; i < bytes.length; i++) {
    if (buffer[offset + i] !== bytes[i]) return false;
  }
  return true;
}

export function imageMime(name: string, buffer: Buffer): string {
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47])) return 'image/png';
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith(buffer, [0x47, 0x49, 0x46, 0x38])) return 'image/gif';
  if (startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) && startsWith(buffer, [0x57, 0x45, 0x42, 0x50], 8)) {
    return 'image/webp';
  }
  if (startsWith(buffer, [0x42, 0x4d])) return 'image/bmp';
  // SVG is XML text; sniff the root so a vector still ships as image/svg+xml even with no .svg name.
  const head = buffer.subarray(0, 512).toString('utf8');
  if (/^\s*(<\?xml[\s\S]*?\?>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>/]/i.test(head)) return 'image/svg+xml';
  const ext = (name.split('.').pop() ?? '').toLowerCase();
  return MIME_BY_EXT[ext] ?? 'application/octet-stream';
}

export function extractImage(name: string, buffer: Buffer, mime: string): SourceAsset {
  // SVG is text but still ships as a base64 data URL so the browser never has
  // to re-parse an embedded document from a query string.
  const dataUrl = `data:${mime};base64,${buffer.toString('base64')}`;
  return { name, mime, dataUrl, bytes: buffer.length };
}
