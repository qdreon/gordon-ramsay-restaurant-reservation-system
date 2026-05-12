import { NextResponse } from 'next/server';
import { getAllMenuItems } from '@/services/menuService';

/**
 * GET /api/menu (QDR-82)
 *
 * Purpose:
 *   Fetch all available menu items for display on the customer portal
 *   Used by MenuDisplay component to show view-only digital menu (FR-2)
 *
 * Requirements (FR-2):
 *   - Return all available menu items
 *   - Public endpoint (no auth required)
 *   - Used on availability search page alongside table options
 *
 * Response:
 *   {
 *     "items": [
 *       {
 *         "id": "uuid",
 *         "name": "Beef Wellington",
 *         "description": "Prime beef with mushroom duxelles...",
 *         "price": 45.00,
 *         "category": "Main",
 *         "available": true,
 *         "created_at": "2026-05-12T..."
 *       },
 *       ...
 *     ]
 *   }
 */
export async function GET() {
  try {
    // Fetch menu items from service layer
    const items = await getAllMenuItems();

    return NextResponse.json(
      { items },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch menu items.';
    console.error('Menu API error:', message);

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
