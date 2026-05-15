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

export type MenuCategory = 'starters' | 'mains' | 'desserts' | 'sides' | 'beverages';

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: MenuCategory | null;
  available: boolean;
  image_url: string | null;
  sort_order: number;
  created_at: string;
}

export interface CreateMenuItemInput {
  name: string;
  description?: string | null;
  price: number;
  category: MenuCategory;
  image_url?: string | null;
  available?: boolean;
  sort_order?: number;
}

export interface UpdateMenuItemInput {
  name?: string;
  description?: string | null;
  price?: number;
  category?: MenuCategory;
  image_url?: string | null;
  available?: boolean;
  sort_order?: number;
}

function normalizeMenuItem(item: {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  image_url: string | null;
  is_available: boolean;
  sort_order: number;
  created_at: string;
}): MenuItem {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    price: item.price,
    category: item.category as MenuCategory | null,
    available: item.is_available,
    image_url: item.image_url,
    sort_order: item.sort_order,
    created_at: item.created_at,
  };
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

  return (data || []).map((item) => normalizeMenuItem(item));
}

export async function getAdminMenuItems(): Promise<MenuItem[]> {
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from('menu')
    .select('id, name, description, price, category, image_url, is_available, sort_order, created_at')
    .order('sort_order', { ascending: true })
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch admin menu items: ${error.message}`);
  }

  return (data || []).map((item) => normalizeMenuItem(item));
}

export async function createAdminMenuItem(input: CreateMenuItemInput): Promise<MenuItem> {
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from('menu')
    .insert({
      name: input.name.trim(),
      description: input.description?.trim() ? input.description.trim() : null,
      price: input.price,
      category: input.category,
      image_url: input.image_url?.trim() ? input.image_url.trim() : null,
      is_available: input.available ?? true,
      sort_order: input.sort_order ?? 0,
    })
    .select('id, name, description, price, category, image_url, is_available, sort_order, created_at')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create menu item: ${error?.message ?? 'Unknown error'}`);
  }

  return normalizeMenuItem(data);
}

export async function updateAdminMenuItem(
  menuItemId: string,
  input: UpdateMenuItemInput
): Promise<MenuItem> {
  const supabase = createServiceSupabaseClient();

  const payload: {
    name?: string;
    description?: string | null;
    price?: number;
    category?: MenuCategory;
    image_url?: string | null;
    is_available?: boolean;
    sort_order?: number;
  } = {};

  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.description !== undefined) {
    payload.description = input.description?.trim() ? input.description.trim() : null;
  }
  if (input.price !== undefined) payload.price = input.price;
  if (input.category !== undefined) payload.category = input.category;
  if (input.image_url !== undefined) {
    payload.image_url = input.image_url?.trim() ? input.image_url.trim() : null;
  }
  if (input.available !== undefined) payload.is_available = input.available;
  if (input.sort_order !== undefined) payload.sort_order = input.sort_order;

  const { data, error } = await supabase
    .from('menu')
    .update(payload)
    .eq('id', menuItemId)
    .select('id, name, description, price, category, image_url, is_available, sort_order, created_at')
    .single();

  if (error || !data) {
    throw new Error(`Failed to update menu item: ${error?.message ?? 'Unknown error'}`);
  }

  return normalizeMenuItem(data);
}

export async function deleteAdminMenuItem(menuItemId: string): Promise<void> {
  const supabase = createServiceSupabaseClient();

  const { error } = await supabase.from('menu').delete().eq('id', menuItemId);

  if (error) {
    throw new Error(`Failed to delete menu item: ${error.message}`);
  }
}

