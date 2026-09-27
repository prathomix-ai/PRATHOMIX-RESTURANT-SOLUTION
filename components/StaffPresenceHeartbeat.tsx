'use client';

import { useEffect, useRef } from 'react';
import { getClientSession } from '@/lib/auth';

interface Props {
  role?: string;
  userId?: string;
  userName?: string;
}

export default function StaffPresenceHeartbeat({ role, userId, userName }: Props) {
  const timerRef = useRef<any>(null);

  useEffect(() => {
    const user = getClientSession();
    const effectiveRole = (role || user?.role || '').toLowerCase();
    const effectiveId = userId || user?.id || `staff-${effectiveRole}`;
    const effectiveName = userName || user?.name || `${effectiveRole.toUpperCase()} Station`;

    // Only staff generate heartbeats (ignore customers / unauthenticated)
    const validStaffRoles = ['waiter', 'chef', 'kitchen', 'receptionist', 'reception', 'admin', 'manager', 'owner'];
    if (!validStaffRoles.includes(effectiveRole)) {
      return;
    }

    const sendHeartbeat = (status: 'active' | 'away' | 'offline' = 'active') => {
      try {
        const payload = {
          userId: effectiveId,
          userName: effectiveName,
          userRole: effectiveRole,
          status,
        };

        if (status === 'offline' && typeof navigator !== 'undefined' && navigator.sendBeacon) {
          navigator.sendBeacon('/api/presence/heartbeat', JSON.stringify(payload));
          return;
        }

        fetch('/api/presence/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {});
      } catch {
        // silent fail
      }
    };

    // Send immediate initial heartbeat
    sendHeartbeat('active');

    // Periodically send heartbeat every 20 seconds
    timerRef.current = setInterval(() => {
      const isVisible = typeof document !== 'undefined' && document.visibilityState === 'visible';
      sendHeartbeat(isVisible ? 'active' : 'away');
    }, 20000);

    // Visibility change handler (active vs away)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        sendHeartbeat('away');
      } else {
        sendHeartbeat('active');
      }
    };

    // Tab close / navigation unload handler
    const handleUnload = () => {
      sendHeartbeat('offline');
    };

    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('beforeunload', handleUnload);
      window.addEventListener('pagehide', handleUnload);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (typeof window !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('beforeunload', handleUnload);
        window.removeEventListener('pagehide', handleUnload);
      }
    };
  }, [role, userId, userName]);

  return null;
}
