import { readFileSync } from 'node:fs';
for (const id of process.argv.slice(2)) {
  const rec = JSON.parse(readFileSync(`.data/sites/${id}.json`, 'utf8'));
  const site = rec.result.site;
  console.log(`\n### ${id} ${site.theme.name} q=${JSON.stringify(rec.quality.contrast)}`);
  console.log('palette', JSON.stringify(site.theme.palette));
  const hero = site.blocks.find((b: any) => b.kind === 'hero');
  console.log('cta', JSON.stringify(hero?.primaryCta), JSON.stringify(hero?.secondaryCta));
  console.log('seo', JSON.stringify(rec.result.seo));
  const c = site.blocks.find((b: any) => b.kind === 'contact');
  console.log('contact', JSON.stringify(c));
}
