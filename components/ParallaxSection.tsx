'use client';
import { useRef, type ReactNode } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

interface ParallaxSectionProps {
  children: ReactNode;
  /** Parallax speed: 0 = no shift, 0.3 = gentle, 0.5 = dramatic. Default 0.25 */
  speed?: number;
  className?: string;
  bgImageUrl?: string;
  /** Additional overlay gradient */
  overlay?: string;
}

/**
 * GPU-composited parallax section — background scrolls at a different rate
 * than foreground content. Uses framer-motion useScroll + useTransform so
 * the shift is applied via CSS `transform: translateY(…)`, which runs on the
 * compositor thread for 60fps on mobile.
 */
export default function ParallaxSection({
  children,
  speed = 0.25,
  className = '',
  bgImageUrl,
  overlay = 'rgba(250,249,246,0.42)',
}: ParallaxSectionProps) {
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  // Map scroll progress [0→1] to a vertical shift. Negative so BG moves up
  // more slowly than the viewport — classic parallax feeling.
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', `${speed * 60}%`]);

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      {bgImageUrl && (
        <motion.div
          aria-hidden
          className="absolute inset-0 z-0 will-change-transform"
          style={{
            backgroundImage: `url(${bgImageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            y: bgY,
            // Scale up a bit so parallax shift doesn't reveal edges
            scale: 1.18,
          }}
        />
      )}
      {/* Overlay */}
      {bgImageUrl && (
        <div
          aria-hidden
          className="absolute inset-0 z-[1] pointer-events-none"
          style={{ background: overlay }}
        />
      )}
      <div className="relative z-[2]">{children}</div>
    </div>
  );
}
