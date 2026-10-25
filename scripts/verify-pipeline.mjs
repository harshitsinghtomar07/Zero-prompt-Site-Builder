#!/usr/bin/env node
/**
 * Dev harness: uploads one or more documents (and optional --notes) to a running
 * dev server and prints what the agents produced.
 *
 *   node scripts/verify-pipeline.mjs public/samples/restaurant-menu.csv
 *   node scripts/verify-pipeline.mjs a.pdf b.md --notes "extra context here"
 */
import { readFile } from 'node:fs/promises';

const argv = process.argv.slice(2);
const notesAt = argv.indexOf('--notes');
const notes = notesAt >= 0 ? (argv[notesAt + 1] ?? '') : '';
const skip = new Set(notesAt >= 0 ? [notesAt, notesAt + 1] : []);
const files = argv.filter((arg, index) => !skip.has(index) && !arg.startsWith('--'));
if (files.length === 0 && notes) files.push('notes');
if (files.length === 0) files.push('public/sample-resume.txt');

const base = process.env.BASE_URL ?? 'http://localhost:3000';

const form = new FormData();
for (const file of files) {
  if (file === 'notes') continue;
  form.append('files', new Blob([await readFile(file)], { type: 'application/octet-stream' }), file.split(/[\\/]/).pop());
}
if (notes) form.append('notes', notes);

const start = Date.now();
const posted = await fetch(`${base}/api/build`, { method: 'POST', body: form });
const { jobId, error } = await posted.json();
if (!jobId) throw new Error(error ?? 'Build request rejected.');

const stream = await fetch(`${base}/api/jobs/${jobId}/events`);
const reader = stream.body.getReader();
const decode = new TextDecoder();
let buffer = '';
let outcome = null;

while (!outcome) {
  const { value, done } = await reader.read();
  if (done) break;
  buffer += decode.decode(value, { stream: true });
  const parts = buffer.split('\n\n');
  buffer = parts.pop() ?? '';
  for (const part of parts) {
    if (!part.startsWith('data: ')) continue;
    const event = JSON.parse(part.slice(6));
    if (event.type === 'stage') {
      console.log(`· ${event.stage.agent.padEnd(9)} ${event.stage.output} (${event.stage.durationMs}ms)`);
    } else {
      outcome = event;
    }
  }
}
if (outcome?.type === 'error') {
  console.error('FAILED:', outcome.message);
  process.exit(1);
}
if (!outcome) {
  console.error('No terminal event received.');
  process.exit(1);
}

const site = outcome.result.site;
console.log(
  `\n/preview/${site.id}  ${outcome.result.totalMs}ms wall  kind=${site.sourceKind}  theme=${site.theme.name}` +
    ` hero=${site.theme.heroLayout} art=${site.theme.artStyle} sig=${site.theme.signature} comp=${site.theme.composition}`,
);
console.log('title:', site.title);
console.log('description:', site.seo.description);
console.log('blocks:', site.blocks.map((block) => block.kind).join(' → '));
for (const block of site.blocks) {
  const label = block.kind.padEnd(12);
  switch (block.kind) {
    case 'hero':
      console.log(label, JSON.stringify({ eyebrow: block.eyebrow, headline: block.headline, cta: block.primaryCta.label, facts: block.facts }));
      break;
    case 'stats':
      console.log(label, JSON.stringify(block.items));
      break;
    case 'about':
      console.log(label, block.body.join(' / ').slice(0, 300));
      break;
    case 'marquee':
      console.log(label, block.items.join(' · '));
      break;
    case 'quote':
      console.log(label, `${block.text.slice(0, 120)} — ${block.attribution ?? ''}`);
      break;
    case 'features':
    case 'chapters':
      console.log(label, block.items.map((item) => `${item.title}(${item.tags.join(',')})`).join(' | ').slice(0, 320));
      break;
    case 'process':
      console.log(label, block.steps.map((step) => step.title).join(' → '));
      break;
    case 'offers':
      console.log(label, block.items.map((item) => `${item.name} ${item.price}`).join(' | ').slice(0, 320));
      break;
    case 'agenda':
      console.log(label, block.items.map((item) => `${item.time} ${item.title}`).join(' | ').slice(0, 320));
      break;
    case 'team':
      console.log(label, block.items.map((person) => `${person.name}/${person.role}`).join(' | ').slice(0, 320));
      break;
    case 'testimonials':
      console.log(label, block.items.map((item) => `${item.quote.slice(0, 60)}—${item.author}`).join(' | ').slice(0, 320));
      break;
    case 'faq':
      console.log(label, block.items.map((item) => item.question).join(' | ').slice(0, 320));
      break;
    case 'posts':
      console.log(label, block.items.map((item) => `${item.meta ?? ''} ${item.title}`).join(' | ').slice(0, 320));
      break;
    case 'gallery':
      console.log(label, `${block.items.length} tiles (${block.items.filter((tile) => tile.src.startsWith('data:image')).length} uploaded, generated=${block.generated})`);
      break;
    case 'skills':
      console.log(label, block.groups.map((group) => `${group.name}: ${group.items.join(', ')}`).join(' | ').slice(0, 320));
      break;
    case 'experience':
      console.log(label, block.entries.map((entry) => `${entry.role} @ ${entry.org} (${entry.period}) x${entry.bullets.length}`).join(' | ').slice(0, 320));
      break;
    case 'projects':
      console.log(label, block.items.map((item) => `${item.name} [${item.tags.join(', ')}] ${item.link ?? ''}`).join(' | ').slice(0, 320));
      break;
    case 'education':
      console.log(label, JSON.stringify(block.items).slice(0, 320));
      break;
    case 'cta':
      console.log(label, `${block.heading} — ${block.button.label} → ${block.button.href}`);
      break;
    case 'contact':
      console.log(label, [block.email, block.phone, block.address, ...block.links.map((link) => `${link.label}->${link.href}`)].filter(Boolean).join(', '));
      break;
    default:
      break;
  }
}
if (site.observations.length) {
  console.log('\nobservations:');
  for (const line of site.observations) console.log(' -', line);
}
console.log('\ndecisions:');
for (const line of site.decisions) console.log(' -', line);
console.log('elapsed since upload:', Date.now() - start, 'ms');
