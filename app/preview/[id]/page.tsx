import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import GeneratedSite, { fontsHref } from '@/components/site/GeneratedSite';
import { loadSite } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const record = await loadSite(id);
  if (!record) return { title: 'Site not found' };
  const { seo } = record.result.site;
  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    openGraph: {
      title: seo.openGraph.title,
      description: seo.openGraph.description,
      type: seo.openGraph.type,
    },
  };
}

/** The published surface: every byte here comes from the generated SiteSpec. */
export default async function PreviewPage({ params }: Props) {
  const { id } = await params;
  const record = await loadSite(id);
  if (!record) notFound();

  const site = record.result.site;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name: site.ownerName,
      description: site.seo.description,
      sameAs: site.blocks
        .filter((block) => block.kind === 'contact')
        .flatMap((block) => (block.kind === 'contact' ? block.links.map((link) => link.href) : [])),
    },
  };

  return (
    <>
      <link rel="stylesheet" href={fontsHref(site.theme)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <GeneratedSite site={site} />
    </>
  );
}
