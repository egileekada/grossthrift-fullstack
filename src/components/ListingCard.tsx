'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ShieldCheck, User, Plus } from 'lucide-react';
import { Listing } from '@/types/listing';
import PlanIcon from './PlanIcon';

interface ListingCardProps {
  listing: Listing;
  onSelect: (listing: Listing) => void;
  isSaved?: boolean;
  onToggleSave?: (id: string, e: React.MouseEvent) => void;
}

export default function ListingCard({ listing, onSelect }: ListingCardProps) {
  const costPerPerson = listing.totalCost / listing.slotsTotal;
  const isFull = listing.slotsFilled === listing.slotsTotal;
  const slotsAvailable = listing.slotsTotal - listing.slotsFilled;

  // Calculate savings vs paying retail price alone
  const savingsPercent = Math.round((1 - costPerPerson / listing.totalCost) * 100);

  // Generate stable initials avatar gradients based on host name
  const initials = listing.hostName ? listing.hostName.slice(0, 2).toUpperCase() : 'GT';
  const colors = [
    'from-neutral-800 to-neutral-900',
    'from-zinc-700 to-zinc-900',
    'from-neutral-600 to-neutral-800',
    'from-stone-700 to-stone-900',
  ];
  const colorIndex = (listing.hostName || 'GT').charCodeAt(0) % colors.length;
  const avatarBg = colors[colorIndex];

  return (
    <motion.div
      layout
      onClick={() => onSelect(listing)}
      className="group relative flex flex-col justify-between bg-white dark:bg-dark-surface border border-border dark:border-dark-border rounded-[24px] p-6 shadow-gt-card hover:shadow-gt-hover hover:border-neutral-400 dark:hover:border-neutral-600 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] text-left h-[280px] cursor-pointer select-none overflow-hidden"
      id={`listing-card-${listing.id}`}
    >
      {/* 28k.studio Premium Fine Dot Overlay for subtle depth */}
      <div className="absolute inset-0 bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] [background-size:16px_16px] opacity-[0.35] pointer-events-none rounded-[24px]" />

      {/* Main content wrapper */}
      <div className="space-y-5 relative z-10">
        {/* Header: Service Logo and Availability badge */}
        <div className="flex justify-between items-start">
          <div className="flex gap-3">
            <div className="w-[44px] h-[44px] bg-surface dark:bg-dark-bg border border-border dark:border-dark-border rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-colors duration-300">
              <PlanIcon name={listing.planName} size={22} />
            </div>
            <div>
              <h3 className="font-display font-semibold text-[16px] text-ink dark:text-dark-text leading-tight tracking-tight">
                {listing.planName}
              </h3>
              <p className="text-[10px] font-mono uppercase tracking-widest text-dust mt-0.5 font-bold">
                {listing.category}
              </p>
            </div>
          </div>

          <div className="flex items-center px-2.5 py-1 bg-neutral-50 dark:bg-neutral-900 border border-neutral-150 dark:border-neutral-800/80 rounded-full shrink-0 select-none">
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-neutral-700 dark:text-neutral-300">
              {isFull ? 'Full' : `${slotsAvailable} Open`}
            </span>
          </div>
        </div>

        {/* Dynamic Co-op Seat Visualizer (Creative Group Spots) */}
        <div className="space-y-2">
          <div className="flex justify-between items-baseline text-[11px]">
            <span className="text-slate dark:text-dark-muted font-medium uppercase font-mono tracking-wider">
              Group spots
            </span>
            <span className="font-mono text-ink dark:text-dark-text font-bold">
              {listing.slotsFilled}/{listing.slotsTotal} Joined
            </span>
          </div>

          {/* Seat Map: Highly polished avatar/seat representation */}
          <div className="flex items-center gap-1.5 h-7">
            {Array.from({ length: listing.slotsTotal }).map((_, slotIdx) => {
              const isFilled = slotIdx < listing.slotsFilled;
              if (isFilled) {
                return (
                  <div
                    key={slotIdx}
                    className="w-7 h-7 rounded-full bg-ink dark:bg-dark-bg border border-white dark:border-dark-surface flex items-center justify-center shrink-0 shadow-sm text-white dark:text-dark-text transition-all duration-300"
                    title="Filled slot"
                  >
                    <User size={11} className="opacity-80" />
                  </div>
                );
              } else {
                return (
                  <div
                    key={slotIdx}
                    className="w-7 h-7 rounded-full bg-transparent border border-dashed border-dust/40 dark:border-dark-border flex items-center justify-center shrink-0 text-dust hover:border-accent/40 dark:hover:border-accent/50 transition-colors duration-300 cursor-pointer"
                    title="Open slot"
                  >
                    <Plus size={11} className="opacity-60" />
                  </div>
                );
              }
            })}
          </div>
        </div>
      </div>

      {/* Bottom Footer: Price info & Host & Action button */}
      <div className="pt-4 border-t border-border/60 dark:border-dark-border/60 flex items-end justify-between relative z-10">
        <div className="space-y-1.5">
          {/* Host identity with high readability */}
          <div className="flex items-center gap-1.5">
            <div className="relative">
              {listing.hostAvatar ? (
                <Image
                  src={listing.hostAvatar}
                  alt={listing.hostName}
                  width={20}
                  height={20}
                  className="w-5 h-5 rounded-full object-cover border border-border dark:border-dark-border shrink-0"
                  unoptimized
                />
              ) : (
                <div
                  className={`w-5 h-5 rounded-full bg-gradient-to-br ${avatarBg} text-white flex items-center justify-center text-[8px] font-bold tracking-tighter shrink-0 shadow-sm`}
                >
                  {initials}
                </div>
              )}
              {listing.countryFlag && (
                <span className="absolute -bottom-1 -right-1 text-[8px] bg-white dark:bg-dark-surface rounded-full w-3.5 h-3.5 flex items-center justify-center shadow-xs border border-border/40 select-none">
                  {listing.countryFlag}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-[11px] font-medium text-slate dark:text-dark-muted truncate max-w-[80px]">
                {listing.hostName}
              </span>
              {listing.hostVerified && (
                <ShieldCheck size={11} className="text-[#115c3e] dark:text-[#2ecc71] shrink-0" />
              )}
            </div>
          </div>

          {/* Pricing with modern savings badge */}
          <div className="flex items-baseline gap-1">
            <span className="text-[20px] font-bold text-ink dark:text-dark-text tracking-tight font-numeric-tabular leading-none">
              ${costPerPerson.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate dark:text-dark-muted font-medium">/mo</span>
            <span className="ml-1 px-1.5 py-0.5 bg-gt-savings-bg text-gt-savings-text rounded-[4px] text-[9px] font-bold tracking-wide select-none shrink-0">
              -{savingsPercent}%
            </span>
          </div>
        </div>

        {/* Action button adhering to brand style guidelines */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect(listing);
          }}
          className={`px-4 h-9 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider flex items-center justify-center border select-none shrink-0 ${
            isFull
              ? 'bg-surface dark:bg-dark-bg text-dust border-border dark:border-dark-border cursor-not-allowed'
              : 'bg-charcoal border-charcoal text-white dark:text-[#141c17] active:scale-[0.96] shadow-sm cursor-pointer'
          }`}
        >
          <span>{isFull ? 'Full' : 'Join'}</span>
        </button>
      </div>
    </motion.div>
  );
}
