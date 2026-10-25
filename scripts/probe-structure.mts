import { readFileSync } from 'node:fs';
import { extractHtml } from '../lib/ingest/text-formats.ts';
import { discoverStructure } from '../lib/agents/structure.ts';

const file = process.argv[2] ?? 'public/samples/conference.html';
const raw = readFileSync(file, 'utf8');
const text = file.endsWith('.html') ? extractHtml(raw) : raw;
const sections = discoverStructure(text);
for (const section of sections) {
  console.log(`\n[${section.role}] ${section.heading}`);
  for (const item of section.items.slice(0, 10)) console.log(`   · ${JSON.stringify({ t: item.title, b: item.body.slice(0, 60), m: item.meta })}`);
}
