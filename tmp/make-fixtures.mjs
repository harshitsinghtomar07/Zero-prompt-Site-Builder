import { deflateRawSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const out = (name, data) => {
  writeFileSync(`tmp/${name}`, data);
  console.log(`wrote tmp/${name} (${typeof data === 'string' ? Buffer.byteLength(data) : data.length} bytes)`);
};

// ---------- ZIP builder (for DOCX / PPTX / XLSX / plain archive) ----------
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function zip(entries) {
  const chunks = [];
  const central = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const raw = Buffer.from(entry.data, 'utf8');
    const compressed = entry.compress === false ? raw : deflateRawSync(raw);
    const method = compressed.length < raw.length ? 8 : 0;
    const crc = crc32(raw);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(0x5821, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(name.length, 26);
    chunks.push(local, name, compressed);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(method, 10);
    cd.writeUInt16LE(0x5821, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(compressed.length, 20);
    cd.writeUInt32LE(raw.length, 24);
    cd.writeUInt16LE(name.length, 28);
    cd.writeUInt32LE(offset, 42);
    central.push(Buffer.concat([cd, name]));
    offset += local.length + name.length + compressed.length;
  }
  const cdBuf = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cdBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...chunks, cdBuf, eocd]);
}

const xml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---------- PDF builder ----------
function pdf(pagesText) {
  const esc = (s) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const objects = [];
  const nPages = pagesText.length;
  const kids = pagesText.map((_, i) => `${4 + i * 2} 0 R`).join(' ');
  objects.push({ id: 1, body: '<< /Type /Catalog /Pages 2 0 R >>' });
  objects.push({ id: 2, body: `<< /Type /Pages /Kids [${kids}] /Count ${nPages} >>` });
  pagesText.forEach((lines, i) => {
    const contentId = 3 + i * 2;
    const pageId = 4 + i * 2;
    const stream =
      `BT\n/F1 13 Tf\n16 TL\n72 740 Td\n` +
      lines.map((line) => `(${esc(line)}) Tj T*`).join('\n') +
      `\nET`;
    objects.push({
      id: contentId,
      body: `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    });
    objects.push({
      id: pageId,
      body: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${3 + nPages * 2} 0 R >> >> /Contents ${contentId} 0 R >>`,
    });
  });
  const fontId = 3 + nPages * 2;
  objects.push({ id: fontId, body: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>' });

  const head = '%PDF-1.4\n';
  let body = '';
  const offsets = {};
  for (const obj of objects) {
    offsets[obj.id] = head.length + body.length;
    body += `${obj.id} 0 obj\n${obj.body}\nendobj\n`;
  }
  let xref = `xref\n0 ${fontId + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= fontId; id++) xref += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  const trailer = `trailer\n<< /Size ${fontId + 1} /Root 1 0 R >>\nstartxref\n${head.length + body.length}\n%%EOF\n`;
  return Buffer.from(head + body + xref + trailer, 'latin1');
}

// ---------- 1. PDF: a real cafe menu ----------
out(
  'spice-garden-menu.pdf',
  pdf([
    [
      'SPICE GARDEN',
      'Coastal Indian Kitchen, Fort Kochi',
      '',
      'STARTERS',
      'Fish Pollichathu, grilled in banana leaf - Rs. 420',
      'Chicken 65, curry leaf and chilli - Rs. 280',
      '',
      'MAIN COURSE',
      'Kerala Meen Curry with red rice - Rs. 460',
      'Butter Chicken with garlic naan - Rs. 390',
      'Veg Thali, unlimited rice and three curries - Rs. 240',
      '',
      'BREADS AND RICE',
      'Garlic Naan - Rs. 60',
      'Malabar Paratha - Rs. 70',
      'Ghee Rice with cashews - Rs. 180',
      '',
      'DESSERTS',
      'Payasam of the day - Rs. 120',
      'Tender Coconut Pudding - Rs. 140',
      '',
      'Open every day, 11.30 am to 11 pm',
      'Reservations: 0484 221 4567',
    ],
  ]),
);

// ---------- 1b. PDF: two nearly empty pages (scanned-PDF observation) ----------
out('scanned-only.pdf', pdf([['Page one'], ['Page two']]));

// ---------- 2. DOCX: design studio brochure (agency) ----------
const docxParagraphs = [
  ['h1', 'Salt & Pen Studio'],
  ['h2', 'Brand identity and web design, Bengaluru'],
  ['p', 'A two-person studio designing logos, packaging and websites for small businesses since 2019.'],
  ['h2', 'Services'],
  ['p', 'Discovery workshop, one week. Rs. 25,000'],
  ['p', 'Identity design, three weeks. Rs. 80,000'],
  ['p', 'Website design and build, four weeks. Rs. 1,20,000'],
  ['h2', 'Selected clients'],
  ['p', 'Chumbak Home, Fern Botanics, Nilaya Coffee Roasters'],
  ['h2', 'What clients say'],
  ['p', 'They rebuilt our brand from scratch and sales followed. — Meera, Fern Botanics'],
  ['p', 'The website paid for itself within a quarter. — Arjun, Nilaya Coffee'],
];
const docxXml =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
  `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>` +
  docxParagraphs
    .map(([style, text]) => {
      const pStyle = style === 'p' ? '' : `<w:pPr><w:pStyle w:val="${style === 'h1' ? 'Heading1' : 'Heading2'}"/></w:pPr>`;
      return `<w:p>${pStyle}<w:r><w:t xml:space="preserve">${xml(text)}</w:t></w:r></w:p>`;
    })
    .join('') +
  `</w:body></w:document>`;
out(
  'studio-brochure.docx',
  zip([
    {
      name: '[Content_Types].xml',
      data:
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
        `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
        `<Default Extension="xml" ContentType="application/xml"/>` +
        `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
        `</Types>`,
    },
    {
      name: '_rels/.rels',
      data:
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
        `</Relationships>`,
    },
    { name: 'word/document.xml', data: docxXml },
  ]),
);

// ---------- 3. PPTX: investor deck ----------
const slides = [
  ['Malgadi Logistics Cloud', "Freight tracking for India's trucking fleets"],
  ['The Problem', '38% of trucks return empty. Fleet owners run on phone calls and paper ledgers.'],
  ['The Product', 'One dashboard for loads, routes and payments. Works on a Rs. 6,000 phone.'],
  ['The Market', '3.2 crore truck trips a year. Rs. 40,000 crore spent on brokers.'],
  ['The Ask', 'Raising Rs. 7 crore seed. 18 months of runway to reach 40 cities.'],
];
const pptxEntries = [];
for (let i = 0; i < slides.length; i++) {
  const [title, body] = slides[i];
  pptxEntries.push({
    name: `ppt/slides/slide${i + 1}.xml`,
    data:
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
      `<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">` +
      `<p:cSld><p:spTree><p:grpSpPr/><p:nvGrpSpPr><p:cNvPr id="1" name=""/></p:nvGrpSpPr>` +
      `<p:sp><p:nvSpPr><p:cNvPr id="2" name="Title ${i + 1}"/><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>` +
      `<p:txBody><a:p><a:r><a:t>${xml(title)}</a:t></a:r></a:p></p:txBody></p:sp>` +
      `<p:sp><p:nvSpPr><p:cNvPr id="3" name="Body ${i + 1}"/><p:nvPr><p:ph type="body"/></p:nvPr></p:nvSpPr>` +
      `<p:txBody><a:p><a:r><a:t>${xml(body)}</a:t></a:r></a:p></p:txBody></p:sp>` +
      `</p:spTree></p:cSld></p:sld>`,
  });
}
out('launch-deck.pptx', zip(pptxEntries));

