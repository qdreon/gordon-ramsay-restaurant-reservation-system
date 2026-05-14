'use client';

import { useEffect, useState } from 'react';
import type { MenuItem } from '@/services/menuService';
import { supabase } from '@/lib/supabaseClient';

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

function formatCategoryLabel(category: string | null): string {
  if (!category) {
    return 'Other';
  }

  return category.charAt(0).toUpperCase() + category.slice(1);
}

export default function MenuDisplay({ className = '' }: MenuDisplayProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchMenu(silent = false) {
      try {
        if (!silent) {
          setLoading(true);
        }

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

        if (!cancelled) {
          setMenuItems(payload.items ?? []);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load menu.';
        if (!cancelled) {
          setError(message);
        }
      } finally {
        if (!silent && !cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchMenu();

    const channel = supabase
      .channel('public:menu')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu' }, () => {
        void fetchMenu(true);
      })
      .subscribe();

    const handleFocusRefresh = () => {
      void fetchMenu(true);
    };

    window.addEventListener('focus', handleFocusRefresh);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', handleFocusRefresh);
      void supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className={`rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur ${className}`}>
        <h3 className="mb-3 text-lg font-semibold text-white">Digital Menu</h3>
        <div className="space-y-2">
          {[1, 2, 3].map((skeleton) => (
            <div key={skeleton} className="h-14 animate-pulse rounded-xl border border-white/10 bg-white/10" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-2xl border border-red-400/30 bg-red-500/10 p-4 ${className}`}>
        <h3 className="mb-2 text-lg font-semibold text-red-200">Menu</h3>
        <p className="text-sm text-red-200">{error}</p>
      </div>
    );
  }

  if (menuItems.length === 0) {
    return (
      <div className={`rounded-2xl border border-white/10 bg-black/20 p-4 ${className}`}>
        <h3 className="mb-3 text-lg font-semibold text-white">Digital Menu</h3>
        <p className="text-sm text-zinc-300">No menu items available.</p>
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
    <div className={`rounded-2xl border border-white/10 bg-black/20 p-4 ${className}`}>
      <h3 className="mb-4 text-lg font-semibold text-white">Digital Menu</h3>
      <div className="space-y-6">
        {Object.entries(groupedItems).map(([category, items]) => (
          <div key={category}>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-amber-300">
              {formatCategoryLabel(category)}
            </h4>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-zinc-100">{item.name}</p>
                      {item.description && (
                        <p className="text-xs text-zinc-300">{item.description}</p>
                      )}
                    </div>
                    {item.price && (
                      <p className="whitespace-nowrap font-semibold text-zinc-100">
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
