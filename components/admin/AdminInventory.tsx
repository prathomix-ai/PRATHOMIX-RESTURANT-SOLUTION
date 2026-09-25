'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  RefreshCw,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Truck,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  History,
  Coins,
} from 'lucide-react';
import { supabase, RESTAURANT_TABLES, DEFAULT_RESTAURANT_ID, type InventoryItem, type InventoryLog } from '@/lib/supabase';

// Seed demo inventory if table is empty
const INITIAL_DEMO_INVENTORY: InventoryItem[] = [
  {
    id: 'inv-1',
    restaurant_id: DEFAULT_RESTAURANT_ID,
    name: 'Truffle Oil (White)',
    category: 'Pantry',
    unit: 'ltr',
    current_stock: 4.5,
    min_stock: 2.0,
    cost_per_unit: 3200,
    supplier_name: 'Milano Gourmet Imports',
    supplier_phone: '+91 98201 11223',
    last_restocked: '2026-09-20',
  },
  {
    id: 'inv-2',
    restaurant_id: DEFAULT_RESTAURANT_ID,
    name: 'Organic Paneer',
    category: 'Dairy',
    unit: 'kg',
    current_stock: 3.2,
    min_stock: 8.0,
    cost_per_unit: 380,
    supplier_name: 'Vedic Farms Pure Dairy',
    supplier_phone: '+91 98111 44556',
    last_restocked: '2026-09-24',
  },
  {
    id: 'inv-3',
    restaurant_id: DEFAULT_RESTAURANT_ID,
    name: 'Norwegian Salmon Fillets',
    category: 'Meat & Seafood',
    unit: 'kg',
    current_stock: 12.0,
    min_stock: 5.0,
    cost_per_unit: 1450,
    supplier_name: 'Ocean Harvest Direct',
    supplier_phone: '+91 97722 88990',
    last_restocked: '2026-09-22',
  },
  {
    id: 'inv-4',
    restaurant_id: DEFAULT_RESTAURANT_ID,
    name: 'Saffron Threads (Kashmiri A++)',
    category: 'Spices',
    unit: 'gm',
    current_stock: 45,
    min_stock: 100,
    cost_per_unit: 280,
    supplier_name: 'Pampore Royal Spice Guild',
    supplier_phone: '+91 99000 33441',
    last_restocked: '2026-09-10',
  },
  {
    id: 'inv-5',
    restaurant_id: DEFAULT_RESTAURANT_ID,
    name: 'San Marzano Canned Tomatoes',
    category: 'Pantry',
    unit: 'can',
    current_stock: 64,
    min_stock: 24,
    cost_per_unit: 180,
    supplier_name: 'EuroFoods Distribution',
    supplier_phone: '+91 98333 77889',
    last_restocked: '2026-09-18',
  },
  {
    id: 'inv-6',
    restaurant_id: DEFAULT_RESTAURANT_ID,
    name: 'Fresh Hass Avocados',
    category: 'Produce',
    unit: 'kg',
    current_stock: 1.5,
    min_stock: 6.0,
    cost_per_unit: 420,
    supplier_name: 'Green Orchard Organic',
    supplier_phone: '+91 98455 22110',
    last_restocked: '2026-09-23',
  },
];

