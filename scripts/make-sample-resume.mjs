#!/usr/bin/env node
/**
 * Builds a real (uncompressed) PDF from public/sample-resume.txt so the resume-PDF
 * path can be exercised locally: npm run make-sample -> public/sample-resume.pdf
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const source = join(process.cwd(), 'public', 'sample-resume.txt');
const target = join(process.cwd(), 'public', 'sample-resume.pdf');

const lines = (await readFile(source, 'utf8'))
  .split('\n')
  .map((line) => line.replace(/[^\x20-\x7E]/g, ' '));

const fontSize = 10;
const leading = 14;
const marginX = 48;
const marginTop = 780;
const perPage = 48;

const escape = (value) => value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

const pages = [];
for (let i = 0; i < lines.length; i += perPage) pages.push(lines.slice(i, i + perPage));

// Object plan: 1 catalog, 2 pages tree, 3 font, then (page, content) pairs from 4.
const fontNumber = 3;
const pageNumbers = pages.map((_, index) => 4 + index * 2);
const contentNumbers = pageNumbers.map((number) => number + 1);

const objects = new Map();
objects.set(1, '<< /Type /Catalog /Pages 2 0 R >>');
objects.set(2, `<< /Type /Pages /Kids [${pageNumbers.map((n) => `${n} 0 R`).join(' ')}] /Count ${pages.length} >>`);
objects.set(fontNumber, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

pages.forEach((pageLines, index) => {
  const content = pageLines
    .map((line, lineIndex) => `BT /F1 ${fontSize} Tf ${marginX} ${marginTop - lineIndex * leading} Td (${escape(line)}) Tj ET`)
    .join('\n');
  objects.set(pageNumbers[index], `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontNumber} 0 R >> >> /Contents ${contentNumbers[index]} 0 R >>`);
  objects.set(contentNumbers[index], `<< /Length ${content.length + 1} >>\nstream\n${content}\nendstream`);
});

let pdf = '%PDF-1.4\n';
const offsets = [];
const numbers = [...objects.keys()].sort((a, b) => a - b);
for (const number of numbers) {
  offsets.push([number, pdf.length]);
  pdf += `${number} 0 obj\n${objects.get(number)}\nendobj\n`;
}

const xrefStart = pdf.length;
pdf += `xref\n0 ${numbers.length + 1}\n0000000000 65535 f \n`;
for (const [, offset] of offsets) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
pdf += `trailer\n<< /Size ${numbers.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

await writeFile(target, Buffer.from(pdf, 'latin1'));
console.log(`Wrote public/sample-resume.pdf (${pages.length} page${pages.length === 1 ? '' : 's'}, ${lines.length} lines).`);
