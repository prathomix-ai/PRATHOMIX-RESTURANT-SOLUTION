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
    <div className="glass rounded-2xl p-6 border border-warm-200 shadow-warm">
      <h3
        className="font-display text-lg font-semibold gradient-text mb-5 flex items-center gap-2"
        style={{ fontFamily: 'Cinzel, serif' }}>
        <Users className="w-5 h-5 text-primary-600" />
        Split the Bill
      </h3>

      {/* People selector */}
      <div className="mb-6">
        <p className="text-xs text-stone-500 uppercase tracking-wider mb-3">Number of people</p>
        <div className="flex gap-2 flex-wrap">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <button
              key={n}
              onClick={() => { setSplits(n); setPaid([]); setConfirm(false); }}
              className={`w-11 h-11 rounded-xl text-sm font-bold transition-all duration-200
                           ${splits === n
                             ? 'bg-primary-600/10 border-2 border-primary-400 text-primary-700 shadow-warm'
                               : 'glass border border-warm-200 text-stone-600 hover:border-primary-400/30'}`}>
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Amount summary */}
        <div className="flex items-center justify-between mb-5 p-4 rounded-xl bg-primary-50 border border-warm-200">
        <div>
            <p className="text-xs text-stone-500">Total</p>
            <p className="text-sm font-bold text-stone-900">₹{total.toFixed(2)}</p>
        </div>
          <ChevronRight className="w-4 h-4 text-stone-400" />
        <div className="text-right">
            <p className="text-xs text-stone-500">Each pays</p>
            <p className="text-xl font-bold text-primary-700">₹{perPerson}</p>
        </div>
      </div>

      {/* Single payer */}
      {splits === 1 && (
        <div className="flex flex-col items-center gap-3">
          <QRCodeCanvas
            value={`upi://pay?pa=${UPI_IDS[0]}&am=${total.toFixed(2)}&cu=INR&tn=Prathomix+Order`}
            size={160}
            bgColor="#FAF9F6"
            fgColor="#2C2C2C"
            level="M"
            style={{ borderRadius: 12, display: 'block' }}
          />
          <p className="text-xs text-stone-500">Scan to pay ₹{total.toFixed(2)}</p>
          <button
            onClick={() => { setConfirm(true); onConfirm(); }}
            className="mt-1 px-6 py-2 rounded-lg bg-accent-green/10 border border-accent-green/20
                       text-accent-green text-sm font-medium hover:bg-accent-green/15 transition-all">
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
                               ? 'bg-accent-green/10 border-2 border-accent-green/30'
                               : 'glass border border-warm-200 hover:border-primary-400/30 hover:shadow-warm'}`}> 

                {/* Paid overlay */}
                <AnimatePresence>
                  {isPaid && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 flex items-center justify-center rounded-xl bg-accent-green/15 z-10">
                      <CheckCircle className="w-8 h-8 text-accent-green" />
                    </motion.div>
                  )}
                </AnimatePresence>

                <p className="text-[10px] text-stone-500 mb-2 font-semibold uppercase tracking-wide">
                  Person {i + 1}
                </p>
                <div className="flex justify-center mb-2">
                  <QRCodeCanvas
                    value={upiUrl}
                    size={72}
                    bgColor="#FAF9F6"
                    fgColor="#2C2C2C"
                    level="L"
                    style={{ borderRadius: 6, display: 'block' }}
                  />
                </div>
                <p className="text-xs font-bold text-primary-700">₹{perPerson}</p>
                <p className="text-[9px] text-stone-500 mt-0.5">Tap when paid</p>
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
            className="mt-5 p-4 rounded-xl bg-accent-green/10 border border-accent-green/20 text-center">
              <p className="text-accent-green font-semibold text-sm">🎉 All payments received!</p>
              <p className="text-xs text-stone-500 mt-1">WhatsApp receipt has been sent. Enjoy your meal!</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
