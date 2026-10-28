'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Lock,
  Unlock,
  CreditCard,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { Listing, User } from '@/types/listing';
import PlanIcon from './PlanIcon';

interface ListingDetailModalProps {
  listing: Listing | null;
  isOpen: boolean;
  user: User | null;
  onClose: () => void;
  onOpenAuth: () => void;
  onConfirmJoin: (listingId: string, userName: string, userEmail: string, userPhone: string) => Promise<void> | void;
}

export const getPoolCredentials = (
  listingOrId: Listing | string,
  profileName: string = 'Member'
) => {
  if (typeof listingOrId === 'object' && listingOrId !== null) {
    const slug = listingOrId.planName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.|\.$/g, '');
    const shortId = listingOrId.id.slice(0, 4).toUpperCase();
    return {
      email:
        listingOrId.contactMethod === 'Email' && listingOrId.contactValue.includes('@')
          ? listingOrId.contactValue
          : `${slug || 'pool'}@${listingOrId.hostName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'host'}.grossthrift.co`,
      pass: `GT_${shortId}_${listingOrId.slotsTotal}Seats`,
      profile: `Assigned Seat / ${profileName}`,
      instructions:
        listingOrId.rules ||
        `Reach out to host ${listingOrId.hostName} via ${listingOrId.contactMethod} (${listingOrId.contactValue}) or use the pool credentials above to activate your ${listingOrId.planName} seat.`,
    };
  }

  const shortId = String(listingOrId).slice(0, 4).toUpperCase();
  return {
    email: `seat.${shortId.toLowerCase()}@grossthrift.co`,
    pass: `GT_${shortId}_Access`,
    profile: `Assigned Seat / ${profileName}`,
    instructions:
      'Use your assigned seat credentials and follow the host guidelines in your dashboard.',
  };
};

