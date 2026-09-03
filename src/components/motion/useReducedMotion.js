import { useState, useEffect } from 'react';

/**
 * useReducedMotion — Part 12.3 Accessibility Requirement
 * Detects whether the user has requested reduced motion at the OS level.
 * When true, all orchestrated GSAP timelines, redaction bars, and Lenis smooth scroll
 * immediately resolve to their final resting states.
 */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleChange = (e) => setReduced(e.matches);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  return reduced;
}

export default useReducedMotion;
