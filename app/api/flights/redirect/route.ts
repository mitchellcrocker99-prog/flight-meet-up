import { NextRequest, NextResponse } from 'next/server';
import { buildGoogleFlightsUrl } from '@/lib/google-flights';

export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get('from');
  const to = req.nextUrl.searchParams.get('to');

  if (!from || !to) {
    return NextResponse.json({ error: 'from and to are required' }, { status: 400 });
  }

  const url = buildGoogleFlightsUrl(from.toUpperCase(), to.toUpperCase());
  return NextResponse.redirect(url);
}
