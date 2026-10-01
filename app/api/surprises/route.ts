import { NextResponse } from 'next/server';
import { getSurprises } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET() {
  const surprises = await getSurprises();
  const list = Object.values(surprises).map((s) => ({
    id: s.id,
    sender: s.sender,
    receiver: s.receiver,
    photoCount: (s.photos || []).length,
    createdAt: s.createdAt,
  }));
  return NextResponse.json(list);
}
