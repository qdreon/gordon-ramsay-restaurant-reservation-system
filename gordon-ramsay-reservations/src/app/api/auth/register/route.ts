import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabaseAdmin';

interface RegisterBody {
  email?: string;
  password?: string;
  fullName?: string;
  phone?: string | null;
  consentGiven?: boolean;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RegisterBody;
    const email = body.email?.trim();
    const password = body.password;
    const fullName = body.fullName?.trim();
    const phone = body.phone?.trim() || null;

    if (!email || !password || !fullName) {
      return NextResponse.json({ error: 'Email, password, and full name are required.' }, { status: 400 });
    }

    if (!body.consentGiven) {
      return NextResponse.json({ error: 'Consent is required for registration.' }, { status: 400 });
    }

    const admin = createServiceSupabaseClient();
    const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone,
        consent_given: true,
      },
    });

    if (createError || !createdUser.user) {
      const errorDetails = createError
        ? {
            message: createError.message,
            status: (createError as { status?: number }).status,
            code: (createError as { code?: string }).code,
            name: createError.name,
            hint: (createError as { hint?: string }).hint,
          }
        : null;
      return NextResponse.json(
        { error: createError?.message || 'Unable to create user account.', errorDetails },
        { status: 500 }
      );
    }

    const userId = createdUser.user.id;

    return NextResponse.json(
      {
        user: {
          id: userId,
          email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error during registration.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}