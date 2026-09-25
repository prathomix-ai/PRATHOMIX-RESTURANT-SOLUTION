'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Table as TableIcon,
  Plus,
  QrCode,
  Printer,
  Download,
  Users,
  CheckCircle2,
  Trash2,
  X,
  ExternalLink,
} from 'lucide-react';
import { supabase, RESTAURANT_TABLES, DEFAULT_RESTAURANT_ID } from '@/lib/supabase';

interface Props {
  tables: any[];
  onRefresh: () => void;
}

export default function AdminTables({ tables, onRefresh }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [qrModalTable, setQrModalTable] = useState<any | null>(null);
  const [tableNum, setTableNum] = useState('');
  const [capacity, setCapacity] = useState('4');
  const [section, setSection] = useState('Main Dining');
  const [saving, setSaving] = useState(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  async function handleAddTable(e: React.FormEvent) {
    e.preventDefault();
    if (!tableNum) return;

    setSaving(true);
    try {
      await supabase.from(RESTAURANT_TABLES.restaurantTables).insert({
        restaurant_id: DEFAULT_RESTAURANT_ID,
        table_number: parseInt(tableNum),
        capacity: parseInt(capacity) || 4,
        section: section.trim() || 'Main Dining',
        status: 'available',
      });
      setModalOpen(false);
      setTableNum('');
      onRefresh();
    } catch (err) {
      console.error('Failed to add table:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTable(tableNumber: number) {
    if (!confirm(`Delete Table ${tableNumber}?`)) return;
    try {
      await supabase
        .from(RESTAURANT_TABLES.restaurantTables)
        .delete()
        .eq('table_number', tableNumber)
        .eq('restaurant_id', DEFAULT_RESTAURANT_ID);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  }

  function handlePrintQR() {
    window.print();
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2
            className="font-display text-2xl font-bold text-[#EAE6DF] tracking-wide"
            style={{ fontFamily: 'Cinzel, serif' }}>
            Floor &amp; Table Management
          </h2>
          <p className="text-xs text-[#EAE6DF]/60">
            {tables.length} tables · Instant QR digital menu generation · Section layouts
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#8C7355] text-[#0A0A0A] font-bold text-xs uppercase tracking-wider shadow-warm hover:brightness-110 transition-all">
          <Plus className="w-4 h-4" /> Add Floor Table
        </button>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tables.map((tbl) => {
          const qrLink = `${baseUrl}/menu?table=${tbl.table_number}`;

          return (
            <div
              key={tbl.table_number}
              className="glass-dark border border-[#C5A880]/20 rounded-2xl p-5 space-y-4 relative group">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display font-bold text-xl text-[#EAE6DF]" style={{ fontFamily: 'Cinzel, serif' }}>
                    Table {tbl.table_number}
                  </h3>
                  <span className="text-xs text-[#C5A880] font-semibold">{tbl.section || 'Main Dining'}</span>
                </div>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                  {tbl.status || 'available'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#121212] flex items-center justify-between text-xs text-[#EAE6DF]/70">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#C5A880]" /> Capacity:
                </span>
                <span className="font-bold text-[#EAE6DF]">{tbl.capacity || 4} Guests</span>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-2 border-t border-[#C5A880]/10">
                <button
                  onClick={() => setQrModalTable(tbl)}
                  className="flex-1 py-2 rounded-xl bg-[#C5A880]/15 hover:bg-[#C5A880] text-[#C5A880] hover:text-[#0A0A0A] font-bold text-xs flex items-center justify-center gap-1.5 transition-all">
                  <QrCode className="w-3.5 h-3.5" /> View QR Code
                </button>
                <button
                  onClick={() => handleDeleteTable(tbl.table_number)}
                  className="p-2 rounded-xl bg-[#121212] hover:bg-rose-500/20 text-[#EAE6DF]/60 hover:text-rose-400 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* QR Code Standee Modal */}
      {qrModalTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-dark border border-[#C5A880]/40 rounded-3xl p-8 max-w-sm w-full text-center space-y-5 shadow-2xl relative">
            <button
              onClick={() => setQrModalTable(null)}
              className="absolute right-4 top-4 p-1 text-[#EAE6DF]/60 hover:text-[#EAE6DF]">
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-[0.35em] text-[#C5A880] font-bold">Digital Dining Standee</p>
              <h3 className="font-display font-bold text-2xl text-[#EAE6DF]" style={{ fontFamily: 'Cinzel, serif' }}>
                Table {qrModalTable.table_number}
              </h3>
              <p className="text-xs text-[#EAE6DF]/60">Scan with your smartphone camera to order</p>
            </div>

            {/* QR Code Graphic with Gold Border */}
            <div className="p-5 rounded-2xl bg-white mx-auto inline-block shadow-warm border-4 border-[#C5A880]">
              <QRCodeSVG
                value={`${baseUrl}/menu?table=${qrModalTable.table_number}`}
                size={180}
                level="H"
                fgColor="#0A0A0A"
              />
            </div>

            <p className="text-[11px] font-mono text-[#C5A880] break-all bg-[#121212] p-2 rounded-xl border border-[#C5A880]/20">
              {`${baseUrl}/menu?table=${qrModalTable.table_number}`}
            </p>

            <div className="flex gap-2 pt-2">
              <a
                href={`${baseUrl}/menu?table=${qrModalTable.table_number}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2.5 rounded-xl bg-[#121212] border border-[#C5A880]/30 hover:border-[#C5A880] text-xs font-semibold text-[#EAE6DF] flex items-center justify-center gap-1.5 transition-all">
                <ExternalLink className="w-3.5 h-3.5" /> Test Link
              </a>
              <button
                onClick={handlePrintQR}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#8C7355] text-[#0A0A0A] font-bold text-xs uppercase tracking-wider shadow-warm flex items-center justify-center gap-1.5 hover:brightness-110 transition-all">
                <Printer className="w-3.5 h-3.5" /> Print Standee
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Table Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-dark border border-[#C5A880]/30 rounded-3xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#C5A880]/15">
              <h3 className="font-display font-bold text-lg text-[#EAE6DF]" style={{ fontFamily: 'Cinzel, serif' }}>
                Add Floor Table
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 text-[#EAE6DF]/60 hover:text-[#EAE6DF]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddTable} className="space-y-3">
              <div>
                <label className="text-[11px] text-[#EAE6DF]/70 block mb-1">Table Number *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={tableNum}
                  onChange={(e) => setTableNum(e.target.value)}
                  placeholder="e.g. 11"
                  className="w-full bg-[#121212] border border-[#C5A880]/20 rounded-xl px-3 py-2 text-xs text-[#EAE6DF] outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-[#EAE6DF]/70 block mb-1">Capacity (Guests)</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="w-full bg-[#121212] border border-[#C5A880]/20 rounded-xl px-3 py-2 text-xs text-[#EAE6DF] outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-[#EAE6DF]/70 block mb-1">Floor Section</label>
                <select
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="w-full bg-[#121212] border border-[#C5A880]/20 rounded-xl px-3 py-2 text-xs text-[#EAE6DF] outline-none">
                  <option value="Main Dining">Main Dining</option>
                  <option value="Terrace Garden">Terrace Garden</option>
                  <option value="VIP Lounge">VIP Lounge</option>
                  <option value="Bar &amp; High Tops">Bar &amp; High Tops</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#1A1A1A] text-xs font-semibold text-[#EAE6DF]">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#8C7355] text-[#0A0A0A] font-bold text-xs uppercase tracking-wider hover:brightness-110 transition-all">
                  Create Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
