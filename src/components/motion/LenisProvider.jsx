import React, { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import { useReducedMotion } from './useReducedMotion';

/**
 * LenisProvider — Part 6.6
 * Provides subtle inertia smooth scrolling on desktop.
 * Automatically disabled on touch screens (<768px) and when prefers-reduced-motion is true.
 */
export function LenisProvider({ children }) {
  const lenisRef = useRef(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Disable entirely on mobile touch devices (<768px) and on reduced motion
    const isMobile = window.innerWidth < 768 || 'ontouchstart' in window;
    if (reduced || isMobile) {
      return;
    }

    const lenis = new Lenis({
      duration: 1.0,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
    });
    lenisRef.current = lenis;

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    const rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, [reduced]);

  return <>{children}</>;
}

export default LenisProvider;
