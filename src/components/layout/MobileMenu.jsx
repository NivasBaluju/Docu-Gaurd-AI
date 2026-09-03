import React, { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { IconClose } from '../ui/Icons';
import { useReducedMotion } from '../motion/useReducedMotion';

/**
 * MobileMenu — Part 8.2 & Part 6.4
 * Full-screen --ink background takeover wiping up from bottom.
 * Staggered display-03 links, circular 48px close button, quick-contact footer.
 */
export function MobileMenu({ isOpen, onClose, navLinks = [], user = null }) {
  const panelRef = useRef(null);
  const location = useLocation();
  const reduced = useReducedMotion();

  // Close on route change
  useEffect(() => {
    onClose();
  }, [location.pathname]);

  // Trap focus & lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (panelRef.current) {
        panelRef.current.focus();
      }
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Navigation Menu"
      className="fixed inset-0 z-50 flex flex-col justify-between bg-ink text-paper p-6 sm:p-10 outline-none"
      style={{
        backgroundColor: '#0A0A0A',
        color: '#FAF9F6'
      }}
    >
      {/* Top Bar: Wordmark & Circular Close Button */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-6">
        <Link
          to="/"
          className="font-display text-2xl font-medium tracking-tight text-paper no-underline"
          onClick={onClose}
        >
          DocuGuard AI
        </Link>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="btn-circle w-12 h-12 flex items-center justify-center border border-neutral-700 hover:border-paper transition-colors duration-fast text-paper"
          style={{ borderRadius: '50%' }}
        >
          <IconClose className="w-5 h-5 text-paper" />
        </button>
      </div>

      {/* Primary Links in display-03 */}
      <nav aria-label="Mobile Navigation" className="my-auto py-8">
        <ul className="list-none p-0 m-0 space-y-6">
          {navLinks.map((link, idx) => {
            const isActive = location.pathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  to={link.href}
                  onClick={onClose}
                  className={`font-display text-3xl sm:text-4xl block no-underline transition-all duration-fast ${
                    isActive ? 'text-paper font-semibold' : 'text-neutral-400 hover:text-paper'
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}

          {user ? (
            <li>
              <Link
                to="/dashboard"
                onClick={onClose}
                className="font-display text-3xl sm:text-4xl block text-paper no-underline mt-4 pt-4 border-t border-neutral-800"
              >
                Executive Cockpit
              </Link>
            </li>
          ) : (
            <li>
              <Link
                to="/login"
                onClick={onClose}
                className="font-display text-3xl sm:text-4xl block text-neutral-400 hover:text-paper no-underline mt-4 pt-4 border-t border-neutral-800"
              >
                Client Portal Sign In
              </Link>
            </li>
          )}
        </ul>
      </nav>

      {/* Quick Contact Footer within Menu */}
      <div className="border-t border-neutral-800 pt-6">
        <p className="font-body text-body-sm text-neutral-400">
          Executive Inquiries & Counsel Dispatch
        </p>
        <p className="font-body text-heading-02 text-paper font-medium mt-1">
          +1 (212) 555-0190 • dispatch@docuguard.ai
        </p>
        <p className="font-body text-micro text-neutral-500 mt-2">
          New York • London • Singapore
        </p>
      </div>
    </div>
  );
}

export default MobileMenu;
