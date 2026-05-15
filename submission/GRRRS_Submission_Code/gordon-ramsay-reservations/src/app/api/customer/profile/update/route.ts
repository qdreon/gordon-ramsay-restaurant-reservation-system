import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

/**
 * POST /api/customer/profile/update (QDR-59)
 *
 * Purpose:
 *   Allow authenticated customers to update their profile information
 *   including dietary restrictions, phone number, preferred contact method, etc.
 *   Implements FR-1 requirement for customer profile management
 *
 * Authentication:
 *   Required - Bearer token from Supabase auth session
 *
 * Request Body:
 *   {
 *     "phone_number": "+1-555-0100" (optional),
 *     "dietary_restrictions": "vegetarian, gluten-free" (optional),
 *     "preferred_contact": "email|sms|phone" (optional),
 *     "special_requests": "window seating preferred" (optional)
 *   }
 *
 * Response:
 *   {
 *     "success": true,
 *     "customer": { updated customer object }
 *   }
 *
 * Status Codes:
 *   200 - Profile updated successfully
 *   400 - Invalid request body
 *   401 - Unauthorized (no auth session)
 *   404 - Customer profile not found
 *   500 - Database error
 */
export async function POST(request: NextRequest) {
  try {
    // Get auth session from request cookies
    const supabase = await createServerSupabaseClient();
    
    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = (await request.json()) as {
      phone_number?: string;
      dietary_restrictions?: string;
      preferred_contact?: string;
      special_requests?: string;
    };

    // Validate at least one field is being updated
    const updateFields = Object.keys(body).length;
    if (updateFields === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Build update payload
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.phone_number !== undefined) {
      updateData.phone_number = body.phone_number || null;
    }
    if (body.dietary_restrictions !== undefined) {
      updateData.dietary_restrictions = body.dietary_restrictions || null;
    }
    if (body.preferred_contact !== undefined) {
      updateData.preferred_contact = body.preferred_contact || null;
    }
    if (body.special_requests !== undefined) {
      updateData.special_requests = body.special_requests || null;
    }

    // Update customer profile in the database
    const { data, error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Profile update error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to update profile' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Customer profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        customer: data,
      },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Profile update failed';
    console.error('Profile update endpoint error:', message);

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
