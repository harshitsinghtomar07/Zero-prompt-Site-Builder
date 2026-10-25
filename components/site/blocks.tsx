import type {
  AboutBlock,
  AgendaBlock,
  Block,
  ChaptersBlock,
  ContactBlock,
  CtaBlock,
  EducationBlock,
  ExperienceBlock,
  FaqBlock,
  FeaturesBlock,
  FooterBlock,
  GalleryBlock,
  HeroBlock,
  MarqueeBlock,
  OffersBlock,
  PostsBlock,
  ProcessBlock,
  ProjectsBlock,
  QuoteBlock,
  SkillsBlock,
  StatsBlock,
  TeamBlock,
  TestimonialsBlock,
} from '@/lib/types/site';
import { CountUp, Reveal, Spotlight, StickyBar } from './motion';
import { monogram } from '@/lib/agents/visual-generation';

export { StickyBar };

function Section({
  id,
  title,
  kicker,
  intro,
  wide,
  children,
}: {
  id: string;
  title?: string;
  kicker?: string;
  intro?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="site-section px-5 sm:px-8" style={{ paddingBlock: 'var(--gap)' }}>
      <div className="mx-auto w-full" style={{ maxWidth: wide ? 'var(--wide)' : 'var(--narrow)' }}>
        {(title || kicker) && (
          <Reveal>
            {kicker && (
              <p className="mb-3 font-mono text-[11px] uppercase" style={{ color: 'var(--accent)', letterSpacing: '0.18em' }}>
                {kicker}
              </p>
            )}
            {title && (
              <h2
                className="section-title font-display text-3xl sm:text-4xl"
                style={{ fontWeight: 'var(--heading-weight)', letterSpacing: 'var(--tracking)', color: 'var(--text)' }}
              >
                {title}
              </h2>
            )}
            {intro && (
              <p className="mt-3 max-w-2xl text-base leading-relaxed" style={{ color: 'var(--muted)' }}>
                {intro}
              </p>
            )}
          </Reveal>
        )}
        <div className={title ? 'mt-8' : ''}>{children}</div>
      </div>
    </section>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="rounded-full border px-2.5 py-1 font-mono text-[11px]"
      style={{ borderColor: 'var(--border)', color: 'var(--muted)', background: 'var(--surface-alt)' }}
    >
      {children}
    </span>
  );
}

