import { NextResponse } from 'next/server';
import { ensureServiceCatalog } from '@/lib/server/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await ensureServiceCatalog();
    return NextResponse.json({ data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('GET /api/services failed:', error);
    return NextResponse.json({ error: 'Could not load the service catalog.' }, { status: 500 });
  }
}
