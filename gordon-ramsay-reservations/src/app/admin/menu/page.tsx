"use client";

import React, { useState } from "react";
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

// Define the shape of our menu items
type MenuItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  available: boolean;
};

// Mock Data
const INITIAL_MENU: MenuItem[] = [
  { id: "M1", name: "Pan-Seared Scallops", category: "Appetizer", price: 32.00, available: true },
  { id: "M2", name: "Beef Wellington", category: "Main", price: 68.00, available: true },
  { id: "M3", name: "Truffle Risotto", category: "Main", price: 45.00, available: false },
  { id: "M4", name: "Sticky Toffee Pudding", category: "Dessert", price: 18.00, available: true },
];

export default function MenuManagementPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>(INITIAL_MENU);
  const [searchQuery, setSearchQuery] = useState("");
  
  // New state to track the item currently being edited
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const toggleAvailability = (id: string) => {
    setMenuItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, available: !item.available } : item
      )
    );
  };

  // Handle the form submission for edits
  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    if (editingItem) {
      const updatedItem = {
        ...editingItem,
        name: formData.get("name") as string,
        price: parseFloat(formData.get("price") as string),
      };

      setMenuItems((prev) =>
        prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
      );
      
      // Close the dialog by clearing the state
      setEditingItem(null);
    }
  };

  const filteredMenu = menuItems.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex w-full flex-col gap-6 p-8 font-sans text-[11px] bg-background text-foreground">
      
      {/* Header & Control Bar */}
      <header className="flex items-center justify-between">
        <div>
          {/* Added font-heading here */}
          <h1 className="text-lg font-semibold font-heading text-foreground flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-bold" /> Menu Configuration
            </h1>
          <p className="text-muted-foreground italic mt-1">Real-time availability and pricing controls</p>
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

          <Dialog>
            <DialogTrigger asChild>
              <Button className="h-9 bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" /> Add Menu Item
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-popover border-border text-popover-foreground font-sans text-[11px]">
              <DialogHeader>
                {/* Added font-heading here */}
                <DialogTitle className="text-lg font-heading text-primary">Add New Dish</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <Input placeholder="Dish Name (e.g. Lobster Ravioli)" className="bg-background border-input" />
                <Input placeholder="Price (₱)" type="number" className="bg-background border-input" />
                <Button className="mt-2 bg-primary text-primary-foreground hover:bg-primary/90">
                  Save to Database
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* The Data Table */}
      <div className="rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground font-bold uppercase tracking-widest">Item Name</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase tracking-widest">Category</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase tracking-widest">Price</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase tracking-widest">Status</TableHead>
              <TableHead className="text-right text-muted-foreground font-bold uppercase tracking-widest">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMenu.map((item) => (
              <TableRow 
                key={item.id} 
                className={`border-b border-border transition-colors hover:bg-muted/50 ₱{
                  !item.available ? "opacity-60" : ""
                }`}
              >
                <TableCell className="font-medium text-foreground text-[12px]">{item.name}</TableCell>
                <TableCell className="text-secondary-foreground">{item.category}</TableCell>
                <TableCell className="text-foreground">₱{item.price.toFixed(2)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Switch 
                      checked={item.available} 
                      onCheckedChange={() => toggleAvailability(item.id)}
                    />
                    {item.available ? (
                      <span className="text-primary font-medium">Available</span>
                    ) : (
                      <span className="text-destructive font-bold">Sold Out</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {/* Trigger the Edit state here */}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setEditingItem(item)}
                      className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-muted"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Controlled Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(isOpen) => !isOpen && setEditingItem(null)}>
        <DialogContent className="bg-popover border-border text-popover-foreground font-sans text-[11px]">
          <DialogHeader>
            {/* Added font-heading here */}
            <DialogTitle className="text-lg font-heading text-primary">Edit Menu Item</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <form onSubmit={handleEditSubmit} className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label className="text-muted-foreground uppercase tracking-widest font-bold text-[9px]">Dish Name</label>
                <Input 
                  name="name" 
                  defaultValue={editingItem.name} 
                  className="bg-background border-input" 
                  required 
                />
              </div>
              <div className="grid gap-2">
                <label className="text-muted-foreground uppercase tracking-widest font-bold text-[9px]">Price (₱)</label>
                <Input 
                  name="price" 
                  type="number" 
                  step="0.01"
                  defaultValue={editingItem.price} 
                  className="bg-background border-input" 
                  required 
                />
              </div>
              <Button type="submit" className="mt-2 bg-primary text-primary-foreground hover:bg-primary/90">
                Update Item
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}