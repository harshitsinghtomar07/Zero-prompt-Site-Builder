# Zero Prompt Site Builder

Build websites without writing a single prompt. Upload a résumé, a menu, a deck, a catalogue — or a
photo of a paper menu — and six agents decide what the site should be, design it, write it, draw what
is missing, and hand back a live preview.

**One upload. One click. One unique website.**

## Run it

```bash
npm install
npm run dev            # http://localhost:3000
```

No API key is required — the pipeline runs on a deterministic engine. Add one to let the model
polish the copy:

```bash
cp .env.example .env.local   # ANTHROPIC_API_KEY (OpenAI key works as the documented fallback)
```

Helper scripts:

```bash
npm run make-sample    # writes public/sample-resume.pdf from the text fixture
npm run verify         # uploads the sample PDF to a running dev server and prints what the agents produced
npm run typecheck
```

## What happens between upload and publish

`POST /api/build` starts a job and returns immediately; the browser follows progress over SSE at
`GET /api/jobs/:id/events`, so each agent reports as it finishes.

| Agent | File | Output |
| --- | --- | --- |
| Document intake | [lib/ingest/index.ts](lib/ingest/index.ts) | text from PDF / Office / text formats; photos are read with on-device OCR ([lib/ingest/ocr.ts](lib/ingest/ocr.ts)) |
| Content Intelligence | [lib/agents/content-intelligence.ts](lib/agents/content-intelligence.ts) | structured `ContentProfile` |
| Site Strategy | [lib/agents/site-strategy.ts](lib/agents/site-strategy.ts) | category, audience, goal, section order |
| Design Intelligence | [lib/agents/design-intelligence.ts](lib/agents/design-intelligence.ts) | `ThemeTokens`: palette, type, spacing, hero posture |
| Content Generation | [lib/agents/content-generation.ts](lib/agents/content-generation.ts) | block copy + SEO metadata |
| Visual Generation | [lib/agents/visual-generation.ts](lib/agents/visual-generation.ts) | theme-matched SVG hero art |
| Build | [lib/agents/build-agent.ts](lib/agents/build-agent.ts) | assembled `SiteSpec` + quality audit |

The orchestrator is [lib/pipeline.ts](lib/pipeline.ts). Hero art and model polish run concurrently
because neither depends on the other.

Everything downstream is data-driven: [components/site/GeneratedSite.tsx](components/site/GeneratedSite.tsx)
renders any `SiteSpec` with no category-specific code, and `/preview/:id` is the published surface.

## Decisions worth knowing

- **The deterministic engine is the product, the LLM is a polish pass.** Parsing, strategy, design,
  and copy all work with no model available, so a demo cannot fail on an API error or a rate limit.
  When a key is present, [lib/agents/llm-polish.ts](lib/agents/llm-polish.ts) rewrites only hero,
  about, CTA, and metadata, clamps every field, and falls back to the draft on any error.
- **Nothing is invented.** Sections are dropped when the upload cannot substantiate them
  (`substantiated()` in the build agent), and testimonials only ever render from quotes present in
  the source. A generated site must be describable by its owner without caveats.
- **Uniqueness is seeded, not random.** [lib/uniqueness.ts](lib/uniqueness.ts) hashes the content to
  drive section rotation, theme selection, palette nudges, hero layout, and art composition, so the
  same upload reproduces and different uploads diverge.
- **Accessibility is checked, not assumed.** The build agent computes WCAG contrast ratios for text,
  muted text, and button labels, repairs the palette when a pair fails, and reports the numbers in
  the "why these choices" panel.
- **Storage is one interface deep.** [lib/store.ts](lib/store.ts) writes JSON to `.data/sites/`; the
  Supabase table replaces this file without touching the agents.

## Measured on this machine

Sample resume PDF (2 pages, ~2.9k characters), no API key:

```
ingest 45ms · content 16ms · strategy 2ms · design 4ms · copy 5ms · visual 2ms · build 3ms
full preview: under 100ms server-side, ~1.3s including upload and round trips
```

That is well inside the 5s / 10s / 20s / 30s targets. With a model key the polish pass adds its own
latency, bounded by the request timeout in [lib/ai/llm.ts](lib/ai/llm.ts).

## Scope of this scaffold

Implemented: résumés, menus, decks, catalogues, blogs, and event pages in any text or Office format
(PDF, DOCX, PPTX, XLSX, RTF, Markdown, CSV, JSON, YAML, XML, email, HTML, TXT) plus photographed
documents (JPEG/PNG via [tesseract.js](https://npmjs.com/package/tesseract.js), English, on-device,
no API key) → all eleven site kinds, with live preview, publish, and a gallery of generated sites.

Next, in order: more OCR languages → GitHub and LinkedIn imports, real Supabase persistence, and
Vercel deploys that push the stored `SiteSpec` into a repo build.
