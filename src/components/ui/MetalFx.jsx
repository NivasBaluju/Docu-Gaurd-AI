import React from 'react';

/**
 * MetalFx — Monochrome Metallic Sheen Wrapper
 * Renders a crisp monochrome silver/chrome metallic shine effect on interactive triggers
 * with pure black-and-white metallic sheen (zero rainbow colors).
 */
export function MetalFx({
  children,
  preset = 'chromatic',
  strength = 0.9,
  reflectionTargets = [],
  className = '',
  onClick
}) {
  return (
    <div 
      className={`metal-fx-wrapper relative block group ${className}`}
      onClick={onClick}
    >
      <div
        className="metal-fx-sheen absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 overflow-hidden"
      >
        <div 
          className="absolute -inset-full w-[200%] h-[200%] bg-gradient-to-r from-transparent via-white/35 to-transparent transform -rotate-45 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" 
          style={{ opacity: strength }}
        />
      </div>
      {children}
    </div>
  );
}

export default MetalFx;
