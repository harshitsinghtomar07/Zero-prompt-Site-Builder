import { createHash } from 'node:crypto';

/** Deterministic PRNG so every generated site is reproducible from its content. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class SeededPicker {
  private random: () => number;

  constructor(readonly seed: string) {
    const digest = createHash('sha256').update(seed).digest();
    this.random = mulberry32(digest.readUInt32LE(0));
  }

  next(): number {
    return this.random();
  }

  int(maxExclusive: number): number {
    return Math.floor(this.random() * maxExclusive);
  }

  pick<T>(options: readonly T[]): T {
    return options[this.int(options.length)];
  }

  /** Rotation keeps "different" inputs from collapsing onto the same variant. */
  pickOffset<T>(options: readonly T[], offset: number): T {
    return options[(this.int(options.length) + offset) % options.length];
  }

  shuffle<T>(items: readonly T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  chance(probability: number): boolean {
    return this.random() < probability;
  }
}

/** A short human-readable id that doubles as the preview URL slug. */
export function siteId(seed: string): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const digest = createHash('sha256').update(`id:${seed}`).digest();
  let out = '';
  for (let i = 0; i < 8; i++) out += alphabet[digest[i] % alphabet.length];
  return out;
}
