import { NextResponse } from 'next/server';
import { loadSite } from '@/lib/store';

export const runtime = 'nodejs';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const record = await loadSite(id);
  if (!record) return NextResponse.json({ error: 'Site not found.' }, { status: 404 });
  return NextResponse.json(record);
}
