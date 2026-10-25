import { readFileSync } from 'node:fs';
const id = process.argv[2]!;
const kinds = (process.argv[3] ?? '').split(',').filter(Boolean);
const site = JSON.parse(readFileSync(`.data/sites/${id}.json`, 'utf8')).result.site;
for (const b of site.blocks) if (!kinds.length || kinds.includes(b.kind)) console.log(JSON.stringify(b, null, 1));