// ---------- 4. XLSX: pottery store price list ----------
const xlsxRows = [
  ['Item', 'Description', 'Price'],
  ['Terracotta Planter', 'Hand-thrown, 8 inch, glazed', 'Rs. 450'],
  ['Kulhad Cup Set', 'Set of six, unglazed clay', 'Rs. 320'],
  ['Blue Pottery Vase', 'Jaipur style, 10 inch', 'Rs. 890'],
  ['Clay Diya Pack', 'Pack of twelve oil lamps', 'Rs. 180'],
  ['Ceramic Dinner Bowl', 'Food-safe glaze, 12 cm', 'Rs. 260'],
  ['Stone Mortar and Pestle', 'Kota black stone, 15 cm', 'Rs. 540'],
];
const strings = [...new Set(xlsxRows.flat())];
const col = (i) => String.fromCharCode(65 + (i % 26));
const sheetXml =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
  `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>` +
  xlsxRows
    .map(
      (row, r) =>
        `<row r="${r + 1}">` +
        row.map((cell, c) => `<c r="${col(c)}${r + 1}" t="s"><v>${strings.indexOf(cell)}</v></c>`).join('') +
        `</row>`,
    )
    .join('') +
  `</sheetData></worksheet>`;
out(
  'price-list.xlsx',
  zip([
    {
      name: '[Content_Types].xml',
      data:
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
        `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
        `<Default Extension="xml" ContentType="application/xml"/>` +
        `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
        `</Types>`,
    },
    {
      name: '_rels/.rels',
      data:
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
        `</Relationships>`,
    },
    {
      name: 'xl/workbook.xml',
      data:
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
        `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
        `<sheets><sheet name="Price List" sheetId="1"/></sheets></workbook>`,
    },
    {
      name: 'xl/sharedStrings.xml',
      data:
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
        `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
        strings.map((s) => `<si><t>${xml(s)}</t></si>`).join('') +
        `</sst>`,
    },
    { name: 'xl/worksheets/sheet1.xml', data: sheetXml },
  ]),
);

