import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { IconMenu } from '../ui/Icons';
import { MobileMenu } from './MobileMenu';
import Button from '../ui/Button';

/**
 * Topbar (Navbar) — Part 8.1 & Part 21.3
 * Fixed position, --paper background at 92% with 8px backdrop-blur.
 * Height 88px at rest, shrinking to 64px on scroll (>120px) with bottom --rule hairline.
 * Fraunces wordmark "DocuGuard AI", underline-hover navigation links,
 * and primary "Speak with us" action.
 */
export function Topbar() {
  const { user, trust, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 120);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const publicLinks = [
    { href: '/capabilities', label: 'Capabilities' },
    { href: '/intelligence', label: 'Intelligence' },
    { href: '/trust', label: 'Trust & Security' },
    { href: '/contact', label: 'Contact' },
  ];

  const portalLinks = [
    { href: '/dashboard', label: 'Cockpit' },
    { href: '/portfolio', label: 'Portfolio' },
    { href: '/documents', label: 'Documents' },
    { href: '/security', label: 'Audit Ledger' },
  ];

  const links = user ? portalLinks : publicLinks;

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-40 transition-all duration-fast ease-in-out-quad ${
          scrolled
            ? 'h-16 border-b border-rule'
            : 'h-[88px] border-b border-rule'
        }`}
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.88)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)'
        }}
      >
        <nav
          aria-label="Primary"
          className="container-wide h-full flex items-center justify-between"
        >
          {/* Brand Wordmark (Fraunces Serif) */}
          <Link
            to="/"
            className="font-display text-2xl font-medium tracking-tight text-ink no-underline select-none"
          >
            DocuGuard AI
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-8">
            {links.map((link) => {
              const isActive = location.pathname === link.href || (link.href !== '/' && location.pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className="font-body text-label text-ink relative py-1 no-underline group"
                >
                  {link.label}
                  <span
                    className={`absolute left-0 -bottom-1 h-px w-full bg-ink transition-transform duration-fast origin-left ${
                      isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                    }`}
                  />
                </Link>
              );
            })}
          </div>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <span className="font-body text-micro border border-ink px-2 py-1 select-none">
                  ZT Score: {trust ?? 100}
                </span>
                <span className="font-body text-body-sm text-ink font-medium">
                  {user.name || user.email}
                </span>
                {user.role === 'admin' && (
                  <span className="font-body text-micro bg-ink text-paper px-1.5 py-0.5 font-semibold">
                    ADMIN
                  </span>
                )}
                <button
                  type="button"
                  onClick={logout}
                  className="font-body text-label text-ink-soft hover:text-ink transition-colors ml-2"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link
                  to="/login"
                  className="font-body text-label text-ink hover:text-ink-soft relative py-1 no-underline group"
                >
                  Client Portal
                  <span className="absolute left-0 -bottom-1 h-px w-full bg-ink scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-fast" />
                </Link>
                <Button href="/contact" variant="primary">
                  Speak with us
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Trigger */}
          <div className="flex items-center lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="inline-flex items-center gap-2 font-body text-label text-ink py-2 px-3 hover:bg-paper-dim transition-colors"
              aria-label="Open navigation menu"
            >
              <span>Menu</span>
              <IconMenu className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </div>
        </nav>
      </header>

      {/* Spacer for fixed navbar */}
      <div className={scrolled ? 'h-16' : 'h-[88px]'} aria-hidden="true" />

      {/* Mobile Menu Drawer */}
      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        navLinks={links}
        user={user}
      />
    </>
  );
}

export default Topbar;
