import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    const admin = createServiceSupabaseClient();

    const { data, error } = await admin
      .from('tables')
      .select('id,table_number,capacity,status')
      .limit(5);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ columns: data }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