export default function AdminInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Modals
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Form states for Add/Edit
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Pantry');
  const [formUnit, setFormUnit] = useState('kg');
  const [formStock, setFormStock] = useState(0);
  const [formMinStock, setFormMinStock] = useState(5);
  const [formCost, setFormCost] = useState(0);
  const [formSupplier, setFormSupplier] = useState('');
  const [formSupplierPhone, setFormSupplierPhone] = useState('');

  // Form states for Quick Stock Adjustment
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustReason, setAdjustReason] = useState<'purchase' | 'wastage' | 'manual_adjustment'>('purchase');
  const [adjustNotes, setAdjustNotes] = useState('');

  useEffect(() => {
    fetchInventory();
  }, []);

  async function fetchInventory() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('name', { ascending: true });

      if (data && data.length > 0) {
        setItems(data);
      } else {
        setItems(INITIAL_DEMO_INVENTORY);
      }
    } catch {
      setItems(INITIAL_DEMO_INVENTORY);
    } finally {
      setLoading(false);
    }
  }

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.supplier_name && item.supplier_name.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [items, searchQuery, selectedCategory]);

  // KPIs
  const stats = useMemo(() => {
    const totalItems = items.length;
    const lowStock = items.filter((i) => i.current_stock <= i.min_stock);
    const outOfStock = items.filter((i) => i.current_stock <= 0);
    const totalValuation = items.reduce((sum, i) => sum + i.current_stock * i.cost_per_unit, 0);

    return { totalItems, lowStockCount: lowStock.length, outOfStockCount: outOfStock.length, totalValuation };
  }, [items]);

  const categories = ['All', 'Produce', 'Dairy', 'Meat & Seafood', 'Pantry', 'Spices', 'Beverages'];

  function openAddItemModal() {
    setSelectedItem(null);
    setFormName('');
    setFormCategory('Pantry');
    setFormUnit('kg');
    setFormStock(10);
    setFormMinStock(5);
    setFormCost(200);
    setFormSupplier('');
    setFormSupplierPhone('');
    setItemModalOpen(true);
  }

  function openEditItemModal(item: InventoryItem) {
    setSelectedItem(item);
    setFormName(item.name);
    setFormCategory(item.category);
    setFormUnit(item.unit);
    setFormStock(item.current_stock);
    setFormMinStock(item.min_stock);
    setFormCost(item.cost_per_unit);
    setFormSupplier(item.supplier_name || '');
    setFormSupplierPhone(item.supplier_phone || '');
    setItemModalOpen(true);
  }

  function openAdjustModal(item: InventoryItem) {
    setSelectedItem(item);
    setAdjustQty(1);
    setAdjustReason('purchase');
    setAdjustNotes('');
    setAdjustModalOpen(true);
  }

  function handleSaveItem(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) return;

    if (selectedItem) {
      // Edit
      setItems((prev) =>
        prev.map((i) =>
          i.id === selectedItem.id
            ? {
                ...i,
                name: formName,
                category: formCategory,
                unit: formUnit,
                current_stock: formStock,
                min_stock: formMinStock,
                cost_per_unit: formCost,
                supplier_name: formSupplier,
                supplier_phone: formSupplierPhone,
                updated_at: new Date().toISOString(),
              }
            : i
        )
      );
    } else {
      // Add
      const newItem: InventoryItem = {
        id: `inv-${Date.now()}`,
        restaurant_id: DEFAULT_RESTAURANT_ID,
        name: formName,
        category: formCategory,
        unit: formUnit,
        current_stock: formStock,
        min_stock: formMinStock,
        cost_per_unit: formCost,
        supplier_name: formSupplier,
        supplier_phone: formSupplierPhone,
        last_restocked: new Date().toISOString().slice(0, 10),
      };
      setItems((prev) => [newItem, ...prev]);
    }
    setItemModalOpen(false);
  }

  function handleSaveAdjustment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedItem) return;

    const delta = adjustReason === 'purchase' ? adjustQty : -adjustQty;
    const nextStock = Math.max(0, selectedItem.current_stock + delta);

    setItems((prev) =>
      prev.map((i) =>
        i.id === selectedItem.id
          ? {
              ...i,
              current_stock: nextStock,
              last_restocked: adjustReason === 'purchase' ? new Date().toISOString().slice(0, 10) : i.last_restocked,
            }
          : i
      )
    );
    setAdjustModalOpen(false);
  }

  function handleDeleteItem(id: string) {
    if (confirm('Are you sure you want to delete this inventory item?')) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold text-[#EAE6DF] tracking-wide"
            style={{ fontFamily: 'Cinzel, serif' }}>
            Inventory & Ingredient Vault
          </h1>
          <p className="text-xs text-[#EAE6DF]/60 mt-1">
            Track culinary supplies, real-time stock thresholds, valuation & automated restock alerts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchInventory}
            className="p-2.5 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#C5A880] hover:bg-[#C5A880]/10 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={openAddItemModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#8C7355] text-[#0A0A0A] font-bold text-xs shadow-warm hover:brightness-110 transition-all">
            <Plus className="w-4 h-4" />
            Add Ingredient
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#121212]/90 border border-[#C5A880]/15 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#EAE6DF]/60 uppercase tracking-wider font-semibold">Total SKUs</span>
            <div className="w-8 h-8 rounded-lg bg-[#C5A880]/10 border border-[#C5A880]/20 flex items-center justify-center text-[#C5A880]">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#EAE6DF] mt-2 font-mono">{stats.totalItems}</div>
          <span className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">Active inventory items</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#121212]/90 border border-amber-500/25 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-400 uppercase tracking-wider font-semibold">Low Stock Warnings</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-2 font-mono">{stats.lowStockCount}</div>
          <span className="text-[10px] text-amber-400/80 mt-1 flex items-center gap-1">Below safety reorder level</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#121212]/90 border border-[#C5A880]/15 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#EAE6DF]/60 uppercase tracking-wider font-semibold">Vault Valuation</span>
            <div className="w-8 h-8 rounded-lg bg-[#C5A880]/10 border border-[#C5A880]/20 flex items-center justify-center text-[#C5A880]">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#C5A880] mt-2 font-mono">
            ₹{stats.totalValuation.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-[#EAE6DF]/50 mt-1 flex items-center gap-1">Current assets in stock</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#121212]/90 border border-red-500/20 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-red-400 uppercase tracking-wider font-semibold">Stockouts</span>
            <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-red-400 mt-2 font-mono">{stats.outOfStockCount}</div>
          <span className="text-[10px] text-red-400/80 mt-1 flex items-center gap-1">Requires immediate purchase</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-[#121212]/90 border border-[#C5A880]/15 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#C5A880]/60" />
          <input
            type="text"
            placeholder="Search ingredients or suppliers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-xs text-[#EAE6DF] placeholder:text-[#EAE6DF]/40 focus:outline-none focus:border-[#C5A880]"
          />
        </div>

        {/* Categories */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-[#C5A880] text-[#0A0A0A]'
                  : 'bg-[#1A1A1A] text-[#EAE6DF]/70 hover:text-[#EAE6DF] border border-[#C5A880]/10'
              }`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Table */}
      <div className="rounded-2xl bg-[#121212]/90 border border-[#C5A880]/15 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#C5A880]/15 bg-[#181818] text-[#C5A880] uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Item & Category</th>
                <th className="py-3 px-4">Stock Level</th>
                <th className="py-3 px-4">Safety Min</th>
                <th className="py-3 px-4">Cost / Unit</th>
                <th className="py-3 px-4">Total Value</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C5A880]/10">
              {filteredItems.map((item) => {
                const isLow = item.current_stock <= item.min_stock;
                const isOut = item.current_stock <= 0;
                const pct = Math.min(100, Math.round((item.current_stock / (item.min_stock * 2.5)) * 100));

                return (
                  <tr key={item.id} className="hover:bg-[#1A1A1A]/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#EAE6DF]">{item.name}</div>
                      <span className="text-[10px] text-[#C5A880]/80 uppercase tracking-widest">{item.category}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono font-bold ${
                            isOut ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-emerald-400'
                          }`}>
                          {item.current_stock} {item.unit}
                        </span>
                        {isLow && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            LOW
                          </span>
                        )}
                      </div>
                      <div className="w-24 h-1.5 rounded-full bg-[#2A2A2A] mt-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            isOut ? 'bg-red-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[#EAE6DF]/70">
                      {item.min_stock} {item.unit}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[#EAE6DF]">
                      ₹{item.cost_per_unit} / {item.unit}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-semibold text-[#C5A880]">
                      ₹{(item.current_stock * item.cost_per_unit).toLocaleString('en-IN')}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-[#EAE6DF]/90 font-medium">{item.supplier_name || '—'}</div>
                      <div className="text-[10px] text-[#EAE6DF]/50">{item.supplier_phone || ''}</div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openAdjustModal(item)}
                          title="Stock In / Out"
                          className="px-2.5 py-1 rounded-lg bg-[#C5A880]/10 border border-[#C5A880]/20 text-[#C5A880] hover:bg-[#C5A880]/20 text-[11px] font-semibold transition-colors">
                          Adjust
                        </button>
                        <button
                          onClick={() => openEditItemModal(item)}
                          className="p-1.5 rounded-lg text-[#EAE6DF]/60 hover:text-[#C5A880] hover:bg-[#2A2A2A] transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 rounded-lg text-[#EAE6DF]/60 hover:text-red-400 hover:bg-[#2A2A2A] transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-[#EAE6DF]/50">
                    No inventory items found matching your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add / Edit Item */}
      <AnimatePresence>
        {itemModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl bg-[#121212] border border-[#C5A880]/30 shadow-2xl p-6 relative">
              <div className="flex items-center justify-between pb-4 border-b border-[#C5A880]/15">
                <h3
                  className="text-lg font-bold text-[#EAE6DF] tracking-wide"
                  style={{ fontFamily: 'Cinzel, serif' }}>
                  {selectedItem ? 'Edit Ingredient SKU' : 'Register New Ingredient SKU'}
                </h3>
                <button
                  onClick={() => setItemModalOpen(false)}
                  className="p-1 rounded-lg text-[#EAE6DF]/60 hover:text-[#EAE6DF] hover:bg-[#1A1A1A]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveItem} className="mt-4 space-y-4 text-xs">
                <div>
                  <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Ingredient Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Kashmiri Morels / Black Truffle"
                    className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Category</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]">
                      {categories
                        .filter((c) => c !== 'All')
                        .map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Unit Measurement</label>
                    <select
                      value={formUnit}
                      onChange={(e) => setFormUnit(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]">
                      <option value="kg">kg (Kilograms)</option>
                      <option value="gm">gm (Grams)</option>
                      <option value="ltr">ltr (Liters)</option>
                      <option value="ml">ml (Milliliters)</option>
                      <option value="can">can (Cans)</option>
                      <option value="pcs">pcs (Pieces)</option>
                      <option value="box">box (Cases)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Current Stock</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={formStock}
                      onChange={(e) => setFormStock(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Min Threshold</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={formMinStock}
                      onChange={(e) => setFormMinStock(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Cost / Unit (₹)</label>
                    <input
                      type="number"
                      step="1"
                      required
                      value={formCost}
                      onChange={(e) => setFormCost(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Supplier Name</label>
                    <input
                      type="text"
                      value={formSupplier}
                      onChange={(e) => setFormSupplier(e.target.value)}
                      placeholder="e.g. FreshProduce Co."
                      className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Supplier Phone</label>
                    <input
                      type="text"
                      value={formSupplierPhone}
                      onChange={(e) => setFormSupplierPhone(e.target.value)}
                      placeholder="+91 98..."
                      className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-[#C5A880]/15">
                  <button
                    type="button"
                    onClick={() => setItemModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-[#1A1A1A] text-[#EAE6DF]/70 hover:bg-[#2A2A2A]">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#8C7355] text-[#0A0A0A] font-bold shadow-warm hover:brightness-110">
                    Save Ingredient
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Quick Stock Adjustment */}
      <AnimatePresence>
        {adjustModalOpen && selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl bg-[#121212] border border-[#C5A880]/30 shadow-2xl p-6 relative">
              <div className="flex items-center justify-between pb-3 border-b border-[#C5A880]/15">
                <div>
                  <h3
                    className="text-base font-bold text-[#EAE6DF]"
                    style={{ fontFamily: 'Cinzel, serif' }}>
                    Adjust Stock: {selectedItem.name}
                  </h3>
                  <p className="text-[11px] text-[#C5A880]">
                    Current Stock: {selectedItem.current_stock} {selectedItem.unit}
                  </p>
                </div>
                <button
                  onClick={() => setAdjustModalOpen(false)}
                  className="p-1 rounded-lg text-[#EAE6DF]/60 hover:text-[#EAE6DF] hover:bg-[#1A1A1A]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveAdjustment} className="mt-4 space-y-4 text-xs">
                <div>
                  <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Adjustment Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setAdjustReason('purchase')}
                      className={`py-2 rounded-xl font-semibold border transition-all ${
                        adjustReason === 'purchase'
                          ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400'
                          : 'bg-[#1A1A1A] border-[#C5A880]/10 text-[#EAE6DF]/60'
                      }`}>
                      + Purchase
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustReason('wastage')}
                      className={`py-2 rounded-xl font-semibold border transition-all ${
                        adjustReason === 'wastage'
                          ? 'bg-red-500/15 border-red-500 text-red-400'
                          : 'bg-[#1A1A1A] border-[#C5A880]/10 text-[#EAE6DF]/60'
                      }`}>
                      - Wastage
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustReason('manual_adjustment')}
                      className={`py-2 rounded-xl font-semibold border transition-all ${
                        adjustReason === 'manual_adjustment'
                          ? 'bg-amber-500/15 border-amber-500 text-amber-400'
                          : 'bg-[#1A1A1A] border-[#C5A880]/10 text-[#EAE6DF]/60'
                      }`}>
                      - Audit Deficit
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">
                    Quantity ({selectedItem.unit})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]"
                  />
                </div>

                <div>
                  <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Audit Notes / Invoice Ref</label>
                  <input
                    type="text"
                    value={adjustNotes}
                    onChange={(e) => setAdjustNotes(e.target.value)}
                    placeholder="e.g. Invoice #PO-9921 from Milan Imports"
                    className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-[#C5A880]/15">
                  <button
                    type="button"
                    onClick={() => setAdjustModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-[#1A1A1A] text-[#EAE6DF]/70 hover:bg-[#2A2A2A]">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#8C7355] text-[#0A0A0A] font-bold shadow-warm hover:brightness-110">
                    Apply Adjustment
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
