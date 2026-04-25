'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react';
import { Users, CheckCircle, ChevronRight } from 'lucide-react';

const UPI_IDS = [
  'prathomix@okaxis',
  'prathomix@ybl',
  'prathomix@upi',
  'prathomix@paytm',
  'prathomix@okicici',
  'prathomix@oksbi',
];

interface Props {
  total:     number;
  onConfirm: () => void;
}

export default function SplitBill({ total, onConfirm }: Props) {
  const [splits,  setSplits]  = useState(2);
  const [paid,    setPaid]    = useState<number[]>([]);
  const [confirm, setConfirm] = useState(false);

  const perPerson = (total / splits).toFixed(2);

  function markPaid(i: number) {
    if (paid.includes(i)) {
      setPaid(paid.filter((x) => x !== i));
      return;
    }
    const next = [...paid, i];
    setPaid(next);
    if (next.length === splits) {
      setTimeout(() => { setConfirm(true); onConfirm(); }, 500);
    }
  }

  return (
    <div className="glass neon-border rounded-2xl p-6">
      <h3
        className="font-display text-lg font-semibold gradient-text mb-5 flex items-center gap-2"
        style={{ fontFamily: 'Cinzel, serif' }}>
        <Users className="w-5 h-5 text-cyan-400" />
        Split the Bill
      </h3>

      {/* People selector */}
      <div className="mb-6">
        <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Number of people</p>
        <div className="flex gap-2 flex-wrap">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <button
              key={n}
              onClick={() => { setSplits(n); setPaid([]); setConfirm(false); }}
              className={`w-11 h-11 rounded-xl text-sm font-bold transition-all duration-200
                           ${splits === n
                             ? 'bg-cyan-500/20 border-2 border-cyan-400 text-cyan-400 shadow-neon-sm'
                             : 'glass border border-slate-700 text-slate-300 hover:border-cyan-500/30'}`}>
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Amount summary */}
      <div className="flex items-center justify-between mb-5 p-4 rounded-xl bg-slate-900/50 border border-slate-800">
        <div>
          <p className="text-xs text-slate-400">Total</p>
          <p className="text-sm font-bold text-white">₹{total.toFixed(2)}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-600" />
        <div className="text-right">
          <p className="text-xs text-slate-400">Each pays</p>
          <p className="text-xl font-bold neon-text">₹{perPerson}</p>
        </div>
      </div>

      {/* Single payer */}
      {splits === 1 && (
        <div className="flex flex-col items-center gap-3">
          <QRCodeCanvas
            value={`upi://pay?pa=${UPI_IDS[0]}&am=${total.toFixed(2)}&cu=INR&tn=Prathomix+Order`}
            size={160}
            bgColor="#0a0a12"
            fgColor="#00ffe7"
            level="M"
            style={{ borderRadius: 12, display: 'block' }}
          />
          <p className="text-xs text-slate-400">Scan to pay ₹{total.toFixed(2)}</p>
          <button
            onClick={() => { setConfirm(true); onConfirm(); }}
            className="mt-1 px-6 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30
                       text-emerald-400 text-sm font-medium hover:bg-emerald-500/25 transition-all">
            Mark as Paid ✓
          </button>
        </div>
      )}

      {/* Multi-person QR grid */}
      {splits > 1 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: splits }).map((_, i) => {
            const isPaid = paid.includes(i);
            const upiUrl = `upi://pay?pa=${UPI_IDS[i % UPI_IDS.length]}&am=${perPerson}&cu=INR&tn=Prathomix+Share+${i + 1}`;

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                onClick={() => markPaid(i)}
                className={`relative rounded-xl p-3 text-center cursor-pointer
                             select-none transition-all duration-200
                             ${isPaid
                               ? 'bg-emerald-500/10 border-2 border-emerald-500/50'
                               : 'glass border border-slate-700 hover:border-cyan-500/30 hover:shadow-neon-sm'}`}>

                {/* Paid overlay */}
                <AnimatePresence>
                  {isPaid && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 flex items-center justify-center rounded-xl bg-emerald-500/20 z-10">
                      <CheckCircle className="w-8 h-8 text-emerald-400" />
                    </motion.div>
                  )}
                </AnimatePresence>

                <p className="text-[10px] text-slate-400 mb-2 font-semibold uppercase tracking-wide">
                  Person {i + 1}
                </p>
                <div className="flex justify-center mb-2">
                  <QRCodeCanvas
                    value={upiUrl}
                    size={72}
                    bgColor="#0a0a12"
                    fgColor="#00ffe7"
                    level="L"
                    style={{ borderRadius: 6, display: 'block' }}
                  />
                </div>
                <p className="text-xs font-bold text-cyan-400">₹{perPerson}</p>
                <p className="text-[9px] text-slate-500 mt-0.5">Tap when paid</p>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* All paid confirmation */}
      <AnimatePresence>
        {confirm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-5 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-center">
            <p className="text-emerald-400 font-semibold text-sm">🎉 All payments received!</p>
            <p className="text-xs text-slate-400 mt-1">WhatsApp receipt has been sent. Enjoy your meal!</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
