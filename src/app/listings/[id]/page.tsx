'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  Share2
} from 'lucide-react';
import { Listing } from '@/types/listing';
import { useApp } from '@/context/AppContext';
import { fetchListingById } from '@/lib/api';
import Navbar from '@/components/Navbar';
import NotificationBar from '@/components/NotificationBar';
import PlanIcon from '@/components/PlanIcon';
import ListingDetailModal from '@/components/ListingDetailModal';
import AuthModal from '@/components/AuthModal';
import { AppButton } from '@/components/ui';

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const {
    user,
    listings,
    selectedListing,
    setSelectedListing,
    isDetailModalOpen,
    setIsDetailModalOpen,
    isAuthModalOpen,
    setIsAuthModalOpen,
    handleConfirmJoin,
    setUser,
  } = useApp();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    const existing = listings.find((l) => l.id === id);
    if (existing) {
      setListing(existing);
      setLoading(false);
    } else {
      fetchListingById(id).then((l) => {
        setListing(l);
        setLoading(false);
      });
    }
  }, [id, listings]);

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gt-bg text-gt-text font-sans antialiased">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-10 h-10 border-4 border-[#115c3e]/20 border-t-[#115c3e] rounded-full animate-spin" />
        </main>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen flex flex-col bg-gt-bg text-gt-text font-sans antialiased">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6 pt-32">
          <div className="p-8 max-w-md w-full bg-white dark:bg-dark-surface border border-border dark:border-[#2e3931] rounded-3xl text-center space-y-4 shadow-xl">
            <h2 className="text-xl font-bold font-display text-ink dark:text-white">
              Listing Not Found
            </h2>
            <p className="text-xs text-slate dark:text-dark-muted">
              The subscription split you are looking for may have been closed or removed.
            </p>
            <div className="pt-2">
              <AppButton variant="primary" size="md" onPress={() => router.push('/browse')}>
                Browse Other Splits
              </AppButton>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const costPerPerson = listing.totalCost / listing.slotsTotal;
  const isFull = listing.slotsFilled >= listing.slotsTotal;
  const slotsAvailable = Math.max(0, listing.slotsTotal - listing.slotsFilled);
  const savingsPercent = Math.round((1 - costPerPerson / listing.totalCost) * 100);

  return (
    <div className="min-h-screen flex flex-col bg-gt-bg text-gt-text font-sans antialiased overflow-x-hidden selection:bg-[#115c3e] selection:text-white">
      <Navbar />
      <NotificationBar />

      <main className="flex-1 pt-[100px] lg:pt-[130px] pb-24 px-6 sm:px-12 max-w-[960px] mx-auto w-full text-left">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/browse"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate dark:text-dark-muted hover:text-ink dark:hover:text-white"
          >
            <ArrowLeft size={14} />
            <span>Back to Browse</span>
          </Link>

          <button
            onClick={handleShare}
            className="px-3 py-1.5 rounded-xl border border-border dark:border-[#2e3931] bg-white dark:bg-dark-surface hover:bg-surface text-xs font-semibold flex items-center gap-1.5 text-slate dark:text-dark-muted"
          >
            <Share2 size={13} />
            <span>{copied ? 'Link Copied!' : 'Share Split'}</span>
          </button>
        </div>

        {/* Main Listing Detail Card */}
        <div className="bg-white dark:bg-dark-surface border border-border dark:border-[#2e3931] rounded-[28px] p-6 sm:p-10 shadow-sm space-y-8">
          {/* Header Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-border/60 dark:border-[#2e3931]/60">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-surface dark:bg-dark-bg border border-border dark:border-[#2e3931] rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
                <PlanIcon name={listing.planName} size={32} />
              </div>
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-dust">
                  {listing.category}
                </span>
                <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink dark:text-white">
                  {listing.planName}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate dark:text-dark-muted">Hosted by {listing.hostName}</span>
                  {listing.hostVerified && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#115c3e] dark:text-[#2ecc71]">
                      <ShieldCheck size={14} /> Verified Host
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="sm:text-right">
              <div className="flex items-baseline sm:justify-end gap-1">
                <span className="text-3xl font-bold font-numeric-tabular text-ink dark:text-white">
                  ${costPerPerson.toFixed(2)}
                </span>
                <span className="text-xs text-slate dark:text-dark-muted">/month</span>
              </div>
              <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-gt-savings-bg text-gt-savings-text text-xs font-bold font-mono">
                Save {savingsPercent}% vs Retail (${listing.totalCost.toFixed(2)})
              </span>
            </div>
          </div>

          {/* Group Spots Visualizer */}
          <div className="space-y-3">
            <div className="flex justify-between items-baseline text-xs">
              <span className="font-semibold text-slate dark:text-dark-muted">Seat Allocation</span>
              <span className="font-mono font-bold text-ink dark:text-white">
                {listing.slotsFilled} of {listing.slotsTotal} spots active ({slotsAvailable} available)
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {Array.from({ length: listing.slotsTotal }).map((_, idx) => {
                const isFilled = idx < listing.slotsFilled;
                return (
                  <div
                    key={idx}
                    className={`h-14 rounded-2xl flex flex-col items-center justify-center text-xs font-semibold border ${
                      isFilled
                        ? 'bg-[#115c3e] border-[#115c3e] text-white shadow-xs'
                        : 'bg-surface/50 dark:bg-dark-bg border-dashed border-border dark:border-[#2e3931] text-dust'
                    }`}
                  >
                    <span>{isFilled ? `Seat #${idx + 1}` : 'Open Spot'}</span>
                    <span className="text-[10px] font-mono opacity-80">
                      {isFilled ? 'Claimed' : 'Available'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Overview & Rules */}
          <div className="space-y-4">
            <h3 className="text-sm font-mono uppercase tracking-wider text-slate dark:text-dark-muted font-bold">
              Subscription Pool Overview
            </h3>
            <p className="text-sm text-slate dark:text-[#d1dad3] leading-relaxed">
              {listing.description || 'This subscription pool is hosted under GrossThrift escrow management. Co-buyers receive isolated personal seat assignments or direct family invite links.'}
            </p>
            {listing.rules && (
              <div className="p-4 rounded-2xl bg-surface/60 dark:bg-dark-bg border border-border/60 dark:border-[#2e3931] text-xs text-slate dark:text-dark-muted space-y-1">
                <span className="font-bold text-ink dark:text-white">Host Rules:</span>
                <p>{listing.rules}</p>
              </div>
            )}
          </div>

          {/* Guarantee banner */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-[#115c3e] dark:text-[#2ecc71] flex items-center gap-3 text-xs font-medium">
            <ShieldCheck size={20} className="shrink-0" />
            <span>
              100% Escrow Protected: If access credentials fail or a host does not provide prompt invitation, you receive an automatic full refund.
            </span>
          </div>

          {/* Action Join Button */}
          <div className="pt-2">
            {isFull ? (
              <button
                disabled
                className="w-full h-12 bg-neutral-200 dark:bg-neutral-800 text-dust font-bold rounded-2xl cursor-not-allowed text-sm"
              >
                All Seats Claimed in this Pool
              </button>
            ) : (
              <AppButton
                fullWidth
                variant="primary"
                size="lg"
                onPress={() => {
                  setSelectedListing(listing);
                  setIsDetailModalOpen(true);
                }}
                endContent={<ArrowRight size={16} />}
              >
                {user ? `Join this Split ($${costPerPerson.toFixed(2)}/mo)` : 'Sign in to Join this Split'}
              </AppButton>
            )}
          </div>
        </div>
      </main>

      {/* Modals */}
      {isDetailModalOpen && selectedListing && (
        <ListingDetailModal
          listing={selectedListing}
          isOpen={isDetailModalOpen}
          user={user}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedListing(null);
          }}
          onOpenAuth={() => {
            setIsDetailModalOpen(false);
            setIsAuthModalOpen(true);
          }}
          onConfirmJoin={handleConfirmJoin}
        />
      )}

      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onLoginSuccess={(u) => {
            setUser(u);
            setIsAuthModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
