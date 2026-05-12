'use client';

import { useEffect, useState } from 'react';
import type { MenuItem } from '@/services/menuService';

/**
 * MenuDisplay Component (QDR-82)
 * 
 * Purpose:
 *   Display view-only digital menu alongside availability results
 *   Fetches from /api/menu endpoint
 *   Supports category grouping and filtering
 * 
 * Requirements (FR-2):
 *   - Display all available menu items
 *   - Group by category if available
 *   - Show price and description
 *   - Read-only (no cart/ordering in this component)
 */

type MenuDisplayProps = {
  className?: string;
};

export default function MenuDisplay({ className = '' }: MenuDisplayProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMenu() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/menu', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        const payload = (await response.json()) as {
          items?: MenuItem[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? 'Failed to fetch menu.');
        }

        setMenuItems(payload.items ?? []);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load menu.';
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    fetchMenu();
  }, []);

  if (loading) {
    return (
      <div className={`rounded-lg border p-4 ${className}`}>
        <h3 className="mb-3 text-lg font-semibold">Digital Menu</h3>
        <div className="text-sm text-zinc-600 dark:text-zinc-400">Loading menu...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/30 dark:bg-red-900/20 ${className}`}>
        <h3 className="mb-2 text-lg font-semibold text-red-700 dark:text-red-400">Menu</h3>
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (menuItems.length === 0) {
    return (
      <div className={`rounded-lg border p-4 ${className}`}>
        <h3 className="mb-3 text-lg font-semibold">Digital Menu</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">No menu items available.</p>
      </div>
    );
  }

  // Group items by category
  const groupedItems = menuItems.reduce(
    (acc, item) => {
      const category = item.category || 'Other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    },
    {} as Record<string, MenuItem[]>
  );

  return (
    <div className={`rounded-lg border p-4 ${className}`}>
      <h3 className="mb-4 text-lg font-semibold">Digital Menu</h3>
      <div className="space-y-6">
        {Object.entries(groupedItems).map(([category, items]) => (
          <div key={category}>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
              {category}
            </h4>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="rounded border bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900/30">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100">{item.name}</p>
                      {item.description && (
                        <p className="text-xs text-zinc-600 dark:text-zinc-400">{item.description}</p>
                      )}
                    </div>
                    {item.price && (
                      <p className="whitespace-nowrap font-semibold text-zinc-900 dark:text-zinc-100">
                        ${item.price.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
