"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, Search, Plus, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MenuCategory } from "@/services/menuService";

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  category: MenuCategory | null;
  price: number;
  available: boolean;
  sort_order: number;
};

type MenuFormState = {
  name: string;
  description: string;
  category: MenuCategory;
  price: string;
  sort_order: string;
};

const CATEGORY_OPTIONS: Array<{ value: MenuCategory; label: string }> = [
  { value: "starters", label: "Starters" },
  { value: "mains", label: "Mains" },
  { value: "desserts", label: "Desserts" },
  { value: "sides", label: "Sides" },
  { value: "beverages", label: "Beverages" },
];

const DEFAULT_FORM_STATE: MenuFormState = {
  name: "",
  description: "",
  category: "mains",
  price: "",
  sort_order: "0",
};

function categoryLabel(category: MenuCategory | null): string {
  return (
    CATEGORY_OPTIONS.find((option) => option.value === category)?.label ??
    "Uncategorized"
  );
}

export default function MenuManagementPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] =
    useState<MenuFormState>(DEFAULT_FORM_STATE);

  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState<MenuFormState>(DEFAULT_FORM_STATE);

  const fetchMenuItems = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/menu", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const payload = (await response.json()) as {
        items?: MenuItem[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load menu items");
      }

      setMenuItems(payload.items ?? []);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to load menu items",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchMenuItems();
    });
  }, [fetchMenuItems]);

  const filteredMenu = useMemo(
    () =>
      menuItems.filter((item) =>
        `${item.name} ${item.description ?? ""}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase()),
      ),
    [menuItems, searchQuery],
  );

  function openEditDialog(item: MenuItem) {
    setEditingItem(item);
    setEditForm({
      name: item.name,
      description: item.description ?? "",
      category: item.category ?? "mains",
      price: item.price.toString(),
      sort_order: item.sort_order.toString(),
    });
    setActionError(null);
  }

  async function handleCreateSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionError(null);

    const price = Number(createForm.price);
    const sortOrder = Number(createForm.sort_order);

    if (!createForm.name.trim()) {
      setActionError("Dish name is required.");
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      setActionError("Price must be a non-negative number.");
      return;
    }

    if (!Number.isFinite(sortOrder)) {
      setActionError("Sort order must be a valid number.");
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("/api/admin/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name,
          description: createForm.description,
          category: createForm.category,
          price,
          sort_order: sortOrder,
          available: true,
        }),
      });

      const payload = (await response.json()) as {
        item?: MenuItem;
        error?: string;
      };

      if (!response.ok || !payload.item) {
        throw new Error(payload.error ?? "Failed to create menu item");
      }

      setMenuItems((prev) => [...prev, payload.item!]);
      setCreateForm(DEFAULT_FORM_STATE);
      setIsCreateOpen(false);
    } catch (requestError) {
      setActionError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to create menu item",
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function handleEditSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingItem) return;

    setActionError(null);

    const price = Number(editForm.price);
    const sortOrder = Number(editForm.sort_order);

    if (!editForm.name.trim()) {
      setActionError("Dish name is required.");
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      setActionError("Price must be a non-negative number.");
      return;
    }

    if (!Number.isFinite(sortOrder)) {
      setActionError("Sort order must be a valid number.");
      return;
    }

    setIsSavingEdit(true);
    try {
      const response = await fetch(`/api/admin/menu/${editingItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          description: editForm.description,
          category: editForm.category,
          price,
          sort_order: sortOrder,
        }),
      });

      const payload = (await response.json()) as {
        item?: MenuItem;
        error?: string;
      };

      if (!response.ok || !payload.item) {
        throw new Error(payload.error ?? "Failed to update menu item");
      }

      setMenuItems((prev) =>
        prev.map((item) =>
          item.id === payload.item!.id ? payload.item! : item,
        ),
      );
      setEditingItem(null);
    } catch (requestError) {
      setActionError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to update menu item",
      );
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function toggleAvailability(item: MenuItem) {
    setActionError(null);

    try {
      const response = await fetch(`/api/admin/menu/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ available: !item.available }),
      });

      const payload = (await response.json()) as {
        item?: MenuItem;
        error?: string;
      };

      if (!response.ok || !payload.item) {
        throw new Error(payload.error ?? "Failed to update availability");
      }

      setMenuItems((prev) =>
        prev.map((current) =>
          current.id === payload.item!.id ? payload.item! : current,
        ),
      );
    } catch (requestError) {
      setActionError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to update availability",
      );
    }
  }

  async function handleDelete(item: MenuItem) {
    const confirmed = window.confirm(
      `Delete ${item.name}? This action cannot be undone.`,
    );
    if (!confirmed) return;

    setActionError(null);

    try {
      const response = await fetch(`/api/admin/menu/${item.id}`, {
        method: "DELETE",
      });

      const payload = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "Failed to delete menu item");
      }

      setMenuItems((prev) => prev.filter((current) => current.id !== item.id));
    } catch (requestError) {
      setActionError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to delete menu item",
      );
    }
  }

  return (
    <div className="flex w-full flex-col gap-6 p-8 font-sans text-[11px] bg-background text-foreground">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold font-heading text-foreground flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-bold" /> Menu Configuration
          </h1>
          <p className="text-muted-foreground italic mt-1">
            Real-time availability and pricing controls
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search dishes..."
              className="pl-9 h-9 bg-background border-input text-foreground focus-visible:ring-ring"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="h-9 bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" /> Add Menu Item
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-popover border-border text-popover-foreground font-sans text-[11px]">
              <DialogHeader>
                <DialogTitle className="text-lg font-heading text-primary">
                  Add New Dish
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateSubmit} className="grid gap-4 py-2">
                <Input
                  placeholder="Dish Name"
                  className="bg-background border-input"
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                />
                <Input
                  placeholder="Description"
                  className="bg-background border-input"
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                />
                <Select
                  value={createForm.category}
                  onValueChange={(value) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      category: value as MenuCategory,
                    }))
                  }
                >
                  <SelectTrigger className="w-full bg-background border-input">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Price"
                    type="number"
                    step="0.01"
                    className="bg-background border-input"
                    value={createForm.price}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        price: e.target.value,
                      }))
                    }
                    required
                  />
                  <Input
                    placeholder="Sort order"
                    type="number"
                    className="bg-background border-input"
                    value={createForm.sort_order}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        sort_order: e.target.value,
                      }))
                    }
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isCreating}
                  className="mt-1 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isCreating ? "Saving..." : "Save to Database"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {error && <p className="text-destructive">{error}</p>}
      {actionError && <p className="text-destructive">{actionError}</p>}

      <div className="rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground font-bold uppercase tracking-widest">
                Item Name
              </TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase tracking-widest">
                Category
              </TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase tracking-widest">
                Price
              </TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase tracking-widest">
                Status
              </TableHead>
              <TableHead className="text-right text-muted-foreground font-bold uppercase tracking-widest">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMenu.map((item) => (
              <TableRow
                key={item.id}
                className={`border-b border-border transition-colors hover:bg-muted/50 ${
                  !item.available ? "opacity-60" : ""
                }`}
              >
                <TableCell className="font-medium text-foreground text-[12px]">
                  {item.name}
                  {item.description && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {item.description}
                    </p>
                  )}
                </TableCell>
                <TableCell className="text-secondary-foreground">
                  {categoryLabel(item.category)}
                </TableCell>
                <TableCell className="text-foreground">
                  ${item.price.toFixed(2)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={item.available}
                      onCheckedChange={() => void toggleAvailability(item)}
                    />
                    {item.available ? (
                      <span className="text-primary font-medium">
                        Available
                      </span>
                    ) : (
                      <span className="text-destructive font-bold">
                        Sold Out
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(item)}
                      className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-muted"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => void handleDelete(item)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {filteredMenu.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground py-8"
                >
                  {loading ? "Loading menu items..." : "No menu items found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={!!editingItem}
        onOpenChange={(isOpen) => !isOpen && setEditingItem(null)}
      >
        <DialogContent className="bg-popover border-border text-popover-foreground font-sans text-[11px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-heading text-primary">
              Edit Menu Item
            </DialogTitle>
          </DialogHeader>
          {editingItem && (
            <form onSubmit={handleEditSubmit} className="grid gap-4 py-2">
              <Input
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, name: e.target.value }))
                }
                className="bg-background border-input"
                required
              />
              <Input
                value={editForm.description}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="bg-background border-input"
                placeholder="Description"
              />
              <Select
                value={editForm.category}
                onValueChange={(value) =>
                  setEditForm((prev) => ({
                    ...prev,
                    category: value as MenuCategory,
                  }))
                }
              >
                <SelectTrigger className="w-full bg-background border-input">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.price}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, price: e.target.value }))
                  }
                  className="bg-background border-input"
                  required
                />
                <Input
                  type="number"
                  value={editForm.sort_order}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      sort_order: e.target.value,
                    }))
                  }
                  className="bg-background border-input"
                />
              </div>
              <Button
                type="submit"
                disabled={isSavingEdit}
                className="mt-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isSavingEdit ? "Updating..." : "Update Item"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
