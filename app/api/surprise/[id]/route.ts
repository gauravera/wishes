import { NextRequest, NextResponse } from 'next/server';
import { getSurpriseById } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const record = await getSurpriseById(id);
    if (!record) {
      return NextResponse.json({ error: 'Surprise not found or has expired.' }, { status: 404 });
    }
    if (record.isExpired) {
      return NextResponse.json(
        { error: 'This e-card was valid for 24 hours and has now expired.', expired: true },
        { status: 410 }
      );
    }
    return NextResponse.json(record);
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to fetch surprise: ' + err.message },
      { status: 500 }
    );
  }
}
