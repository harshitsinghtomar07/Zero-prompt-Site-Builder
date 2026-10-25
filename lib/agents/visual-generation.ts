import type { ThemeTokens } from '@/lib/types/site';
import { SeededPicker } from '@/lib/uniqueness';

function safe(input: string, max = 3): string {
  return input.replace(/[^A-Za-z0-9 .&+-]/g, '').slice(0, max);
}

function escapeXml(input: string): string {
  return input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function frame(body: string, background: string): string {
  return `<svg viewBox="0 0 640 640" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" role="img"><rect width="640" height="640" fill="${background}"/>${body}</svg>`;
}

/** Agent 5: builds brand-matched vector art instead of waiting for image assets. */
export function generateHeroArt(theme: ThemeTokens, seedKey: string): string {
  const seed = new SeededPicker(`${seedKey}:art`);
  const { palette } = theme;
  const uid = seedKey.replace(/[^a-z0-9]/gi, '').slice(0, 8);

  switch (theme.artStyle) {
    case 'mesh': {
      const blobs = Array.from({ length: 6 }, (_, i) => {
        const fill = [palette.accent, palette.accent2, palette.hero.via][i % 3];
        return `<circle cx="${(80 + seed.next() * 480).toFixed(0)}" cy="${(80 + seed.next() * 480).toFixed(0)}" r="${(120 + seed.next() * 200).toFixed(0)}" fill="${fill}" opacity="${(0.16 + seed.next() * 0.24).toFixed(2)}" filter="url(#blur-${uid})"/>`;
      }).join('');
      return `<svg viewBox="0 0 640 640" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" role="img"><defs><filter id="blur-${uid}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="52"/></filter></defs><rect width="640" height="640" fill="${palette.hero.from}"/>${blobs}</svg>`;
    }
    case 'blueprint': {
      const grid = Array.from({ length: 13 }, (_, i) =>
        `<line x1="0" y1="${i * 52}" x2="640" y2="${i * 52}" stroke="${palette.border}" stroke-width="1"/><line x1="${i * 52}" y1="0" x2="${i * 52}" y2="640" stroke="${palette.border}" stroke-width="1"/>`,
      ).join('');
      const nodes = Array.from({ length: 10 }, () =>
        `<circle cx="${(60 + seed.next() * 520).toFixed(0)}" cy="${(60 + seed.next() * 520).toFixed(0)}" r="${(4 + seed.next() * 9).toFixed(1)}" fill="${palette.accent}" opacity="0.9"/>`,
      ).join('');
      const links = Array.from({ length: 7 }, () =>
        `<line x1="${(60 + seed.next() * 520).toFixed(0)}" y1="${(60 + seed.next() * 520).toFixed(0)}" x2="${(60 + seed.next() * 520).toFixed(0)}" y2="${(60 + seed.next() * 520).toFixed(0)}" stroke="${palette.accent2}" stroke-width="1.5" opacity="0.45"/>`,
      ).join('');
      return frame(`${grid}${links}${nodes}`, palette.surfaceAlt);
    }
    case 'waves': {
      const paths = Array.from({ length: 8 }, (_, i) => {
        const y = 90 + i * 76;
        const amp = 22 + seed.next() * 46;
        return `<path d="M-20 ${y} C 140 ${y - amp}, 300 ${y + amp}, 660 ${y - amp / 2}" fill="none" stroke="${i % 3 === 0 ? palette.accent : i % 3 === 1 ? palette.accent2 : palette.border}" stroke-width="${1 + seed.next() * 3.4}" opacity="${(0.28 + seed.next() * 0.5).toFixed(2)}"/>`;
      }).join('');
      return frame(paths, palette.hero.from);
    }
    case 'orbit': {
      const rings = Array.from({ length: 6 }, (_, i) =>
        `<ellipse cx="320" cy="320" rx="${80 + i * 52}" ry="${(80 + i * 52) * (0.42 + seed.next() * 0.5)}" fill="none" stroke="${i % 2 ? palette.border : palette.accent2}" stroke-width="1.2" opacity="${(0.8 - i * 0.1).toFixed(2)}" transform="rotate(${(seed.next() * 60 - 30).toFixed(0)} 320 320)"/>`,
      ).join('');
      const dots = Array.from({ length: 9 }, () => {
        const ring = 80 + seed.int(6) * 52;
        const angle = seed.next() * Math.PI * 2;
        return `<circle cx="${(320 + ring * Math.cos(angle)).toFixed(0)}" cy="${(320 + ring * Math.sin(angle)).toFixed(0)}" r="${(3 + seed.next() * 10).toFixed(1)}" fill="${seed.chance(0.5) ? palette.accent : palette.accent2}"/>`;
      }).join('');
      return `<svg viewBox="0 0 640 640" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" role="img"><defs><radialGradient id="g-${uid}"><stop offset="0%" stop-color="${palette.hero.via}"/><stop offset="100%" stop-color="${palette.hero.to}"/></radialGradient></defs><rect width="640" height="640" fill="url(#g-${uid})"/>${rings}${dots}</svg>`;
    }
    case 'stack': {
      const blocks = Array.from({ length: 11 }, (_, i) => {
        const w = 90 + seed.next() * 210;
        const h = 50 + seed.next() * 160;
        const fill = i % 4 === 0 ? palette.accent : i % 3 === 0 ? palette.accent2 : palette.surface;
        return `<rect x="${(seed.next() * (640 - w)).toFixed(0)}" y="${(seed.next() * (640 - h)).toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" rx="${theme.radius.replace('px', '')}" fill="${fill}" opacity="${(0.3 + seed.next() * 0.55).toFixed(2)}"/>`;
      }).join('');
      return frame(blocks, palette.hero.from);
    }
    case 'topo': {
      const lines = Array.from({ length: 14 }, (_, i) => {
        const base = 40 + i * 44;
        const wobble = 18 + seed.next() * 40;
        const d = `M-20 ${base} Q 120 ${base - wobble}, 240 ${base} T 500 ${base - wobble / 2} T 700 ${base}`;
        return `<path d="${d}" fill="none" stroke="${i % 4 === 0 ? palette.accent : palette.border}" stroke-width="${i % 4 === 0 ? 2 : 1}" opacity="${(0.35 + (i % 3) * 0.2).toFixed(2)}"/>`;
      }).join('');
      return frame(lines, palette.hero.from);
    }
    case 'rays': {
      const rays = Array.from({ length: 16 }, (_, i) => {
        const angle = (i / 16) * Math.PI * 2;
        const x2 = 320 + Math.cos(angle) * 520;
        const y2 = 320 + Math.sin(angle) * 520;
        return `<line x1="320" y1="320" x2="${x2.toFixed(0)}" y2="${y2.toFixed(0)}" stroke="${i % 3 === 0 ? palette.accent : palette.accent2}" stroke-width="${(1 + seed.next() * 5).toFixed(1)}" opacity="${(0.1 + seed.next() * 0.35).toFixed(2)}"/>`;
      }).join('');
      return `<svg viewBox="0 0 640 640" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" role="img"><defs><radialGradient id="r-${uid}"><stop offset="0%" stop-color="${palette.accentSoft}"/><stop offset="100%" stop-color="${palette.hero.to}"/></radialGradient></defs><rect width="640" height="640" fill="url(#r-${uid})"/>${rays}<circle cx="320" cy="320" r="${40 + seed.next() * 40}" fill="${palette.accent}" opacity="0.85"/></svg>`;
    }
    case 'confetti': {
      const shapes = Array.from({ length: 46 }, () => {
        const x = seed.next() * 640;
        const y = seed.next() * 640;
        const size = 6 + seed.next() * 26;
        const fill = [palette.accent, palette.accent2, palette.text, palette.hero.via][seed.int(4)];
        const rotate = (seed.next() * 90).toFixed(0);
        return seed.chance(0.45)
          ? `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(size / 2).toFixed(0)}" fill="${fill}" opacity="${(0.35 + seed.next() * 0.5).toFixed(2)}"/>`
          : `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${size.toFixed(0)}" height="${(size * 0.42).toFixed(0)}" rx="3" fill="${fill}" opacity="${(0.35 + seed.next() * 0.5).toFixed(2)}" transform="rotate(${rotate} ${x.toFixed(0)} ${y.toFixed(0)})"/>`;
      }).join('');
      return frame(shapes, palette.hero.from);
    }
    default: {
      const step = 26;
      const dots = Array.from({ length: 24 }, (_, row) =>
        Array.from({ length: 24 }, (_, col) => {
          const radius = 1.6 + ((row + col + seed.int(4)) % 7) * 1.5;
          const fill = (row + col) % 5 === 0 ? palette.accent : palette.border;
          return `<circle cx="${col * step + 12}" cy="${row * step + 12}" r="${radius.toFixed(1)}" fill="${fill}" opacity="${(0.25 + seed.next() * 0.6).toFixed(2)}"/>`;
        }).join(''),
      ).join('');
      return frame(dots, palette.hero.from);
    }
  }
}

/** Fallback tiles so a gallery is never empty just because the upload had no photos. */
export function generateGalleryTiles(theme: ThemeTokens, seedKey: string, count: number): string[] {
  const styles: ThemeTokens['artStyle'][] = ['mesh', 'topo', 'confetti', 'waves', 'orbit', 'rays', 'halftone', 'stack'];
  return Array.from({ length: Math.min(count, 9) }, (_, index) => {
    const variant = styles[(styles.indexOf(theme.artStyle) + index) % styles.length];
    return generateHeroArt({ ...theme, artStyle: variant }, `${seedKey}:tile-${index}`);
  });
}

/**
 * Avatar tile for a named person. Colours come from the page's CSS custom
 * properties, so the same markup works in any theme without threading tokens
 * through the renderer.
 */
export function monogram(name: string): string {
  const initials = safe(
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join(''),
    3,
  );
  return `<svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeXml(safe(name, 40))}"><defs><linearGradient id="mono-${escapeXml(slug(name))}" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" style="stop-color:var(--accent-soft)"/><stop offset="100%" style="stop-color:var(--surface-alt)"/></linearGradient></defs><rect width="160" height="160" rx="34" fill="url(#mono-${escapeXml(slug(name))})"/><text x="80" y="82" text-anchor="middle" dominant-baseline="central" font-size="60" font-weight="600" style="fill:var(--accent)">${initials || '•'}</text></svg>`;
}

function slug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'x'
  );
}
