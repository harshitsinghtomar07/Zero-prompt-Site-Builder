import { readFileSync } from 'node:fs';
import { findHeadings } from '../lib/agents/structure.ts';
import { clean } from '../lib/ingest/text-formats.ts';
const raw = readFileSync(process.argv[2] ?? 'public/samples/nonprofit.txt', 'utf8');
const FURN = /^(?:[=\-*_~·—–]{3,}\s*$|(?:#\s*)?columns?:\s|[-=]{3,}\s*\S+\s*[-=]{3,}$)/i;
const lines = raw.replace(/\r\n/g, '\n').split('\n').filter((l) => !/^---\s*[\w .-]+\s---$/.test(l.trim()) && !FURN.test(clean(l).replace(/\s+/g, ' ')));
lines.forEach((l, i) => { if (/GOVERN|GIVE|ANNUAL|BOARD/.test(l)) console.log(`line ${i}: ${JSON.stringify(l)}`); });
for (const h of findHeadings(lines)) console.log(`${h.index} L${h.level}${h.marked ? '*' : ' '} [${h.role}] ${h.text}`);
