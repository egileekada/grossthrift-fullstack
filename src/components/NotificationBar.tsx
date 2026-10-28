'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, ArrowRight } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function NotificationBar() {
  const router = useRouter();
  const {
    notifications,
    handleMarkNotifAsRead,
    listings,
    setSelectedListing,
    setIsDetailModalOpen,
  } = useApp();

  const activeNotif = notifications.find((n) => !n.read);

  if (!activeNotif) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        className="bg-gt-sage border-b border-gt-accent/15 px-4 py-3 text-left relative z-40"
        id={`notif-banner-${activeNotif.id}`}
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3 px-2 sm:px-6 lg:px-8">
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-gt-accent/10 rounded-lg text-gt-accent shrink-0 mt-0.5">
              <Sparkles size={14} className="animate-pulse" />
            </div>
            <div className="text-xs text-gt-green font-sans leading-relaxed">
              <span className="font-bold font-display uppercase tracking-wider text-[10px] bg-gt-accent/10 border border-gt-accent/10 px-2 py-0.5 rounded-full mr-2">
                Seat Approved
              </span>
              You have been accepted into{' '}
              <strong className="text-gt-text font-bold">{activeNotif.planName}</strong> hosted by{' '}
              <strong className="text-gt-text font-bold">{activeNotif.hostName}</strong>! Connect with
              them via <strong className="text-gt-text font-bold">{activeNotif.contactMethod}</strong> at{' '}
              <code className="bg-white/80 px-1.5 py-0.5 rounded border border-border font-mono text-gt-text font-bold">
                {activeNotif.contactValue}
              </code>{' '}
              to get your login coordinates.
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
            <button
              onClick={() => {
                const l = listings.find((lst) => lst.id === activeNotif.listingId);
                if (l) {
                  setSelectedListing(l);
                  setIsDetailModalOpen(true);
                }
                router.push('/dashboard');
              }}
              className="px-3.5 py-1.5 bg-gt-green hover:bg-gt-dark text-white rounded-full text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer shadow-xs"
            >
              <span>Manage Seat</span>
              <ArrowRight size={11} />
            </button>
            <button
              onClick={() => handleMarkNotifAsRead(activeNotif.id)}
              className="p-1.5 text-gt-text-secondary hover:text-gt-text hover:bg-white/40 rounded-full transition-colors cursor-pointer"
              title="Dismiss notification"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
