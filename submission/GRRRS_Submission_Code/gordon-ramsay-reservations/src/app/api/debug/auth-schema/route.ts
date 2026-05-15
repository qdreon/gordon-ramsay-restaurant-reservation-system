import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    const admin = createServiceSupabaseClient();

    const [usersColumns, customersColumns, roleEnum, triggerInfo] = await Promise.all([
      admin.rpc('exec_sql', {
        sql: `select column_name, data_type, is_nullable, column_default from information_schema.columns where table_schema = 'public' and table_name = 'users' order by ordinal_position;`,
      } as never),
      admin.rpc('exec_sql', {
        sql: `select column_name, data_type, is_nullable, column_default from information_schema.columns where table_schema = 'public' and table_name = 'customers' order by ordinal_position;`,
      } as never),
      admin.rpc('exec_sql', {
        sql: `select e.enumlabel from pg_enum e join pg_type t on t.oid = e.enumtypid where t.typname = 'user_role' order by e.enumsortorder;`,
      } as never),
      admin.rpc('exec_sql', {
        sql: `select tgname, pg_get_triggerdef(t.oid) as definition from pg_trigger t join pg_class c on c.oid = t.tgrelid where c.relname = 'users' and not t.tgisinternal order by tgname;`,
      } as never),
    ]);

    return NextResponse.json(
      {
        usersColumns: usersColumns.data,
        customersColumns: customersColumns.data,
        roleEnum: roleEnum.data,
        triggerInfo: triggerInfo.data,
        errors: [usersColumns.error, customersColumns.error, roleEnum.error, triggerInfo.error]
          .filter(Boolean)
          .map((entry) => (entry as { message?: string }).message ?? String(entry)),
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error collecting auth schema details.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}