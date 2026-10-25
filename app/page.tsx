import Builder from '@/components/Builder';
import { listSites } from '@/lib/store';
import { llmStatus } from '@/lib/ai/llm';

// Reads the generated-site store on every request so the gallery stays current.
export const dynamic = 'force-dynamic';

const AGENTS = [
  ['01', 'Content Intelligence', 'Reads the upload, detects industry, audience, and intent, and builds a structured profile.'],
  ['02', 'Site Strategy', 'Decides the sitemap, navigation, section order, and the conversion goal to design around.'],
  ['03', 'Design Intelligence', 'Picks a design system: palette, type pairing, spacing rhythm, hero posture, art language.'],
  ['04', 'Content Generation', 'Writes headlines, section copy, CTAs, and SEO metadata from the source material only.'],
  ['05', 'Visual Generation', 'Draws brand-matched vector art when the upload has no imagery to reuse.'],
  ['06', 'Build', 'Assembles responsive blocks, audits contrast, and ships the site.'],
];

export default async function Home() {
  const [sites, provider] = await Promise.all([listSites(), Promise.resolve(llmStatus())]);

  return (
    <main className="studio-grid">
      <div className="mx-auto max-w-[1180px] px-5 pb-24 pt-16 sm:px-8">
        <p className="font-mono text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--studio-accent-2)' }}>
          One upload · one click · one unique website
        </p>
        <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">
          Build websites without writing a single prompt
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed" style={{ color: 'var(--studio-muted)' }}>
          Drop in a résumé, a restaurant menu, a pitch deck, a product catalogue, or a blog — in any format, including a
          photo of a paper menu. Six agents read it, work out what the site should be, design it, write it, draw what is
          missing, and hand back a live preview. Templates, themes, and prompt boxes are not part of this product.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-3 text-xs" style={{ color: 'var(--studio-muted)' }}>
          <span className="rounded-full border px-3 py-1" style={{ borderColor: 'var(--studio-border)' }}>
            AI provider: {provider.enabled ? `${provider.provider} · ${provider.model}` : 'deterministic engine (add a key to polish copy)'}
          </span>
          <span className="rounded-full border px-3 py-1" style={{ borderColor: 'var(--studio-border)' }}>
            Target: full preview in under 30s
          </span>
        </div>

        <div className="mt-12">
          <Builder />
        </div>

        {sites.length > 0 && (
          <section className="mt-20">
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--studio-muted)' }}>
              Recently generated
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sites.slice(0, 6).map((site) => (
                <a
                  key={site.id}
                  href={`/preview/${site.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border p-4 transition hover:-translate-y-0.5"
                  style={{ borderColor: 'var(--studio-border)', background: 'var(--studio-panel)' }}
                >
                  <p className="truncate text-sm font-medium">{site.ownerName || site.title}</p>
                  <p className="mt-1 text-xs" style={{ color: 'var(--studio-muted)' }}>
                    {site.theme.name} · {site.blocks.length} sections · {site.category.replace(/_/g, ' ')}
                  </p>
                </a>
              ))}
            </div>
          </section>
        )}

        <section className="mt-24">
          <h2 className="text-2xl font-semibold">What runs between upload and publish</h2>
          <div className="mt-6 grid gap-px overflow-hidden rounded-2xl border sm:grid-cols-2 lg:grid-cols-3" style={{ borderColor: 'var(--studio-border)', background: 'var(--studio-border)' }}>
            {AGENTS.map(([index, name, blurb]) => (
              <div key={name} className="p-6" style={{ background: 'var(--studio-panel)' }}>
                <p className="font-mono text-xs" style={{ color: 'var(--studio-accent)' }}>
                  Agent {index}
                </p>
                <p className="mt-2 text-base font-semibold">{name}</p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--studio-muted)' }}>
                  {blurb}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ['Any document, any kind', 'A CV becomes a portfolio, a CSV a menu, a deck a landing page, a JSON catalogue a store — the format is never chosen.'],
            ['Photos are read too', 'A picture of a paper menu is read with on-device text recognition — no cloud, no API key — and becomes a real restaurant site.'],
            ['No theme picking', 'The design system is inferred from industry, audience, seniority, and the density of the content.'],
            ['Uniqueness engine', 'Seeded from the upload: section order, palette, hero layout, and art all vary between builds.'],
            ['Honest copy', 'Nothing is invented. No fake metrics, no invented testimonials, no filler sections.'],
            ['Accessible and fast', 'Every build is contrast-audited, keyboard-navigable, and ships real SEO and Open Graph metadata.'],
          ].map(([title, body]) => (
            <div key={title} className="rounded-2xl border p-6" style={{ borderColor: 'var(--studio-border)', background: 'var(--studio-panel)' }}>
              <p className="text-sm font-semibold">{title}</p>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--studio-muted)' }}>
                {body}
              </p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
