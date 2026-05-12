/**
 * menuService.ts
 * ---------------
 * Repository Pattern: Model Layer
 *
 * Purpose:
 *   Abstracts all database queries related to the digital Menu
 *   (CRUD operations for Admin, read-only for Customers).
 *
 * Design Pattern: Repository Pattern (Data Access Layer)
 * Principle: Single Responsibility -- this file ONLY handles Menu data.
 */

import { createServiceSupabaseClient } from '@/lib/supabaseAdmin';

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  available: boolean;
  image_url: string | null;
  sort_order: number;
  created_at: string;
}

export async function getAllMenuItems(): Promise<MenuItem[]> {
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from('menu')
    .select('id, name, description, price, category, image_url, is_available, sort_order, created_at')
    .eq('is_available', true)
    .order('sort_order', { ascending: true })
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch menu items: ${error.message}`);
  }

  return (data || []).map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    price: item.price,
    category: item.category,
    available: item.is_available,
    image_url: item.image_url,
    sort_order: item.sort_order,
    created_at: item.created_at,
  })) as MenuItem[];
}

