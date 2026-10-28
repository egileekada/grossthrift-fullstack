'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, LogOut, Home, Telescope, Sliders } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, handleLogout, setIsAuthModalOpen } = useApp();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLinkClick = (path: string, sectionId?: string) => {
    setMobileMenuOpen(false);
    router.push(path);

    if (sectionId) {
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <>
      <nav
        className={`fixed left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-out flex items-center justify-between ${
          scrolled
            ? 'top-4 w-[calc(100%-2rem)] sm:w-[calc(100%-3rem)] max-w-[1120px] h-[54px] px-6 bg-gt-surface/80 border border-border shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)] backdrop-blur-[20px]'
            : 'top-6 w-[calc(100%-1.5rem)] sm:w-[calc(100%-2.5rem)] max-w-[1120px] h-[64px] px-8 bg-gt-surface/50 border border-border/40 shadow-[0_4px_24px_-10px_rgba(0,0,0,0.2)] backdrop-blur-[12px]'
        } rounded-full`}
        id="premium-navbar"
      >
        {/* Left: Logo */}
        <Link
          href="/"
          className="flex items-center gap-0 cursor-pointer select-none group shrink-0"
          id="nav-logo"
        >
          <span className="font-display font-bold text-[18px] sm:text-[20px] text-ink tracking-[-1px] uppercase transition-transform group-hover:scale-102">
            Gross<span className="text-accent font-serif italic font-normal lowercase tracking-wide">thrift</span>
          </span>
        </Link>

        {/* Center: Desktop links */}
        <div
          className="hidden md:flex items-center gap-[24px] bg-charcoal/5 dark:bg-white/5 py-1 px-4.5 rounded-full border border-border/10"
          id="desktop-nav-links"
        >
          <Link
            href="/"
            className={`text-[13px] font-medium cursor-pointer transition-all duration-200 flex items-center gap-1.5 hover:text-ink hover:scale-105 active:scale-95 py-1 ${
              pathname === '/' ? 'text-ink font-semibold' : 'text-slate'
            }`}
          >
            <Home size={14} className={pathname === '/' ? 'text-ink' : 'text-slate/80'} />
            <span>Home</span>
          </Link>

          <Link
            href="/browse"
            className={`text-[13px] font-medium cursor-pointer transition-all duration-200 flex items-center gap-1.5 hover:text-ink hover:scale-105 active:scale-95 py-1 ${
              pathname === '/browse' ? 'text-ink font-semibold' : 'text-slate'
            }`}
          >
            <Telescope size={14} className={pathname === '/browse' ? 'text-ink' : 'text-slate/80'} />
            <span>Explore Split</span>
          </Link>

          <Link
            href="/create"
            className={`text-[13px] font-medium cursor-pointer transition-all duration-200 flex items-center gap-1.5 hover:text-ink hover:scale-105 active:scale-95 py-1 ${
              pathname === '/create' ? 'text-ink font-semibold' : 'text-slate'
            }`}
          >
            <Sliders size={14} className={pathname === '/create' ? 'text-ink' : 'text-slate/80'} />
            <span>List a Split</span>
          </Link>
        </div>

        {/* Right Action buttons */}
        <div className="hidden md:flex items-center gap-3.5" id="desktop-actions">
          {user ? (
            <div className="flex items-center gap-2 bg-charcoal/5 dark:bg-white/5 p-1 rounded-full border border-border/10">
              <Link
                href="/dashboard"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all ${
                  pathname === '/dashboard'
                    ? 'bg-charcoal text-white dark:text-[#141c17]'
                    : 'bg-transparent text-slate hover:text-ink'
                }`}
              >
                <Image
                  src={user.avatar}
                  alt={user.name}
                  width={18}
                  height={18}
                  className="h-4.5 w-4.5 rounded-full object-cover"
                  unoptimized
                />
                <span className="max-w-[90px] truncate">{user.name.split(' ')[0]}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="p-1.5 text-dust hover:text-gt-red transition-colors duration-150 cursor-pointer rounded-full hover:bg-red-500/10"
                title="Sign out"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="text-[13px] font-semibold text-slate hover:text-ink transition-colors duration-150 cursor-pointer px-3.5 py-1.5 rounded-full hover:bg-charcoal/5 dark:hover:bg-white/5"
              >
                Sign in
              </button>
              <Link
                href="/browse"
                className="px-[16px] py-[7px] bg-[#115c3e] hover:bg-[#15724c] text-white text-[13px] font-bold rounded-full transition-all duration-150 cursor-pointer shadow-sm hover:scale-[1.02]"
              >
                Get started
              </Link>
            </div>
          )}
        </div>

        {/* Hamburger Mobile Menu Toggle */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-ink cursor-pointer hover:bg-charcoal/5 dark:hover:bg-white/5 rounded-full transition-colors"
            aria-label="Toggle menu"
            id="mobile-menu-toggle"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      {/* Full Screen Overlay Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-40 bg-off-white/95 backdrop-blur-[24px] pt-24 px-8 flex flex-col space-y-8 md:hidden"
            id="mobile-menu-overlay"
          >
            <div className="flex flex-col space-y-6 text-left">
              <button
                onClick={() => handleLinkClick('/browse')}
                className="text-[24px] font-medium text-ink hover:text-slate text-left cursor-pointer"
              >
                Browse splits
              </button>
              <button
                onClick={() => handleLinkClick('/', 'how-it-works-section')}
                className="text-[24px] font-medium text-ink hover:text-slate text-left cursor-pointer"
              >
                How it works
              </button>
              <button
                onClick={() => handleLinkClick('/', 'categories-section')}
                className="text-[24px] font-medium text-ink hover:text-slate text-left cursor-pointer"
              >
                Pricing
              </button>
              {user && (
                <button
                  onClick={() => handleLinkClick('/dashboard')}
                  className="text-[24px] font-medium text-ink hover:text-slate text-left cursor-pointer flex items-center gap-2"
                >
                  <Image
                    src={user.avatar}
                    alt={user.name}
                    width={28}
                    height={28}
                    className="h-7 w-7 rounded-full object-cover"
                    unoptimized
                  />
                  <span>My Dashboard</span>
                </button>
              )}
            </div>

            <div className="border-t border-border pt-8 flex flex-col space-y-4">
              {user ? (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full py-3.5 border border-gt-red text-gt-red font-medium rounded-[10px] text-center text-[15px]"
                >
                  Sign out
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setIsAuthModalOpen(true);
                    }}
                    className="w-full py-3.5 border border-border text-ink font-medium rounded-[10px] text-center text-[15px]"
                  >
                    Sign in
                  </button>
                  <button
                    onClick={() => handleLinkClick('/create')}
                    className="w-full py-3.5 bg-charcoal text-white dark:text-[#141c17] font-medium rounded-[10px] text-center text-[15px]"
                  >
                    List a split
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
