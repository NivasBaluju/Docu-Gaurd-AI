import React from 'react';
import { ThinkingOrb } from 'thinking-orbs';

/**
 * ThinkingLoader — Universal Waiting & Intelligence Processing State
 * Incorporates ThinkingOrb from 'thinking-orbs' per executive specification.
 * Replaces generic spinners and skeleton blocks across public & authenticated views.
 */
export function ThinkingLoader({
  state = 'working',
  size = 64,
  caption = '',
  subcaption = '',
  inline = false,
  className = ''
}) {
  if (inline) {
    return (
      <span
        role="status"
        aria-live="polite"
        className={`inline-flex items-center gap-3 ${className}`}
      >
        <ThinkingOrb state={state} size={size || 24} />
        {caption && (
          <span className="font-body text-body-sm text-ink font-medium">
            {caption}
          </span>
        )}
      </span>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}
    >
      <div className="flex items-center justify-center mb-4">
        <ThinkingOrb state={state} size={size} />
      </div>
      {caption && (
        <h4 className="font-body text-heading-02 text-ink font-semibold tracking-tight">
          {caption}
        </h4>
      )}
      {subcaption && (
        <p className="font-body text-body-sm text-neutral-600 mt-1 max-w-md">
          {subcaption}
        </p>
      )}
    </div>
  );
}

export default ThinkingLoader;
