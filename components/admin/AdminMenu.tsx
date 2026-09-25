'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Sparkles,
  Flame,
  Loader2,
  X,
} from 'lucide-react';
import { supabase, RESTAURANT_TABLES, DEFAULT_RESTAURANT_ID, type Dish } from '@/lib/supabase';

interface Props {
  dishes: Dish[];
  onRefresh: () => void;
}

export default function AdminMenu({ dishes, onRefresh }: Props) {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('349');
  const [category, setCategory] = useState('Main');
  const [imageUrl, setImageUrl] = useState('');
  const [calories, setCalories] = useState('420');
  const [protein, setProtein] = useState('35');
  const [prepTime, setPrepTime] = useState('15');
  const [vegType, setVegType] = useState<'veg' | 'non-veg' | 'vegan' | 'egg'>('non-veg');
  const [spiceLevel, setSpiceLevel] = useState(1);

  const categories = ['All', 'High Protein', 'Main', 'Vegetarian', 'Low Cal', 'Dessert', 'Drinks & Mocktails'];

  const filtered = dishes.filter((d) => {
    const matchCat = selectedCat === 'All' || d.category === selectedCat;
    const matchSearch =
      !search.trim() ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.description?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  function openCreateModal() {
    setEditingDish(null);
    setName('');
    setDescription('');
    setPrice('349');
    setCategory('Main');
    setImageUrl('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400');
    setCalories('420');
    setProtein('35');
    setPrepTime('15');
    setVegType('non-veg');
    setSpiceLevel(1);
    setModalOpen(true);
  }

  function openEditModal(dish: Dish) {
    setEditingDish(dish);
    setName(dish.name);
    setDescription(dish.description || '');
    setPrice(String(dish.price));
    setCategory(dish.category || 'Main');
    setImageUrl(dish.image_url || '');
    setCalories(String(dish.calories || 0));
    setProtein(String(dish.protein || 0));
    setPrepTime(String(dish.prep_time_minutes || 15));
    setVegType(dish.veg_type || 'non-veg');
    setSpiceLevel(dish.spice_level || 1);
    setModalOpen(true);
  }

  async function handleToggleAvailability(dish: Dish) {
    try {
      await supabase
        .from(RESTAURANT_TABLES.dishes)
        .update({ available: !dish.available })
        .eq('id', dish.id);
      onRefresh();
    } catch (err) {
      console.error('Failed to toggle availability:', err);
    }
  }

  async function handleDeleteDish(dishId: string) {
    if (!confirm('Are you sure you want to delete this dish from the menu?')) return;
    try {
      await supabase.from(RESTAURANT_TABLES.dishes).delete().eq('id', dishId);
      onRefresh();
    } catch (err) {
      console.error('Failed to delete dish:', err);
    }
  }

  async function handleSaveDish(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !price) return;

    setSaving(true);
    try {
      const payload: Partial<Dish> = {
        restaurant_id: DEFAULT_RESTAURANT_ID,
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price) || 0,
        category,
        image_url: imageUrl.trim() || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
        calories: parseInt(calories) || 0,
        protein: parseFloat(protein) || 0,
        prep_time_minutes: parseInt(prepTime) || 15,
        veg_type: vegType,
        spice_level: spiceLevel,
        available: editingDish ? editingDish.available : true,
      };

      if (editingDish) {
        await supabase.from(RESTAURANT_TABLES.dishes).update(payload).eq('id', editingDish.id);
      } else {
        await supabase.from(RESTAURANT_TABLES.dishes).insert(payload);
      }

      setModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error('Save dish error:', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2
            className="font-display text-2xl font-bold text-[#EAE6DF] tracking-wide"
            style={{ fontFamily: 'Cinzel, serif' }}>
            Menu &amp; Dish Catalog
          </h2>
          <p className="text-xs text-[#EAE6DF]/60">
            {dishes.length} gourmet offerings · Realtime availability switch · Nutritional specs
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#8C7355] text-[#0A0A0A] font-bold text-xs uppercase tracking-wider shadow-warm hover:brightness-110 transition-all">
          <Plus className="w-4 h-4" /> Add New Dish
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-dark border border-[#C5A880]/20 rounded-2xl p-3 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#C5A880]/60 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search menu catalog..."
            className="w-full bg-[#121212] border border-[#C5A880]/20 rounded-xl pl-9 pr-3 py-2 text-xs text-[#EAE6DF] placeholder-[#EAE6DF]/40 outline-none"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto w-full md:w-auto scrollbar-none pb-1 md:pb-0">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCat(c)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCat === c
                  ? 'bg-[#C5A880] text-[#0A0A0A] font-bold shadow-sm'
                  : 'bg-[#121212] text-[#EAE6DF]/60 hover:text-[#EAE6DF]'
              }`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Dishes Table / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((dish) => (
          <div
            key={dish.id}
            className="glass-dark border border-[#C5A880]/15 hover:border-[#C5A880]/30 rounded-2xl p-4 space-y-3 relative group transition-all">
            <div className="flex gap-3 items-start">
              <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-[#1A1A1A] flex-shrink-0 border border-[#C5A880]/10">
                <Image
                  src={dish.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200'}
                  alt={dish.name}
                  width={64}
                  height={64}
                  className="object-cover w-full h-full"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="font-bold text-sm text-[#EAE6DF] truncate">{dish.name}</h4>
                  <span className="text-xs font-bold text-[#C5A880]">₹{dish.price}</span>
                </div>
                <p className="text-[11px] text-[#EAE6DF]/50 line-clamp-1 mt-0.5">{dish.description}</p>
                <div className="flex items-center gap-2 mt-1.5 text-[10px] text-[#EAE6DF]/60">
                  <span className="bg-[#121212] px-2 py-0.5 rounded-md border border-[#C5A880]/10">
                    {dish.category}
                  </span>
                  <span>{dish.protein}g protein</span>
                  <span>{dish.calories} cal</span>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-[#C5A880]/10">
              <button
                onClick={() => handleToggleAvailability(dish)}
                className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border transition-all flex items-center gap-1 ${
                  dish.available
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                }`}>
                {dish.available ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                {dish.available ? 'In Stock' : 'Out of Stock'}
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => openEditModal(dish)}
                  className="p-1.5 rounded-lg bg-[#121212] hover:bg-[#C5A880]/15 text-[#EAE6DF]/70 hover:text-[#C5A880] transition-colors"
                  title="Edit dish">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteDish(dish.id)}
                  className="p-1.5 rounded-lg bg-[#121212] hover:bg-rose-500/20 text-[#EAE6DF]/70 hover:text-rose-400 transition-colors"
                  title="Delete dish">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Create/Edit Dish */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-dark border border-[#C5A880]/30 rounded-3xl p-6 max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#C5A880]/15">
              <h3 className="font-display font-bold text-lg text-[#EAE6DF]" style={{ fontFamily: 'Cinzel, serif' }}>
                {editingDish ? 'Edit Dish Details' : 'Add New Gourmet Dish'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 text-[#EAE6DF]/60 hover:text-[#EAE6DF]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDish} className="space-y-3.5">
              <div>
                <label className="text-[11px] text-[#EAE6DF]/70 block mb-1">Dish Title *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Herb-Crusted Lamb Rack"
                  className="w-full bg-[#121212] border border-[#C5A880]/20 rounded-xl px-3 py-2 text-xs text-[#EAE6DF] outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-[#EAE6DF]/70 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Artisanal presentation, culinary notes..."
                  className="w-full bg-[#121212] border border-[#C5A880]/20 rounded-xl px-3 py-2 text-xs text-[#EAE6DF] outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-[#EAE6DF]/70 block mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-[#121212] border border-[#C5A880]/20 rounded-xl px-3 py-2 text-xs text-[#EAE6DF] outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#EAE6DF]/70 block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#121212] border border-[#C5A880]/20 rounded-xl px-3 py-2 text-xs text-[#EAE6DF] outline-none">
                    {categories.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] text-[#EAE6DF]/70 block mb-1">Protein (g)</label>
                  <input
                    type="number"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                    className="w-full bg-[#121212] border border-[#C5A880]/20 rounded-xl px-2 py-2 text-xs text-[#EAE6DF] outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#EAE6DF]/70 block mb-1">Calories</label>
                  <input
                    type="number"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    className="w-full bg-[#121212] border border-[#C5A880]/20 rounded-xl px-2 py-2 text-xs text-[#EAE6DF] outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#EAE6DF]/70 block mb-1">Prep Time (min)</label>
                  <input
                    type="number"
                    value={prepTime}
                    onChange={(e) => setPrepTime(e.target.value)}
                    className="w-full bg-[#121212] border border-[#C5A880]/20 rounded-xl px-2 py-2 text-xs text-[#EAE6DF] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-[#EAE6DF]/70 block mb-1">Image URL</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-[#121212] border border-[#C5A880]/20 rounded-xl px-3 py-2 text-xs text-[#EAE6DF] outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-[#C5A880]/15">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#1A1A1A] text-xs font-semibold text-[#EAE6DF]">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#8C7355] text-[#0A0A0A] font-bold text-xs uppercase tracking-wider hover:brightness-110 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin text-[#0A0A0A]" /> : 'Save Dish to Menu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
