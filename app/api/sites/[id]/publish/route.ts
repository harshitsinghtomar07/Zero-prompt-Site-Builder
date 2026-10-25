import { NextResponse } from 'next/server';
import { publishSite } from '@/lib/store';

export const runtime = 'nodejs';

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const record = await publishSite(id);
  if (!record) return NextResponse.json({ error: 'Site not found.' }, { status: 404 });
  // Vercel deploy target: push the stored SiteSpec to a repo and trigger a build.
  return NextResponse.json({ id: record.result.id, publishedAt: record.publishedAt, url: `/preview/${record.result.id}` });
}
