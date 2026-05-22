'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Navigation, Clock, AlertTriangle, Loader2 } from 'lucide-react';

const RESTAURANT = {
  lat: 26.9124,
  lng: 75.7873,
  name: 'Prathomix Restaurant',
  address: 'Mi Road, Jaipur, Rajasthan 302001',
};

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R    = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface Props { isOpen: boolean; onClose: () => void; }

export default function LocationModal({ isOpen, onClose }: Props) {
  const [userLoc,  setUserLoc]  = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setLocError(null);
    setUserLoc(null);
    setDistance(null);

    if (!navigator.geolocation) {
      setLocError('Geolocation is not supported by your browser.');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setUserLoc({ lat, lng });
        setDistance(haversineKm(lat, lng, RESTAURANT.lat, RESTAURANT.lng));
        setLoading(false);
      },
      (err) => {
        setLocError(err.message || 'Could not get your location.');
        setLoading(false);
      },
      { timeout: 8000 }
    );
  }, [isOpen]);

  const eta = distance ? Math.ceil(distance * 3) : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={onClose}>
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="glass border border-warm-200 rounded-2xl p-6 w-full max-w-md relative shadow-warm-lg"
            onClick={(e) => e.stopPropagation()}>

            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors">
              <X className="w-5 h-5" />
            </button>

            <h2
              className="font-display text-xl font-semibold gradient-text mb-6 flex items-center gap-2"
              style={{ fontFamily: 'Cinzel, serif' }}>
              <MapPin className="w-5 h-5 text-primary-600" />
              Find Us
            </h2>

            {/* Restaurant Card */}
            <div className="glass-dark rounded-xl p-4 mb-3 border border-primary-600/15">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-primary-600 animate-pulse" />
                <span className="text-[10px] text-primary-600 font-semibold uppercase tracking-widest">Restaurant</span>
              </div>
              <p className="text-sm font-semibold text-gray-900">{RESTAURANT.name}</p>
              <p className="text-xs text-gray-600 mt-0.5">{RESTAURANT.address}</p>
              <p className="text-xs text-gray-500 mt-0.5">Open: 12:00 PM – 11:00 PM, Daily</p>
            </div>

            {/* User Location Card */}
            <div className="glass-dark rounded-xl p-4 mb-5 border border-warm-200/40">
              <div className="flex items-center gap-2 mb-1">
                <Navigation className="w-3 h-3 text-accent-green" />
                <span className="text-[10px] text-accent-green font-semibold uppercase tracking-widest">Your Location</span>
              </div>
              {loading && (
                <div className="flex items-center gap-2 text-gray-600 text-sm">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Detecting…
                </div>
              )}
              {locError && (
                <div className="flex items-start gap-2 text-accent-red text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>{locError}</span>
                </div>
              )}
              {userLoc && !loading && (
                <p className="text-sm text-gray-900 font-medium">
                  {userLoc.lat.toFixed(4)}°N, {userLoc.lng.toFixed(4)}°E
                </p>
              )}
            </div>

            {/* Distance + ETA */}
            {distance !== null && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 gap-3 mb-4">
                <div className="glass rounded-xl p-4 text-center border border-primary-600/15">
                  <p className="text-2xl font-bold text-primary-600">{distance.toFixed(1)}</p>
                  <p className="text-xs text-gray-600 mt-0.5">km away</p>
                </div>
                <div className="glass rounded-xl p-4 text-center border border-warm-200/40">
                  <div className="flex items-center justify-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-gray-600" />
                    <p className="text-2xl font-bold text-gray-900">{eta}</p>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">min drive est.</p>
                </div>
              </motion.div>
            )}

            <a
              href={`https://maps.google.com/?q=${RESTAURANT.lat},${RESTAURANT.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                         bg-primary-600/10 hover:bg-primary-600/20 border border-primary-600/25
                         hover:border-primary-400/60 text-primary-600 text-sm font-medium
                         transition-all duration-200 hover:shadow-warm">
              <MapPin className="w-4 h-4" />
              Open in Google Maps
            </a>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
