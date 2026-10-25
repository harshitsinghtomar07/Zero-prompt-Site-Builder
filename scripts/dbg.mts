import { readFileSync } from 'node:fs';
import { extractHtml, extractRtf, extractJson, extractDelimited, extractYaml, extractXml, plainText } from '../lib/ingest/text-formats.ts';
import { discoverStructure } from '../lib/agents/structure.ts';
const file = process.argv[2] ?? 'public/samples/photography.rtf';
const raw = readFileSync(file, 'utf8');
const ext = file.split('.').pop()!.toLowerCase();
const text =
  ext === 'html' ? extractHtml(raw)
  : ext === 'rtf' ? extractRtf(raw)
  : ['json', 'ndjson', 'jsonl', 'jsonc', 'geojson', 'topojson', 'webmanifest'].includes(ext) ? extractJson(raw).text
  : ext === 'csv' ? extractDelimited(raw, 'csv')
  : ext === 'tsv' ? extractDelimited(raw, 'tsv')
  : ext === 'yaml' || ext === 'yml' ? extractYaml(raw)
  : ext === 'xml' ? extractXml(raw)
  : ext === 'txt' ? plainText(raw)
  : raw;
for (const s of discoverStructure(text)) {
  console.log(`\n[${s.role}] ${s.heading}  items=${s.items.length} paras=${s.paragraphs.length}`);
  for (const i of s.items.slice(0, 6)) console.log(`   · ${JSON.stringify({ t: i.title.slice(0, 52), b: i.body.slice(0, 52), m: i.meta })}`);
}
