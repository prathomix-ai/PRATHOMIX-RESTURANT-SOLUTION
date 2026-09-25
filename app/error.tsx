'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { RefreshCw, Home } from 'lucide-react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-lg w-full glass border border-warm-200 rounded-[2rem] p-8 text-center shadow-warm-lg">
        <p className="text-xs uppercase tracking-[0.35em] text-primary-700 font-semibold mb-3">Something went wrong</p>
        <h1 className="font-display text-3xl sm:text-4xl font-bold gradient-text mb-4" style={{ fontFamily: 'Cinzel, serif' }}>
          We hit a runtime issue
        </h1>
        <p className="text-stone-600 leading-relaxed mb-8">
          The app crashed while rendering this page. You can try again, or go back to the home page.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="lift-3d shine-sweep inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 bg-primary-700 text-white font-semibold shadow-warm-lg">
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
          <Link
            href="/"
            className="lift-3d shine-sweep inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 glass border border-warm-200 text-stone-700 font-semibold hover:text-primary-700">
            <Home className="w-4 h-4" />
            Go home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