export default function ListingDetailModal({
  listing,
  isOpen,
  user,
  onClose,
  onOpenAuth,
  onConfirmJoin,
}: ListingDetailModalProps) {
  const [joinStep, setJoinStep] = useState<'details' | 'checkout' | 'processing' | 'success'>('details');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setJoinStep('details');
      setError('');
      setCardNumber('');
      setCardExpiry('');
      setCardCvv('');
      setCardName(user ? user.name : '');
    }
  }, [isOpen, user]);

  if (!isOpen || !listing) return null;

  const costPerPerson = (listing.totalCost / listing.slotsTotal).toFixed(2);
  const slotsLeft = listing.slotsTotal - listing.slotsFilled;
  const isFull = slotsLeft <= 0;
  const isHost = Boolean(user && listing.hostId === user.id);

  const handleJoinClick = () => {
    if (!user) {
      onOpenAuth();
      return;
    }
    if (isHost) {
      setError('You are the host of this split listing.');
      return;
    }
    setError('');
    setJoinStep('checkout');
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return `${v.slice(0, 2)}/${v.slice(2, 4)}`;
    }
    return v;
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber || cardNumber.replace(/\s/g, '').length < 16) {
      setError('Please enter a valid 16-digit card number.');
      return;
    }
    if (!cardExpiry || cardExpiry.length < 5) {
      setError('Please enter a valid expiry date (MM/YY).');
      return;
    }
    if (!cardCvv || cardCvv.length < 3) {
      setError('Please enter a valid 3-digit CVV.');
      return;
    }
    if (!cardName.trim()) {
      setError('Please enter the cardholder name.');
      return;
    }

    setError('');
    setJoinStep('processing');

    try {
      await onConfirmJoin(
        listing.id,
        user?.name || cardName.trim(),
        user?.email || '',
        user?.phone || user?.email || ''
      );
      setJoinStep('success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to join this split.';
      setError(msg);
      setJoinStep('checkout');
    }
  };

  const assignedCredentials = getPoolCredentials(listing, user?.name || 'Member');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-ink/60 backdrop-blur-md"
        id="detail-backdrop"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ type: 'spring', duration: 0.4 }}
        className="relative z-10 w-full max-w-md overflow-hidden bg-white rounded-[24px] shadow-gt-modal border border-border flex flex-col max-h-[90vh]"
        id="detail-modal-container"
      >
        {/* Header bar */}
        <div className="bg-[#141c17] text-white p-6 relative shrink-0 text-left">
          {joinStep !== 'processing' && (
            <button
              onClick={onClose}
              className="absolute top-5 right-5 rounded-full p-2 hover:bg-white/10 text-dust hover:text-white transition-all cursor-pointer"
              id="close-detail-modal"
            >
              <X size={15} />
            </button>
          )}

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 border border-white/10 rounded-xl select-none shrink-0 text-white flex items-center justify-center">
              <PlanIcon name={listing.planName} size={20} />
            </div>
            <div className="text-left">
              <span className="px-2.5 py-0.5 bg-white/10 text-white text-[9px] font-mono tracking-wider uppercase rounded-full">
                {listing.category}
              </span>
              <h2 className="font-display font-semibold text-base leading-snug mt-1 truncate max-w-[200px] uppercase tracking-tight text-white">
                {listing.planName}
              </h2>
            </div>
          </div>
        </div>

        {/* Content Box */}
        <div className="overflow-y-auto p-6 sm:p-8 space-y-6" id="detail-modal-scroll">
          <AnimatePresence mode="wait">
            {/* Step 1: Default Detail View */}
            {joinStep === 'details' && (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6 text-left"
              >
                {error && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Cost Breakdown */}
                <div className="grid grid-cols-2 bg-surface rounded-2xl p-5 border border-border">
                  <div className="text-left">
                    <span className="text-[10px] text-dust uppercase font-mono font-semibold tracking-wider block">
                      Your Split Portion
                    </span>
                    <span className="font-display font-semibold text-2xl text-gt-green block mt-1">
                      ${costPerPerson}
                      <span className="text-xs font-mono font-bold text-slate">/mo</span>
                    </span>
                  </div>

                  <div className="text-right flex flex-col justify-center">
                    <span className="text-[10px] text-dust uppercase font-mono font-semibold tracking-wider block">
                      Full Retail Cost
                    </span>
                    <span className="font-display font-semibold text-dust line-through text-sm mt-1">
                      ${listing.totalCost.toFixed(2)}/mo
                    </span>
                  </div>
                </div>

                {/* Subheading info */}
                <div className="space-y-2">
                  <h3 className="font-display font-semibold text-gt-green text-xs uppercase tracking-wider">
                    About This Split Pool
                  </h3>
                  <p className="text-xs text-slate leading-relaxed font-sans">
                    {listing.description}
                  </p>
                </div>

                {/* Details list */}
                <div className="bg-surface rounded-2xl p-4.5 space-y-3 border border-border text-xs font-medium text-slate">
                  <div className="flex justify-between items-center border-b border-border/50 pb-2.5">
                    <span>Pool Host</span>
                    <span className="font-semibold text-gt-green flex items-center gap-1.5 uppercase font-mono text-[10px]">
                      {listing.hostName}
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 rounded-full">
                        ✓ Verified
                      </span>
                    </span>
                  </div>

                  <div className="flex justify-between items-center border-b border-border/50 pb-2.5">
                    <span>Open Seats</span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                      {slotsLeft} of {listing.slotsTotal} available
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span>Host Contact Channel</span>
                    <span className="font-semibold text-gt-green">{listing.contactMethod}</span>
                  </div>
                </div>

                {/* CTA Action */}
                <div className="pt-2">
                  <button
                    onClick={handleJoinClick}
                    disabled={isFull || isHost}
                    className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 bg-charcoal text-white dark:text-[#141c17] font-semibold rounded-xl text-xs uppercase tracking-wider cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-xs"
                    id="join-action-btn"
                  >
                    <span>
                      {isHost
                        ? 'You Host This Split'
                        : isFull
                          ? 'Split Is Full'
                          : 'Proceed to Secure Checkout'}
                    </span>
                    {!isHost && !isFull && <ArrowRight size={13} />}
                  </button>
                  <p className="text-[10px] text-center text-dust mt-2.5 font-sans">
                    No lock-in contracts. Secure monthly billing powered by Stripe. Cancel anytime.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Step 2: Stripe Checkout Credit Card Form */}
            {joinStep === 'checkout' && (
              <motion.form
                key="checkout"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onSubmit={handleCheckoutSubmit}
                className="space-y-5 text-left"
              >
                <div className="pb-2 border-b border-dashed border-border">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-gt-green flex items-center gap-1.5">
                      <CreditCard size={15} />
                      Stripe Checkout
                    </h3>
                    <span className="text-[11px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                      ${costPerPerson}/mo
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate mt-1 leading-relaxed">
                    Recurring monthly subscription. Powering secure pool assignment.
                  </p>
                </div>

                {error && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label
                      htmlFor="card-number"
                      className="text-[9px] font-mono font-bold text-dust uppercase tracking-wider block"
                    >
                      Card Number
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="card-number"
                        maxLength={19}
                        value={cardNumber}
                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                        placeholder="4242 4242 4242 4242"
                        className="w-full bg-surface border border-border rounded-xl pl-4 pr-10 py-3 outline-none focus:bg-white focus:ring-1 focus:ring-gt-green/20 focus:border-gt-green transition-all text-xs font-mono font-bold text-ink shadow-xs"
                        required
                      />
                      <Lock size={12} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-dust" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label
                        htmlFor="card-expiry"
                        className="text-[9px] font-mono font-bold text-dust uppercase tracking-wider block"
                      >
                        Expires (MM/YY)
                      </label>
                      <input
                        type="text"
                        id="card-expiry"
                        maxLength={5}
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                        placeholder="12/28"
                        className="w-full bg-surface border border-border rounded-xl px-4 py-3 outline-none focus:bg-white focus:ring-1 focus:ring-gt-green/20 focus:border-gt-green transition-all text-xs font-mono font-bold text-ink shadow-xs"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label
                        htmlFor="card-cvv"
                        className="text-[9px] font-mono font-bold text-dust uppercase tracking-wider block"
                      >
                        CVV / CVC
                      </label>
                      <input
                        type="password"
                        id="card-cvv"
                        maxLength={3}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="***"
                        className="w-full bg-surface border border-border rounded-xl px-4 py-3 outline-none focus:bg-white focus:ring-1 focus:ring-gt-green/20 focus:border-gt-green transition-all text-xs font-mono font-bold text-ink shadow-xs"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="card-name"
                      className="text-[9px] font-mono font-bold text-dust uppercase tracking-wider block"
                    >
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      id="card-name"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="e.g. Sarah Connor"
                      className="w-full bg-surface border border-border rounded-xl px-4 py-3 outline-none focus:bg-white focus:ring-1 focus:ring-gt-green/20 focus:border-gt-green transition-all text-xs font-bold text-ink shadow-xs"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-slate bg-surface p-3 rounded-xl border border-border">
                  <ShieldCheck size={14} className="text-slate shrink-0" />
                  <span>Stripe Secure TLS 256-bit encryption. Payment coordinates never touch our servers.</span>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setJoinStep('details')}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-3 border border-border hover:bg-surface text-slate font-semibold rounded-xl text-xs transition-all cursor-pointer"
                  >
                    <ArrowLeft size={13} />
                    <span>Back</span>
                  </button>
                  <button
                    type="submit"
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-3 bg-charcoal text-white dark:text-[#141c17] font-semibold rounded-xl text-xs shadow-xs cursor-pointer"
                    id="submit-contact-info-btn"
                  >
                    <span>Start Pool Plan</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </motion.form>
            )}

            {/* Step 3: Spinning/Processing payment loader */}
            {joinStep === 'processing' && (
              <motion.div
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 space-y-6"
              >
                <div className="relative w-16 h-16 mx-auto">
                  <div className="absolute inset-0 rounded-full border-4 border-surface" />
                  <div className="absolute inset-0 rounded-full border-4 border-t-charcoal animate-spin" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="font-display font-semibold text-sm uppercase tracking-wider text-ink">
                    Reserving Your Split Seat
                  </h4>
                  <p className="text-xs text-dust max-w-xs mx-auto">
                    Confirming seat availability &amp; registering your membership...
                  </p>
                </div>
              </motion.div>
            )}

            {/* Step 4: Success - Pool assigned, show credentials */}
            {joinStep === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-5 text-center py-2"
              >
                <div className="h-12 w-12 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <Sparkles size={20} className="text-emerald-700 animate-pulse" />
                </div>

                <div className="space-y-1">
                  <h3 className="font-display font-semibold text-lg uppercase tracking-tight text-gt-green">
                    Pool Seat Active!
                  </h3>
                  <p className="text-xs text-slate max-w-sm mx-auto">
                    You have joined {listing.hostName}&apos;s {listing.planName} split.
                  </p>
                </div>

                {/* Account Credentials box */}
                <div className="bg-surface rounded-2xl p-5 text-left border border-border space-y-4 shadow-xs">
                  <div className="flex items-center justify-between border-b border-dashed border-border pb-2.5">
                    <span className="font-display font-semibold text-[10px] text-gt-green uppercase tracking-wider flex items-center gap-1.5">
                      <Unlock size={12} className="text-emerald-700 dark:text-emerald-400" />
                      Pool Access &amp; Host Contact
                    </span>
                    <span className="text-[8.5px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.2 rounded-full uppercase">
                      Active Seat
                    </span>
                  </div>

                  <div className="space-y-3 font-sans text-xs">
                    <div>
                      <span className="text-[8.5px] uppercase font-mono font-bold text-dust">
                        Host {listing.contactMethod} Contact
                      </span>
                      <div className="bg-white border border-border rounded-lg p-2.5 font-mono font-bold text-[10.5px] text-ink select-all shadow-xs mt-0.5">
                        {listing.contactValue}
                      </div>
                    </div>

                    <div>
                      <span className="text-[8.5px] uppercase font-mono font-bold text-dust">
                        Pool Access Reference
                      </span>
                      <div className="bg-white border border-border rounded-lg p-2.5 font-mono font-bold text-[10.5px] text-ink select-all shadow-xs mt-0.5">
                        {assignedCredentials.pass}
                      </div>
                    </div>

                    {assignedCredentials.profile && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-[8.5px] uppercase font-mono font-bold text-dust">
                            Assigned Profile
                          </span>
                          <div className="bg-white border border-border rounded-lg p-2.5 font-bold text-[10.5px] text-ink shadow-xs mt-0.5 uppercase tracking-tight">
                            {assignedCredentials.profile}
                          </div>
                        </div>
                        <div>
                          <span className="text-[8.5px] uppercase font-mono font-bold text-dust">
                            Next Renewal
                          </span>
                          <div className="bg-white border border-border rounded-lg p-2.5 font-mono font-bold text-[10.5px] text-emerald-700 dark:text-emerald-400 shadow-xs mt-0.5 uppercase tracking-tight">
                            {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(
                              'en-US',
                              { month: 'short', day: 'numeric', year: 'numeric' }
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="border-t border-border pt-3">
                      <span className="text-[8.5px] uppercase font-mono font-bold text-dust block mb-1">
                        Access Instructions
                      </span>
                      <p className="text-[11px] text-slate leading-relaxed font-medium">
                        {assignedCredentials.instructions}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={onClose}
                    className="w-full py-3.5 bg-charcoal text-white dark:text-[#141c17] font-semibold rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow-xs"
                    id="success-close-btn"
                  >
                    Done
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
