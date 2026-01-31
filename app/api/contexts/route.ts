import { NextResponse } from 'next/server';
import { loadEmergenceData } from '@/lib/mandrel';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const data = await loadEmergenceData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching contexts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contexts from Mandrel' },
      { status: 500 }
    );
  }
}
