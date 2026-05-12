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
  created_at: string;
}

export async function getAllMenuItems(): Promise<MenuItem[]> {
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from('menu')
    .select('id, name, description, price, category, available, created_at')
    .eq('available', true)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch menu items: ${error.message}`);
  }

  return (data || []) as MenuItem[];
}

