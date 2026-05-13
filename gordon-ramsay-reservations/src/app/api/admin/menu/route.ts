import { NextResponse } from 'next/server';
import { createAdminMenuItem, getAdminMenuItems, type MenuCategory } from '@/services/menuService';

interface CreateMenuBody {
  name?: string;
  description?: string | null;
  price?: number;
  category?: string;
  image_url?: string | null;
  available?: boolean;
  sort_order?: number;
}

const VALID_CATEGORIES: MenuCategory[] = ['starters', 'mains', 'desserts', 'sides', 'beverages'];

export async function GET() {
  try {
    const items = await getAdminMenuItems();
    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch admin menu items';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateMenuBody;

    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    if (typeof body.price !== 'number' || Number.isNaN(body.price) || body.price < 0) {
      return NextResponse.json({ error: 'price must be a non-negative number' }, { status: 400 });
    }

    if (!body.category || !VALID_CATEGORIES.includes(body.category as MenuCategory)) {
      return NextResponse.json(
        { error: `category must be one of: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    const created = await createAdminMenuItem({
      name: body.name,
      description: body.description,
      price: body.price,
      category: body.category as MenuCategory,
      image_url: body.image_url,
      available: body.available,
      sort_order: body.sort_order,
    });

    return NextResponse.json({ item: created }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create menu item';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}