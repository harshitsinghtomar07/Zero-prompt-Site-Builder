#!/usr/bin/env node
/**
 * Diagnostic printer for intake detection inputs. It re-implements no parsing:
 * for each file it shows the raw magic bytes a human can match against the
 * detection table in lib/ingest/detect.ts.
 *
 *   node scripts/verify-intake.mjs public/sample-resume.pdf path/to/mystery.txt
 */
import { stat, readFile } from 'node:fs/promises';
import { extname } from 'node:path';

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('usage: node scripts/verify-intake.mjs <file> [file ...]');
  process.exit(2);
}

function hex(bytes) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0').toUpperCase()).join(' ');
}

function printable(bytes) {
  return [...bytes]
    .map((byte) => (byte >= 0x20 && byte <= 0x7e ? String.fromCharCode(byte) : '.'))
    .join('');
}

for (const path of args) {
  try {
    const info = await stat(path);
    if (!info.isFile()) {
      console.log(`${path}: not a regular file`);
      continue;
    }
    const all = await readFile(path);
    const head = all.subarray(0, 8);
    const ext = extname(path).replace(/^\./, '') || '(none)';
    console.log(
      `${path}\n  size: ${all.length} bytes\n  ext:  ${ext}\n  head: ${hex(head)}  |${printable(head)}|`,
    );
  } catch (error) {
    console.error(`${path}: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