// ---------- 5. TSV: painting contractor services ----------
out(
  'paint-works.tsv',
  [
    'Service\tDescription\tTimeline\tPrice',
    'Interior painting\tWalls and ceiling, one primer and two finish coats\t3 days\tRs. 12 per sq ft',
    'Waterproofing\tTerrace and bathroom sealing with warranty\t2 days\tRs. 85 per sq ft',
    'False ceiling\tGypsum grid with concealed lighting\t5 days\tRs. 95 per sq ft',
    'Wooden flooring\tLaminate planks with skirting included\t4 days\tRs. 140 per sq ft',
  ].join('\n'),
);

// ---------- 6. YAML: bakehouse ----------
out(
  'bakery.yaml',
  [
    'name: Amber Bakehouse',
    'about: Small-batch sourdough and viennoiserie, baked every morning in Indiranagar.',
    'menu:',
    '  - item: Country Sourdough Loaf',
    '    price: Rs. 320',
    '  - item: Butter Croissant',
    '    price: Rs. 120',
    '  - item: Almond Danish',
    '    price: Rs. 150',
    '  - item: Banana Walnut Cake',
    '    price: Rs. 220',
    'hours: Open Tuesday to Sunday, 8 am to 7 pm',
    'phone: "+91 98450 11223"',
  ].join('\n'),
);

// ---------- 7. XML: physiotherapy clinic ----------
out(
  'studio.xml',
  `<?xml version="1.0" encoding="UTF-8"?>
<business>
  <name>Riverstone Physiotherapy</name>
  <about>Hands-on physiotherapy and sports rehab clinic in Koramangala, run by Dr. Anjali Rao.</about>
  <services>
    <service>
      <title>Consultation and assessment</title>
      <detail>45 minutes, movement screening and a written plan.</detail>
      <fee>Rs. 900</fee>
    </service>
    <service>
      <title>Deep tissue session</title>
      <detail>One hour, targeted release work for athletes.</detail>
      <fee>Rs. 1,400</fee>
    </service>
    <service>
      <title>Home visit</title>
      <detail>Within 8 km of the clinic, mornings only.</detail>
      <fee>Rs. 1,800</fee>
    </service>
  </services>
  <hours>Monday to Saturday, 9 am to 7 pm</hours>
  <phone>+91 80 4123 7788</phone>
</business>`,
);

// ---------- 8. EML: law firm enquiry ----------
out(
  'inquiry.eml',
  [
    'From: Ravi Menon <ravi@menonlaw.in>',
    'To: office@menonlaw.in',
    'Subject: Menon & Associates — legal services',
    'Date: Fri, 24 Oct 2026 10:15:00 +0530',
    '',
    'Menon & Associates is a two-partner law firm in Ernakulam handling property due diligence, wills and company registration.',
    '',
    'Our standard engagements:',
    '- Property title check with a written opinion, five working days, Rs. 15,000',
    '- Will drafting with two revisions, one week, Rs. 8,500',
    '- Private limited incorporation, three weeks, Rs. 25,000',
    '',
    'Call the office at 0484 405 2210 or reply to this email to book a consultation.',
  ].join('\r\n'),
);

// ---------- 9. Legacy .doc (OLE container) ----------
{
  const header = Buffer.alloc(600);
  // OLE magic is the byte sequence D0 CF 11 E0 E1 1A B1 A1 (LE-read: 0xe011cfd0, 0xa1b11ae1).
  header.writeUInt32LE(0xe011cfd0, 0);
  header.writeUInt32LE(0xa1b11ae1, 4);
  Buffer.from('Root Entry\0\0WordDocument\0\0SummaryInformation\0').copy(header, 64);
  const text = Buffer.from(
    [
      'Coastal Kayak Tours',
      'Guided kayak trips from Baga beach, Goa, since 2016',
      'Sunrise mangrove paddle, two hours, Rs. 1,500 per person',
      'Full-day island trip with lunch, Rs. 2,800 per person',
      'Beginner lessons on calm water, Rs. 1,200 per person',
      'Call 098221 34567 to book, life jackets and guides included',
    ].join('\n')
      .split('')
      .flatMap((ch) => [ch.charCodeAt(0), 0]),
  );
  out('legacy-notes.doc', Buffer.concat([header, Buffer.from(text)]));
}

// ---------- 10. Empty file ----------
out('empty.txt', '');

// ---------- 11. Unknown binary archive ----------
out('archive.zip', zip([{ name: 'readme.txt', data: 'Internal build artefact. Not for the website. v2.4.1' }]));

console.log('done');
