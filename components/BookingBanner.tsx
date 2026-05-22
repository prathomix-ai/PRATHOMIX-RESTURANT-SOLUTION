import Link from 'next/link';
import { Calendar, ArrowRight } from 'lucide-react';

export default function BookingBanner() {
  return (
    <section className="py-16 px-4">
      <div className="max-w-4xl mx-auto glass border border-warm-200 rounded-3xl p-10 sm:p-14 text-center relative overflow-hidden shadow-warm-lg">
        {/* Subtle radial glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600/5 via-transparent to-transparent pointer-events-none" />

        <Calendar className="w-10 h-10 text-primary-600 mx-auto mb-5" />

        <h2
          className="font-display text-3xl sm:text-4xl font-bold gradient-text mb-4"
          style={{ fontFamily: 'Cinzel, serif' }}>
          Reserve Your Table
        </h2>

        <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
          Book instantly online, receive a WhatsApp confirmation, and let Priya handle the rest.
          No waiting, no calls.
        </p>

        <Link
          href="/reservation"
          className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-bold
                     px-8 py-3.5 rounded-xl transition-all duration-200 shadow-warm-lg
                     hover:scale-[1.03] active:scale-100 text-sm">
          Book Now — It&apos;s Free
          <ArrowRight className="w-4 h-4" />
        </Link>

        <p className="text-xs text-gray-600 mt-4">
          Open daily · 12:00 PM – 11:00 PM · Mi Road, Jaipur
        </p>
      </div>
    </section>
  );
}
