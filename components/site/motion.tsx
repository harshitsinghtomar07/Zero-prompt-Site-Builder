'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Fades and lifts its children into place the first time they are seen. */
export function Reveal({
  children,
  delay = 0,
  className,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      el.dataset.shown = 'true';
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          el.dataset.shown = 'true';
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -8% 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={clsx('reveal', className)} style={{ ...style, transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/** Counts a stat up from zero when it scrolls into view. */
export function CountUp({ value, label }: { value: string; label: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [shown, setShown] = useState(value);
  const match = value.match(/^([^\d]*)(\d[\d,.]*)(.*)$/);

  useEffect(() => {
    const el = ref.current;
    if (!el || !match) return;
    if (prefersReducedMotion()) return;

    const target = Number(match[2].replace(/,/g, ''));
    if (!Number.isFinite(target) || target === 0) return;
    const decimals = match[2].split('.')[1]?.length ?? 0;
    const grouped = /,/.test(match[2]);
    const frame: { raf: number } = { raf: 0 };
    let started = false;

    const render = (n: number) => {
      const text = n.toFixed(decimals);
      return `${match[1]}${grouped ? Number(text).toLocaleString('en-US', { minimumFractionDigits: decimals }) : text}${match[3]}`;
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting) || started) return;
        started = true;
        observer.disconnect();
        const begin = performance.now();
        const step = (now: number) => {
          const progress = Math.min(1, (now - begin) / 1100);
          const eased = 1 - (1 - progress) ** 3;
          setShown(render(target * eased));
          if (progress < 1) frame.raf = requestAnimationFrame(step);
        };
        frame.raf = requestAnimationFrame(step);
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame.raf);
    };
  }, [match]);

  return (
    <p ref={ref} className="font-display stat-value" aria-label={`${value} ${label}`.trim()}>
      {shown}
    </p>
  );
}

/** Tracks the pointer so cards can carry a spotlight highlight. */
export function Spotlight({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const move = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      el.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
      el.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
    };
    el.addEventListener('pointermove', move);
    return () => el.removeEventListener('pointermove', move);
  }, []);

  return (
    <div ref={ref} className={clsx('spotlight', className)}>
      {children}
    </div>
  );
}

/** Header that condenses once the page is scrolled. */
export function StickyBar({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLElement>(null);
  const [condensed, setCondensed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => setCondensed(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header ref={ref} className={clsx('site-header', condensed && 'is-condensed', className)}>
      {children}
    </header>
  );
}
