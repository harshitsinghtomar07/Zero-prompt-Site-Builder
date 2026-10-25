import type { SiteSpec, ThemeTokens } from '@/lib/types/site';
import { BlockRenderer, StickyBar } from './blocks';

export function fontsHref(theme: ThemeTokens): string {
  const families = [...new Set([theme.fonts.heading, theme.fonts.body, theme.fonts.mono])]
    .map((name) => `family=${name.replace(/ /g, '+')}:wght@400;500;600;700`)
    .join('&');
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

/**
 * Renders any SiteSpec. Nothing here is category-specific: every difference a
 * visitor sees comes from the theme tokens and the block data the agents chose.
 */
export default function GeneratedSite({ site }: { site: SiteSpec }) {
  const { palette, fonts } = site.theme;
  const heroBg = `linear-gradient(${palette.hero.angle}deg, ${palette.hero.from}, ${palette.hero.via}, ${palette.hero.to})`;

  const variables = {
    '--bg': palette.bg,
    '--surface': palette.surface,
    '--surface-alt': palette.surfaceAlt,
    '--border': palette.border,
    '--text': palette.text,
    '--muted': palette.muted,
    '--accent': palette.accent,
    '--accent-soft': palette.accentSoft,
    '--accent-2': palette.accent2,
    '--on-accent': palette.onAccent,
    '--hero-bg': heroBg,
    '--radius': site.theme.radius,
    '--gap': `${site.theme.sectionSpacing}px`,
    '--wide': site.theme.maxContentWidth,
    '--narrow': '920px',
    '--heading-weight': site.theme.headingWeight,
    '--tracking': site.theme.headingTracking,
    '--font-heading': fonts.heading,
    '--font-body': fonts.body,
    '--font-mono': fonts.mono,
  } as React.CSSProperties;

  return (
    <div
      className={`site-root min-h-full font-sans antialiased ${site.theme.motion === 'kinetic' ? 'kinetic' : ''}`}
      data-signature={site.theme.signature}
      data-composition={site.theme.composition}
      style={{ ...variables, background: palette.bg, color: palette.text }}
    >
      <a
        href="#hero"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:px-3 focus:py-2 focus:text-xs"
        style={{ background: palette.accent, color: palette.onAccent }}
      >
        Skip to content
      </a>

      <StickyBar className="border-b">
        <div className="mx-auto flex max-w-[var(--wide)] items-center justify-between gap-6 px-5 py-4 sm:px-8" style={{ background: `${palette.bg}cc` }}>
          <a href="#hero" className="font-display shrink-0 text-sm font-semibold" style={{ color: palette.text }}>
            {site.nav.brand}
          </a>
          <nav className="hidden min-w-0 gap-6 overflow-x-auto whitespace-nowrap md:flex">
            {site.nav.items.map((item) => (
              <a key={item.href} href={item.href} className="text-xs transition hover:opacity-70" style={{ color: palette.muted }}>
                {item.label}
              </a>
            ))}
          </nav>
          {site.nav.cta && (
            <a
              href={site.nav.cta.href}
              className="lift shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold"
              style={{ background: palette.accent, color: palette.onAccent }}
            >
              {site.nav.cta.label}
            </a>
          )}
        </div>
      </StickyBar>

      <main>
        {site.blocks.map((block, index) => (
          <BlockRenderer key={`${block.kind}-${index}`} block={block} />
        ))}
      </main>
    </div>
  );
}
