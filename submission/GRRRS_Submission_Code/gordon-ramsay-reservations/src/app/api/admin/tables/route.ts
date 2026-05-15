import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    const adminClient = createServiceSupabaseClient();

    const { data, error } = await adminClient
      .from('tables')
      .select('id, table_number, capacity, status, position_x, position_y, is_combinable, adjacent_table_ids, created_at, updated_at')
      .order('position_y', { ascending: true })
      .order('position_x', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tables: data ?? [] }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error while loading tables.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}