function Art({ markup, className }: { markup: string; className?: string }) {
  if (!markup.startsWith('<svg')) return null;
  return (
    <div
      className={`art-frame overflow-hidden rounded-[var(--radius)] border shadow-2xl ${className ?? ''}`}
      style={{ borderColor: 'var(--border)', background: 'var(--surface-alt)' }}
      // Vector art generated server-side from the theme, never from raw user text.
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}

function Tile({ src, caption, index }: { src: string; caption: string; index: number }) {
  const heights = ['aspect-[4/5]', 'aspect-[4/3]', 'aspect-square', 'aspect-[3/4]'];
  const inner = src.startsWith('data:image') ? (
    <img src={src} alt={caption} loading="lazy" className="h-full w-full object-cover" />
  ) : (
    <div className="art-frame h-full w-full" dangerouslySetInnerHTML={{ __html: src }} />
  );
  return (
    <Reveal delay={(index % 6) * 70} className="group">
      <figure
        className="lift framed overflow-hidden rounded-[var(--radius)] border"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        <div className={`${heights[index % heights.length]} w-full overflow-hidden`}>{inner}</div>
        {caption && (
          <figcaption className="px-4 py-3 text-xs" style={{ color: 'var(--muted)' }}>
            {caption}
          </figcaption>
        )}
      </figure>
    </Reveal>
  );
}

function Hero({ block }: { block: HeroBlock }) {
  const layout = block.variant.split('-').slice(1).join('-') || 'split';
  const withArt = layout === 'split' || layout === 'asymmetric' || layout === 'editorial';
  const columns = layout === 'editorial' ? '1.45fr 1fr' : layout === 'asymmetric' ? '1.25fr 0.85fr' : '1fr 1fr';

  if (layout === 'canvas') {
    return (
      <section id="hero" className="site-hero hero-canvas relative overflow-hidden px-5 sm:px-8" style={{ paddingBlock: 'clamp(72px, 16vh, 168px)' }}>
        <div className="pointer-events-none absolute inset-0 opacity-45">
          <div className="art-frame h-full w-full" dangerouslySetInnerHTML={{ __html: block.art }} />
        </div>
        <div className="relative mx-auto max-w-[var(--wide)]">
          <Reveal>
            <p className="mb-4 font-mono text-xs uppercase" style={{ color: 'var(--accent)', letterSpacing: '0.2em' }}>
              {block.eyebrow}
            </p>
            <h1 className="hero-title font-display" style={{ color: 'var(--text)', fontWeight: 'var(--heading-weight)', letterSpacing: 'var(--tracking)' }}>
              {block.headline}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed" style={{ color: 'var(--muted)' }}>
              {block.subheadline}
            </p>
            <HeroActions block={block} />
            <HeroFacts block={block} />
          </Reveal>
        </div>
      </section>
    );
  }

  if (layout === 'stacked') {
    return (
      <section id="hero" className="site-hero relative overflow-hidden px-5 sm:px-8" style={{ paddingBlock: 'clamp(64px, 12vh, 140px) 0' }}>
        <div className="mx-auto max-w-[var(--wide)]">
          <Reveal>
            <p className="mb-4 font-mono text-xs uppercase" style={{ color: 'var(--accent)', letterSpacing: '0.2em' }}>
              {block.eyebrow}
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h1
              className="hero-title font-display"
              style={{ color: 'var(--text)', fontWeight: 'var(--heading-weight)', letterSpacing: 'var(--tracking)', fontSize: 'clamp(2.8rem, 9vw, 7rem)' }}
            >
              {block.headline}
            </h1>
          </Reveal>
          <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <Reveal delay={160}>
              <p className="max-w-xl text-lg leading-relaxed" style={{ color: 'var(--muted)' }}>
                {block.subheadline}
              </p>
              <HeroActions block={block} />
            </Reveal>
            <Reveal delay={220}>
              <HeroFacts block={block} />
            </Reveal>
          </div>
        </div>
        <div className="mt-14 h-[clamp(180px,32vh,380px)] w-full overflow-hidden border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="art-frame h-full w-full" dangerouslySetInnerHTML={{ __html: block.art }} />
        </div>
      </section>
    );
  }

  const centered = layout === 'centered';
  return (
    <section id="hero" className="site-hero relative overflow-hidden px-5 sm:px-8" style={{ paddingBlock: 'clamp(56px, 12vh, 132px)' }}>
      <div
        className="mx-auto grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-[var(--hero-cols)]"
        style={{ maxWidth: 'var(--wide)', '--hero-cols': centered ? '1fr' : columns } as React.CSSProperties}
      >
        <Reveal className={centered ? 'text-center' : ''}>
          <p className="mb-4 font-mono text-xs uppercase" style={{ color: 'var(--accent)', letterSpacing: '0.18em' }}>
            {block.eyebrow}
          </p>
          <h1 className="hero-title font-display" style={{ color: 'var(--text)', fontWeight: 'var(--heading-weight)', letterSpacing: 'var(--tracking)' }}>
            {block.headline}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed" style={{ color: 'var(--muted)', marginInline: centered ? 'auto' : undefined }}>
            {block.subheadline}
          </p>
          <HeroActions block={block} centered={centered} />
        </Reveal>
        {withArt && (
          <Reveal delay={140}>
            <Art markup={block.art} className={layout === 'asymmetric' ? 'aspect-[4/5] translate-y-4' : 'aspect-[4/3]'} />
          </Reveal>
        )}
      </div>
      {block.facts.length > 0 && (
        <Reveal delay={200}>
          <HeroFacts block={block} />
        </Reveal>
      )}
    </section>
  );
}

function HeroActions({ block, centered }: { block: HeroBlock; centered?: boolean }) {
  return (
    <div className="mt-8 flex flex-wrap gap-3" style={{ justifyContent: centered ? 'center' : undefined }}>
      <a
        href={block.primaryCta.href}
        className="lift rounded-[var(--radius)] px-5 py-3 text-sm font-semibold"
        style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
      >
        {block.primaryCta.label}
      </a>
      {block.secondaryCta && (
        <a
          href={block.secondaryCta.href}
          className="lift rounded-[var(--radius)] border px-5 py-3 text-sm font-semibold"
          style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
        >
          {block.secondaryCta.label}
        </a>
      )}
    </div>
  );
}

function HeroFacts({ block }: { block: HeroBlock }) {
  if (!block.facts.length) return null;
  return (
    <div
      className="mt-12 grid w-full gap-px overflow-hidden rounded-[var(--radius)] border sm:grid-cols-3"
      style={{ borderColor: 'var(--border)', background: 'var(--border)' }}
    >
      {block.facts.map((fact) => (
        <div key={fact.label} className="p-5" style={{ background: 'var(--surface)' }}>
          <p className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
            {fact.label}
          </p>
          <p className="mt-1 text-sm font-medium" style={{ color: 'var(--text)' }}>
            {fact.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function Marquee({ block }: { block: MarqueeBlock }) {
  const items = [...block.items, ...block.items];
  return (
    <div className="marquee-mask overflow-hidden border-y py-4" style={{ borderColor: 'var(--border)', background: 'var(--surface-alt)' }}>
      <div className="marquee-track">
        {items.map((item, index) => (
          <span key={`${item}-${index}`} className="font-mono text-xs uppercase" style={{ color: 'var(--muted)', letterSpacing: '0.16em' }}>
            <span style={{ color: 'var(--accent)' }}>◆</span> {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function About({ block }: { block: AboutBlock }) {
  const lead = block.variant === 'lead';
  return (
    <Section id="about" title={block.heading} kicker={lead ? undefined : 'About'} wide={!lead}>
      <div className={lead ? '' : 'grid gap-10 md:grid-cols-[1.3fr_0.7fr]'}>
        <Reveal>
          <div className="space-y-4">
            {block.body.map((paragraph, index) => (
              <p
                key={index}
                style={{
                  color: 'var(--text)',
                  fontSize: index === 0 && lead ? '1.4rem' : '1.05rem',
                  lineHeight: 1.7,
                  maxWidth: '68ch',
                }}
              >
                {paragraph}
              </p>
            ))}
          </div>
        </Reveal>
        {block.highlights.length > 0 && (
          <Reveal delay={120}>
            <ul className="space-y-3 border-l pl-5" style={{ borderColor: 'var(--border)' }}>
              {block.highlights.map((item) => (
                <li key={item} className="text-sm" style={{ color: 'var(--muted)' }}>
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        )}
      </div>
    </Section>
  );
}

function PullQuote({ block }: { block: QuoteBlock }) {
  return (
    <Section id="quote">
      <Reveal>
        <figure>
          <div className="mb-5 h-[3px] w-14" style={{ background: 'var(--accent)' }} />
          <blockquote className="pull-quote font-display" style={{ color: 'var(--text)', fontWeight: 'var(--heading-weight)' }}>
            “{block.text}”
          </blockquote>
          {block.attribution && (
            <figcaption className="mt-5 font-mono text-xs uppercase" style={{ color: 'var(--muted)', letterSpacing: '0.16em' }}>
              {block.attribution}
            </figcaption>
          )}
        </figure>
      </Reveal>
    </Section>
  );
}

function Stats({ block }: { block: StatsBlock }) {
  const band = block.variant === 'band';
  return (
    <Section id="stats" title={band ? block.heading : undefined} wide>
      <div
        className={band ? 'grid gap-px overflow-hidden rounded-[var(--radius)] border sm:grid-cols-4' : 'grid gap-8 sm:grid-cols-2 lg:grid-cols-4'}
        style={band ? { borderColor: 'var(--border)', background: 'var(--border)' } : undefined}
      >
        {block.items.map((item, index) => (
          <Reveal key={`${item.value}-${index}`} delay={index * 80}>
            <div style={band ? { background: 'var(--surface)', padding: '1.75rem' } : undefined}>
              <CountUp value={item.value} label={item.label} />
              <p className="mt-2 text-sm leading-snug" style={{ color: 'var(--muted)' }}>
                {item.label}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

function Features({ block }: { block: FeaturesBlock }) {
  const grid = block.variant === 'bento' ? 'bento' : block.variant === 'rows' ? 'space-y-3' : 'grid gap-5 sm:grid-cols-2 lg:grid-cols-3';
  return (
    <Section id="features" title={block.heading} intro={block.intro} wide>
      <div className={grid}>
        {block.items.map((item, index) => (
          <Reveal key={`${item.title}-${index}`} delay={(index % 6) * 70}>
            <Spotlight className="h-full">
              <article
                className="lift framed flex h-full flex-col rounded-[var(--radius)] border p-6"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
              >
                <span className="font-mono text-[11px]" style={{ color: 'var(--accent)' }}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-3 text-lg font-semibold" style={{ color: 'var(--text)' }}>
                  {item.title}
                </h3>
                {item.body && (
                  <p className="mt-2 flex-1 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                    {item.body}
                  </p>
                )}
                {item.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.tags.map((tag) => (
                      <Chip key={tag}>{tag}</Chip>
                    ))}
                  </div>
                )}
              </article>
            </Spotlight>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

function Process({ block }: { block: ProcessBlock }) {
  return (
    <Section id="process" title={block.heading} intro={block.intro} wide>
      <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {block.steps.map((step, index) => (
          <Reveal key={step.title} delay={index * 90}>
            <li className="relative h-full">
              <div
                className="font-display mb-3 text-5xl"
                style={{ color: 'var(--accent)', opacity: 0.35, fontWeight: 'var(--heading-weight)' }}
              >
                {String(index + 1).padStart(2, '0')}
              </div>
              <h3 className="text-base font-semibold" style={{ color: 'var(--text)' }}>
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                {step.body}
              </p>
              <span className="absolute left-0 top-[3.2rem] hidden h-px w-full md:block" style={{ background: 'var(--border)' }} />
            </li>
          </Reveal>
        ))}
      </ol>
    </Section>
  );
}

function Chapters({ block }: { block: ChaptersBlock }) {
  if (block.variant === 'sticky') {
    return (
      <Section id="chapters" title={block.heading} wide>
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.6fr]">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <Reveal>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                The narrative below is the order the source material told its own story — nothing was reordered for effect.
              </p>
              <div className="mt-6 space-y-1">
                {block.items.map((item) => (
                  <p key={item.title} className="font-mono text-xs uppercase" style={{ color: 'var(--muted)', letterSpacing: '0.12em' }}>
                    {item.title}
                  </p>
                ))}
              </div>
            </Reveal>
          </div>
          <div className="space-y-4">
            {block.items.map((item, index) => (
              <Reveal key={item.title} delay={(index % 4) * 60}>
                <article
                  className="lift framed rounded-[var(--radius)] border p-7"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                >
                  <p className="font-mono text-[11px] uppercase" style={{ color: 'var(--accent)', letterSpacing: '0.16em' }}>
                    {String(index + 1).padStart(2, '0')} — {item.title}
                  </p>
                  <p className="mt-3 text-base leading-relaxed" style={{ color: 'var(--text)' }}>
                    {item.body}
                  </p>
                  {item.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {item.tags.map((tag) => (
                        <Chip key={tag}>{tag}</Chip>
                      ))}
                    </div>
                  )}
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </Section>
    );
  }

  return (
    <Section id="chapters" title={block.heading} wide>
      <div className="grid gap-px overflow-hidden rounded-[var(--radius)] border sm:grid-cols-2" style={{ borderColor: 'var(--border)', background: 'var(--border)' }}>
        {block.items.map((item, index) => (
          <Reveal key={item.title} delay={(index % 4) * 60}>
            <article className="h-full p-7" style={{ background: 'var(--surface)' }}>
              <p className="font-mono text-[11px] uppercase" style={{ color: 'var(--accent)', letterSpacing: '0.16em' }}>
                {String(index + 1).padStart(2, '0')} — {item.title}
              </p>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text)' }}>
                {item.body}
              </p>
            </article>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

function Offers({ block }: { block: OffersBlock }) {
  if (block.variant === 'menu') {
    return (
      <Section id="offers" title={block.heading} intro={block.intro} kicker={block.note}>
        <div className="grid gap-x-12 gap-y-2 md:grid-cols-2">
          {block.items.map((item, index) => (
            <Reveal key={`${item.name}-${index}`} delay={(index % 8) * 45}>
              <div className="flex items-baseline gap-3 border-b py-3" style={{ borderColor: 'var(--border)' }}>
                <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                  {item.name}
                </span>
                <span className="flex-1 border-b border-dashed" style={{ borderColor: 'var(--border)' }} />
                <span className="font-mono text-sm" style={{ color: 'var(--accent)' }}>
                  {item.price}
                </span>
              </div>
              {item.detail && (
                <p className="pb-3 text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
                  {item.detail}
                </p>
              )}
            </Reveal>
          ))}
        </div>
      </Section>
    );
  }

  return (
    <Section id="offers" title={block.heading} intro={block.intro} kicker={block.note} wide>
      <div className={block.variant === 'rows' ? 'space-y-3' : 'grid gap-5 sm:grid-cols-2 lg:grid-cols-3'}>
        {block.items.map((item, index) => (
          <Reveal key={`${item.name}-${index}`} delay={(index % 6) * 70}>
            <article
              className="lift framed relative flex h-full flex-col rounded-[var(--radius)] border p-6"
              style={{
                borderColor: item.featured ? 'var(--accent)' : 'var(--border)',
                background: item.featured ? 'var(--accent-soft)' : 'var(--surface)',
              }}
            >
              {item.featured && (
                <span className="absolute -top-2 right-5 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase" style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}>
                  Popular
                </span>
              )}
              <h3 className="text-base font-semibold" style={{ color: 'var(--text)' }}>
                {item.name}
              </h3>
              {item.price && (
                <p className="font-display mt-2 text-3xl" style={{ color: 'var(--accent)', fontWeight: 'var(--heading-weight)' }}>
                  {item.price}
                </p>
              )}
              {item.detail && (
                <p className="mt-2 flex-1 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                  {item.detail}
                </p>
              )}
              {item.tags.length > 0 && (
                <ul className="mt-4 space-y-1">
                  {item.tags.map((tag) => (
                    <li key={tag} className="text-xs" style={{ color: 'var(--muted)' }}>
                      <span style={{ color: 'var(--accent)' }}>—</span> {tag}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

function Gallery({ block }: { block: GalleryBlock }) {
  return (
    <Section id="gallery" title={block.heading} intro={block.intro} wide>
      <div className={block.variant === 'masonry' ? 'masonry' : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'}>
        {block.items.map((item, index) => (
          <Tile key={`${item.caption}-${index}`} src={item.src} caption={item.caption} index={index} />
        ))}
      </div>
      {block.generated && (
        <p className="mt-5 font-mono text-[11px]" style={{ color: 'var(--muted)' }}>
          Tiles are generated to match the design system — upload images and they replace these.
        </p>
      )}
    </Section>
  );
}

function Agenda({ block }: { block: AgendaBlock }) {
  return (
    <Section id="agenda" title={block.heading} intro={block.intro}>
      <ol className="relative space-y-4 border-l pl-8" style={{ borderColor: 'var(--border)' }}>
        {block.items.map((item, index) => (
          <Reveal key={`${item.title}-${index}`} delay={(index % 6) * 60}>
            <li className="relative">
              <span className="absolute -left-[2.28rem] top-1.5 h-3 w-3 rounded-full" style={{ background: 'var(--accent)' }} />
              <p className="font-mono text-xs" style={{ color: 'var(--accent)' }}>
                {item.time || `Slot ${index + 1}`}
              </p>
              <h3 className="mt-1 text-base font-semibold" style={{ color: 'var(--text)' }}>
                {item.title}
              </h3>
              {item.body && (
                <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                  {item.body}
                </p>
              )}
            </li>
          </Reveal>
        ))}
      </ol>
    </Section>
  );
}

function Team({ block }: { block: TeamBlock }) {
  return (
    <Section id="team" title={block.heading} intro={block.intro} wide>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {block.items.map((person, index) => (
          <Reveal key={`${person.name}-${index}`} delay={(index % 4) * 70}>
            <article
              className="lift framed flex h-full flex-col items-start gap-3 rounded-[var(--radius)] border p-5"
              style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
            >
              <div
                className="art-frame h-14 w-14 shrink-0 overflow-hidden rounded-xl"
                dangerouslySetInnerHTML={{ __html: monogram(person.name) }}
              />
              <div>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                  {person.name}
                </h3>
                <p className="text-xs" style={{ color: 'var(--accent)' }}>
                  {person.role}
                </p>
              </div>
              {person.note && (
                <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
                  {person.note}
                </p>
              )}
            </article>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

function Testimonials({ block }: { block: TestimonialsBlock }) {
  return (
    <Section id="testimonials" title={block.heading} wide={block.variant === 'wall'}>
      <div className={block.variant === 'wall' ? 'masonry' : 'grid gap-5 sm:grid-cols-2'}>
        {block.items.map((item, index) => (
          <Reveal key={`${item.author}-${index}`} delay={(index % 6) * 70}>
            <figure
              className="lift framed rounded-[var(--radius)] border p-6"
              style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
            >
              <span className="font-display text-3xl" style={{ color: 'var(--accent)' }}>
                “
              </span>
              <blockquote className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text)' }}>
                {item.quote}
              </blockquote>
              <figcaption className="mt-4 text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                {item.author}
                {item.role ? ` — ${item.role}` : ''}
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

function Faq({ block }: { block: FaqBlock }) {
  return (
    <Section id="faq" title={block.heading}>
      <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
        {block.items.map((item, index) => (
          <Reveal key={`${item.question}-${index}`} delay={(index % 6) * 50}>
            <details
              className="faq-item py-4"
              style={{ borderColor: 'var(--border)', borderBottom: '1px solid var(--border)' }}
              open={index === 0}
            >
              <summary className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                {item.question}
              </summary>
              {item.answer && (
                <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                  {item.answer}
                </p>
              )}
            </details>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

function Posts({ block }: { block: PostsBlock }) {
  return (
    <Section id="posts" title={block.heading} wide>
      <div className="space-y-px overflow-hidden rounded-[var(--radius)] border" style={{ borderColor: 'var(--border)', background: 'var(--border)' }}>
        {block.items.map((post, index) => (
          <Reveal key={`${post.title}-${index}`} delay={(index % 6) * 60}>
            <article className="lift grid gap-2 p-6 sm:grid-cols-[160px_1fr]" style={{ background: 'var(--surface)' }}>
              <p className="font-mono text-xs" style={{ color: 'var(--accent)' }}>
                {post.meta || `Entry ${index + 1}`}
              </p>
              <div>
                <h3 className="text-base font-semibold" style={{ color: 'var(--text)' }}>
                  {post.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                  {post.body}
                </p>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

function Skills({ block }: { block: SkillsBlock }) {
  const columns = block.variant === 'columns';
  return (
    <Section id="skills" title={block.heading} intro={block.intro} wide>
      <div className={columns ? 'grid gap-5 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-5'}>
        {block.groups.map((group, index) => (
          <Reveal key={group.name} delay={(index % 5) * 60}>
            <div className="framed rounded-[var(--radius)] border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                {group.name}
              </p>
              <div className="flex flex-wrap gap-2">
                {group.items.map((item) => (
                  <Chip key={item}>{item}</Chip>
                ))}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

function Experience({ block }: { block: ExperienceBlock }) {
  const timeline = block.variant === 'timeline';
  return (
    <Section id="experience" title={block.heading}>
      <div className={timeline ? '' : 'grid gap-5 sm:grid-cols-2'}>
        {block.entries.map((entry, index) => (
          <Reveal key={`${entry.role}-${index}`} delay={(index % 4) * 70}>
            <article
              className={timeline ? 'relative border-l py-5 pl-8' : 'lift framed h-full rounded-[var(--radius)] border p-6'}
              style={{ borderColor: 'var(--border)', background: timeline ? undefined : 'var(--surface)' }}
            >
              {timeline && (
                <span className="absolute -left-[7px] top-7 h-3.5 w-3.5 rounded-full" style={{ background: 'var(--accent)' }} />
              )}
              <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
                {entry.period}
              </p>
              <h3 className="mt-1 text-lg font-semibold" style={{ color: 'var(--text)' }}>
                {entry.role}
              </h3>
              <p className="text-sm" style={{ color: 'var(--accent)' }}>
                {entry.org}
                {entry.location ? ` · ${entry.location}` : ''}
              </p>
              <ul className="mt-3 space-y-2">
                {entry.bullets.map((bullet, i) => (
                  <li key={i} className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                    {bullet}
                  </li>
                ))}
              </ul>
              {entry.stack && entry.stack.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {entry.stack.map((item) => (
                    <Chip key={item}>{item}</Chip>
                  ))}
                </div>
              )}
            </article>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

function Projects({ block }: { block: ProjectsBlock }) {
  const grid = block.variant === 'grid';
  return (
    <Section id="projects" title={block.heading} intro={block.intro} wide>
      <div className={grid ? 'grid gap-5 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-3'}>
        {block.items.map((item, index) => (
          <Reveal key={`${item.name}-${index}`} delay={(index % 6) * 60}>
            <a
              href={item.link ?? '#contact'}
              target={item.link ? '_blank' : undefined}
              rel="noreferrer"
              className="lift framed block h-full rounded-[var(--radius)] border p-6"
              style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
            >
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
                {item.name}
              </h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                {item.blurb}
              </p>
              {item.tags.length > 0 && (
                <p className="mt-3 font-mono text-xs" style={{ color: 'var(--accent)' }}>
                  {item.tags.join(' / ')}
                </p>
              )}
            </a>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

function Education({ block }: { block: EducationBlock }) {
  return (
    <Section id="education" title={block.heading}>
      <div className="space-y-3">
        {block.items.map((item, index) => (
          <Reveal key={index} delay={index * 60}>
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b pb-3" style={{ borderColor: 'var(--border)' }}>
              <div>
                <p className="text-base font-semibold" style={{ color: 'var(--text)' }}>
                  {item.award}
                </p>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  {[item.org, item.detail].filter(Boolean).join(' — ')}
                </p>
              </div>
              <p className="font-mono text-xs" style={{ color: 'var(--accent)' }}>
                {item.period}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

function CallToAction({ block }: { block: CtaBlock }) {
  const band = block.variant === 'band';
  return (
    <Section id="cta" wide>
      <Reveal>
        <div
          className="framed relative overflow-hidden rounded-[var(--radius)] p-8 sm:p-12"
          style={{
            background: band ? 'var(--accent)' : 'var(--surface)',
            border: band ? undefined : '1px solid var(--border)',
            color: band ? 'var(--on-accent)' : 'var(--text)',
          }}
        >
          <h2 className="font-display text-3xl" style={{ fontWeight: 'var(--heading-weight)' }}>
            {block.heading}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed" style={{ opacity: 0.85 }}>
            {block.body}
          </p>
          <a
            href={block.button.href}
            className="lift mt-6 inline-block rounded-[var(--radius)] px-5 py-3 text-sm font-semibold"
            style={{ background: band ? 'var(--surface)' : 'var(--accent)', color: band ? 'var(--text)' : 'var(--on-accent)' }}
          >
            {block.button.label}
          </a>
        </div>
      </Reveal>
    </Section>
  );
}

function Contact({ block }: { block: ContactBlock }) {
  const panel = block.variant === 'panel';
  return (
    <Section id="contact" title={block.heading}>
      <div className={panel ? 'framed rounded-[var(--radius)] border p-7' : ''} style={panel ? { borderColor: 'var(--border)', background: 'var(--surface)' } : undefined}>
        <p className="mb-6 max-w-2xl text-sm" style={{ color: 'var(--muted)' }}>
          {block.body}
        </p>
        <div className="flex flex-wrap gap-3">
          {block.email && (
            <a href={`mailto:${block.email}`} className="lift rounded-[var(--radius)] px-4 py-2 text-sm font-medium" style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}>
              {block.email}
            </a>
          )}
          {block.phone && (
            <a href={`tel:${block.phone.replace(/\D/g, '')}`} className="lift rounded-[var(--radius)] border px-4 py-2 text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
              {block.phone}
            </a>
          )}
          {block.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="lift rounded-[var(--radius)] border px-4 py-2 text-sm"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              {link.label} ↗
            </a>
          ))}
        </div>
        {(block.address || block.availability) && (
          <p className="mt-5 font-mono text-xs" style={{ color: 'var(--muted)' }}>
            {[block.address, block.availability].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
    </Section>
  );
}

function Footer({ block }: { block: FooterBlock }) {
  return (
    <footer className="border-t px-5 py-10 sm:px-8" style={{ borderColor: 'var(--border)', background: 'var(--surface-alt)' }}>
      <div className="mx-auto flex max-w-[var(--wide)] flex-wrap items-center justify-between gap-4">
        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          {block.note}
        </p>
        <nav className="flex flex-wrap gap-4">
          {block.nav.map((item) => (
            <a key={item.href} href={item.href} className="text-xs" style={{ color: 'var(--text)' }}>
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}

export function BlockRenderer({ block }: { block: Block }) {
  switch (block.kind) {
    case 'hero':
      return <Hero block={block} />;
    case 'marquee':
      return <Marquee block={block} />;
    case 'about':
      return <About block={block} />;
    case 'quote':
      return <PullQuote block={block} />;
    case 'stats':
      return <Stats block={block} />;
    case 'features':
      return <Features block={block} />;
    case 'process':
      return <Process block={block} />;
    case 'chapters':
      return <Chapters block={block} />;
    case 'offers':
      return <Offers block={block} />;
    case 'gallery':
      return <Gallery block={block} />;
    case 'agenda':
      return <Agenda block={block} />;
    case 'team':
      return <Team block={block} />;
    case 'testimonials':
      return <Testimonials block={block} />;
    case 'faq':
      return <Faq block={block} />;
    case 'posts':
      return <Posts block={block} />;
    case 'skills':
      return <Skills block={block} />;
    case 'experience':
      return <Experience block={block} />;
    case 'projects':
      return <Projects block={block} />;
    case 'education':
      return <Education block={block} />;
    case 'cta':
      return <CallToAction block={block} />;
    case 'contact':
      return <Contact block={block} />;
    case 'footer':
      return <Footer block={block} />;
    default:
      return null;
  }
}
