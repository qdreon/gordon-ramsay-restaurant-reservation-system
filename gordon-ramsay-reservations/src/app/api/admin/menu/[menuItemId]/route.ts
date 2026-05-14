import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/apiAuth";
import {
  deleteAdminMenuItem,
  updateAdminMenuItem,
  type MenuCategory,
} from "@/services/menuService";

interface UpdateMenuBody {
  name?: string;
  description?: string | null;
  price?: number;
  category?: string;
  image_url?: string | null;
  available?: boolean;
  sort_order?: number;
}

const VALID_CATEGORIES: MenuCategory[] = [
  "starters",
  "mains",
  "desserts",
  "sides",
  "beverages",
];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ menuItemId: string }> },
) {
  try {
    const auth = await requireAdminApi(request);
    if (!auth.ok) return auth.response;

    const { menuItemId } = await params;
    if (!menuItemId) {
      return NextResponse.json(
        { error: "menuItemId is required" },
        { status: 400 },
      );
    }

    const body = (await request.json()) as UpdateMenuBody;

    if (
      body.category !== undefined &&
      !VALID_CATEGORIES.includes(body.category as MenuCategory)
    ) {
      return NextResponse.json(
        { error: `category must be one of: ${VALID_CATEGORIES.join(", ")}` },
        { status: 400 },
      );
    }

    if (
      body.price !== undefined &&
      (typeof body.price !== "number" ||
        Number.isNaN(body.price) ||
        body.price < 0)
    ) {
      return NextResponse.json(
        { error: "price must be a non-negative number" },
        { status: 400 },
      );
    }

    const updated = await updateAdminMenuItem(menuItemId, {
      name: body.name,
      description: body.description,
      price: body.price,
      category: body.category as MenuCategory | undefined,
      image_url: body.image_url,
      available: body.available,
      sort_order: body.sort_order,
    });

    return NextResponse.json({ item: updated }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update menu item";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ menuItemId: string }> },
) {
  try {
    const auth = await requireAdminApi(request);
    if (!auth.ok) return auth.response;

    const { menuItemId } = await params;
    if (!menuItemId) {
      return NextResponse.json(
        { error: "menuItemId is required" },
        { status: 400 },
      );
    }

    await deleteAdminMenuItem(menuItemId);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete menu item";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
