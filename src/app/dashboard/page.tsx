'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Key,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  Check,
  X,
  User,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { AppButton, CustomText } from '@/components/ui';
import Navbar from '@/components/Navbar';
import NotificationBar from '@/components/NotificationBar';
import ListingDetailModal, { getPoolCredentials } from '@/components/ListingDetailModal';
import AuthModal from '@/components/AuthModal';
import PlanIcon from '@/components/PlanIcon';

type TabType = 'joined' | 'hosted' | 'requests';

export default function MyDashboard() {
  const router = useRouter();
  const {
    user,
    setUser,
    listings,
    joinedListingIds,
    joinRequests,
    handleUpdateJoinStatus,
    handleDeleteJoinRequest,
    selectedListing,
    setSelectedListing,
    isDetailModalOpen,
    setIsDetailModalOpen,
    isAuthModalOpen,
    setIsAuthModalOpen,
    handleConfirmJoin,
  } = useApp();

  const [activeTab, setActiveTab] = useState<TabType>('joined');
  const [, setCopiedField] = useState<string | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [expandedCredentials, setExpandedCredentials] = useState<Record<string, boolean>>({});
  const [expandedSlots, setExpandedSlots] = useState<Record<string, boolean>>({});

  // 1. Hosted splits (created by this user)
  const hostedListings = useMemo(() => {
    if (!user) return [];
    return listings.filter((l) => l.hostId === user.id);
  }, [listings, user]);

  // 2. Joined splits (joined by this user, excluding ones they host)
  const joinedListings = useMemo(() => {
    return listings.filter(
      (l) => joinedListingIds.includes(l.id) && (!user || l.hostId !== user.id)
    );
  }, [listings, joinedListingIds, user]);

  // 3. Pending & Approved requests related to splits hosted by this user
  const relevantRequests = useMemo(() => {
    const hostedIds = hostedListings.map((l) => l.id);
    return joinRequests.filter((r) => hostedIds.includes(r.listingId));
  }, [joinRequests, hostedListings]);

  // Pending requests for badge count
  const pendingRequestsCount = useMemo(() => {
    return relevantRequests.filter((r) => r.status === 'pending').length;
  }, [relevantRequests]);

  // Calculations for Metrics Banner
  const totalSpend = useMemo(() => {
    return joinedListings.reduce((sum, listing) => {
      return sum + listing.totalCost / listing.slotsTotal;
    }, 0);
  }, [joinedListings]);

  const totalSaved = useMemo(() => {
    return joinedListings.reduce((sum, listing) => {
      const splitPrice = listing.totalCost / listing.slotsTotal;
      const singlePrice = listing.totalCost;
      return sum + (singlePrice - splitPrice);
    }, 0);
  }, [joinedListings]);

  const activeSplitsCount = joinedListings.length + hostedListings.length;

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const togglePasswordReveal = (listingId: string) => {
    setRevealedPasswords((prev) => ({ ...prev, [listingId]: !prev[listingId] }));
  };

  const toggleCredentialsExpand = (listingId: string) => {
    setExpandedCredentials((prev) => ({ ...prev, [listingId]: !prev[listingId] }));
  };

  const toggleSlotsExpand = (listingId: string) => {
    setExpandedSlots((prev) => ({ ...prev, [listingId]: !prev[listingId] }));
  };

  // Auth Guard if not logged in
  if (!user) {
    return (
      <div className="bg-off-white min-h-screen">
        <Navbar />
        <NotificationBar />
        <div className="max-w-[680px] mx-auto px-6 py-[120px] text-center">
          <div className="bg-white border border-border p-8 rounded-[20px] shadow-gt-card space-y-6">
            <div className="w-12 h-12 bg-surface rounded-xl flex items-center justify-center mx-auto text-ink">
              🔒
            </div>
            <div className="space-y-2">
              <CustomText type="title-lg" as="h2" className="font-sans font-semibold text-ink">
                Sign in required
              </CustomText>
              <CustomText type="body-md" className="text-slate leading-relaxed">
                Please sign in to view your dashboard, active splits, and pool credentials.
              </CustomText>
            </div>
            <AppButton
              variant="primary"
              size="lg"
              fullWidth
              onPress={() => setIsAuthModalOpen(true)}
            >
              Sign in to continue
            </AppButton>
          </div>
        </div>
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onLoginSuccess={(u) => {
            setUser(u);
            setIsAuthModalOpen(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="bg-off-white min-h-screen pt-[80px]" id="dashboard-layout">
      <Navbar />
      <NotificationBar />

      <div className="max-w-[1120px] mx-auto px-6 py-12 space-y-10 text-left">
        {/* --- METRICS BANNER --- */}
        <section
          className="bg-white border border-border rounded-[24px] p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
          id="dashboard-metrics-banner"
        >
          {/* User profile left */}
          <div className="flex items-center gap-4">
            <img
              src={user.avatar}
              alt={user.name}
              className="w-16 h-16 rounded-xl object-cover border border-border"
              referrerPolicy="no-referrer"
            />
            <div className="space-y-1">
              <h1 className="font-sans font-semibold text-[20px] text-ink leading-tight flex items-center gap-2">
                <span>{user.name}</span>
                <span className="bg-[#f0fdf4] text-gt-green border border-[#bbf7d0] text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck size={11} className="text-emerald-600 shrink-0" />
                  <span>Verified Host</span>
                </span>
              </h1>
              <p className="text-[14px] text-slate font-normal leading-none mb-1.5">{user.email}</p>

              {user.country && (
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-surface text-ink border border-border/60 px-2 py-0.5 rounded-md select-none">
                    <span className="text-xs leading-none">{user.countryFlag}</span>
                    <span>{user.country}</span>
                  </span>
                  {user.isVetted && (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                      <Check size={10} className="text-emerald-600 stroke-[3]" />
                      <span>
                        Vetted via{' '}
                        {user.verificationMethod === 'linkedin'
                          ? 'LinkedIn'
                          : user.verificationMethod === 'email'
                            ? 'Work Domain'
                            : 'Self-Pledge'}
                      </span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Stats columns right */}
          <div className="flex items-center gap-8 w-full md:w-auto border-t md:border-t-0 border-border pt-6 md:pt-0">
            {/* Stat 1 */}
            <div className="space-y-1 flex-1 md:flex-none">
              <span className="block font-sans font-semibold text-[24px] text-ink font-numeric-tabular leading-none">
                ${totalSpend.toFixed(2)}
              </span>
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-dust block">
                $ Spend / mo
              </span>
            </div>

            <div className="h-10 w-[1px] bg-border hidden sm:block" />

            {/* Stat 2 */}
            <div className="space-y-1 flex-1 md:flex-none">
              <span className="block font-sans font-semibold text-[24px] text-gt-green font-numeric-tabular leading-none">
                ${totalSaved.toFixed(2)}
              </span>
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-dust block">
                $ Saved / mo
              </span>
            </div>

            <div className="h-10 w-[1px] bg-border hidden sm:block" />

            {/* Stat 3 */}
            <div className="space-y-1 flex-1 md:flex-none">
              <span className="block font-sans font-semibold text-[24px] text-ink leading-none">
                {activeSplitsCount}
              </span>
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-dust block">
                Active Splits
              </span>
            </div>
          </div>
        </section>

        {/* --- TABBED VIEW SYSTEM --- */}
        <section className="space-y-6" id="dashboard-tabs-section">
          {/* Sub Navigation Bar */}
          <div className="flex items-center border-b border-border" id="dashboard-tabs">
            {/* Tab 1 */}
            <button
              onClick={() => setActiveTab('joined')}
              className={`py-3.5 px-6 text-[14px] font-medium transition-all duration-150 cursor-pointer relative ${
                activeTab === 'joined' ? 'text-ink font-semibold' : 'text-slate hover:text-ink'
              }`}
            >
              <span>Joined splits</span>
              <span className="ml-1.5 px-2 py-0.5 bg-surface text-slate text-[11px] rounded-full font-bold">
                {joinedListings.length}
              </span>
              {activeTab === 'joined' && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-ink" />
              )}
            </button>

            {/* Tab 2 */}
            <button
              onClick={() => setActiveTab('hosted')}
              className={`py-3.5 px-6 text-[14px] font-medium transition-all duration-150 cursor-pointer relative ${
                activeTab === 'hosted' ? 'text-ink font-semibold' : 'text-slate hover:text-ink'
              }`}
            >
              <span>Listed splits</span>
              <span className="ml-1.5 px-2 py-0.5 bg-surface text-slate text-[11px] rounded-full font-bold">
                {hostedListings.length}
              </span>
              {activeTab === 'hosted' && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-ink" />
              )}
            </button>

            {/* Tab 3 */}
            <button
              onClick={() => setActiveTab('requests')}
              className={`py-3.5 px-6 text-[14px] font-medium transition-all duration-150 cursor-pointer relative ${
                activeTab === 'requests' ? 'text-ink font-semibold' : 'text-slate hover:text-ink'
              }`}
            >
              <span>Join requests</span>
              {pendingRequestsCount > 0 ? (
                <span className="ml-1.5 px-2 py-0.5 bg-gt-red text-white text-[11px] rounded-full font-bold animate-pulse">
                  {pendingRequestsCount}
                </span>
              ) : (
                <span className="ml-1.5 px-2 py-0.5 bg-surface text-slate text-[11px] rounded-full font-bold">
                  {relevantRequests.length}
                </span>
              )}
              {activeTab === 'requests' && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-ink" />
              )}
            </button>
          </div>

          {/* TAB CONTENTS */}
          <div className="pt-2">
            <AnimatePresence mode="wait">
              {/* TAB 1: JOINED SPLITS */}
              {activeTab === 'joined' && (
                <motion.div
                  key="joined-splits-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                  {joinedListings.length > 0 ? (
                    joinedListings.map((listing) => {
                      const costPerPerson = listing.totalCost / listing.slotsTotal;
                      const credentials = getPoolCredentials(listing, user.name);
                      const isCredsExpanded = !!expandedCredentials[listing.id];
                      const isRevealed = !!revealedPasswords[listing.id];

                      return (
                        <div
                          key={listing.id}
                          className="bg-white border border-border rounded-[20px] p-6 shadow-sm flex flex-col justify-between space-y-6"
                        >
                          <div className="space-y-4">
                            {/* Card Header info */}
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-surface border border-border rounded-[10px] flex items-center justify-center">
                                  <PlanIcon name={listing.planName} size={24} />
                                </div>
                                <div className="text-left">
                                  <h3 className="font-sans font-semibold text-[16px] text-ink leading-tight">
                                    {listing.planName}
                                  </h3>
                                  <span className="text-[12px] text-slate font-medium">{listing.category}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-[18px] font-semibold text-ink block font-numeric-tabular leading-none">
                                  ${costPerPerson.toFixed(2)}
                                </span>
                                <span className="text-[11px] text-dust uppercase font-bold tracking-wider">
                                  per person / mo
                                </span>
                              </div>
                            </div>

                            {/* HOST DETAILS ROW */}
                            <div className="flex items-center gap-2 pt-1.5">
                              <img
                                src={
                                  listing.hostAvatar ||
                                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
                                }
                                alt={listing.hostName}
                                className="w-6 h-6 rounded-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                              <div className="flex items-center gap-1 text-[13px] text-slate">
                                <span className="font-medium text-ink">{listing.hostName}</span>
                                <span className="text-dust">·</span>
                                <span className="text-[12px]">Hosted Split</span>
                              </div>
                            </div>

                            {/* REVEAL CREDENTIALS DRAW PANEL */}
                            <div className="border border-border rounded-xl bg-surface overflow-hidden">
                              <button
                                onClick={() => toggleCredentialsExpand(listing.id)}
                                className="w-full px-4 py-3 flex justify-between items-center text-[13px] font-semibold text-slate hover:text-ink bg-white border-b border-border cursor-pointer"
                              >
                                <span className="flex items-center gap-1.5">
                                  <Key size={14} className="text-slate" />
                                  <span>Pool Login Credentials</span>
                                </span>
                                <span className="text-[11px] font-bold text-dust uppercase tracking-wider">
                                  {isCredsExpanded ? 'Hide' : 'Reveal'}
                                </span>
                              </button>

                              <AnimatePresence>
                                {isCredsExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="p-4 space-y-3.5 text-left"
                                  >
                                    {/* Username field */}
                                    <div className="space-y-1">
                                      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-dust block">
                                        Email / Username
                                      </span>
                                      <div className="flex items-center justify-between bg-white border border-border rounded-lg px-3 py-1.5 text-[13px]">
                                        <span className="font-mono text-ink font-medium select-all truncate mr-2">
                                          {credentials.email}
                                        </span>
                                        <button
                                          onClick={() => handleCopyText(credentials.email, 'Email')}
                                          className="text-dust hover:text-ink cursor-pointer shrink-0"
                                        >
                                          <Copy size={13} />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Password field */}
                                    <div className="space-y-1">
                                      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-dust block">
                                        Password
                                      </span>
                                      <div className="flex items-center justify-between bg-white border border-border rounded-lg px-3 py-1.5 text-[13px]">
                                        <span className="font-mono text-ink font-medium select-all truncate mr-2">
                                          {isRevealed ? credentials.pass : '••••••••••••'}
                                        </span>
                                        <div className="flex items-center gap-2 shrink-0">
                                          <button
                                            onClick={() => togglePasswordReveal(listing.id)}
                                            className="text-dust hover:text-ink cursor-pointer"
                                          >
                                            {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                                          </button>
                                          <button
                                            onClick={() => handleCopyText(credentials.pass, 'Password')}
                                            className="text-dust hover:text-ink cursor-pointer"
                                          >
                                            <Copy size={13} />
                                          </button>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Profile seat assignment */}
                                    {credentials.profile && (
                                      <div className="bg-white border border-border rounded-lg px-3 py-2 text-[12px] text-slate font-medium flex justify-between items-center">
                                        <span>Assigned Profile Seat:</span>
                                        <span className="font-bold text-ink uppercase tracking-tight">
                                          {credentials.profile}
                                        </span>
                                      </div>
                                    )}

                                    {/* Setup Instructions */}
                                    <div className="p-3 bg-white border border-border rounded-lg text-[12px] text-slate leading-relaxed">
                                      <span className="font-bold text-ink block mb-0.5">Instructions:</span>
                                      {credentials.instructions}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>

                          {/* Leave split Button bottom */}
                          <div className="pt-4 border-t border-border flex justify-end">
                            <button
                              onClick={() => {
                                if (
                                  confirm(
                                    `Are you sure you want to leave ${listing.planName}? You will lose access to the credentials instantly.`
                                  )
                                ) {
                                  const req = joinRequests.find((r) => r.listingId === listing.id);
                                  if (req) {
                                    handleDeleteJoinRequest(req.id);
                                  } else {
                                    handleDeleteJoinRequest(listing.id);
                                  }
                                }
                              }}
                              className="text-[13px] font-medium text-slate hover:text-gt-red cursor-pointer flex items-center gap-1.5 transition-colors"
                            >
                              <Trash2 size={13} />
                              <span>Leave split</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    /* Empty joined state */
                    <div className="col-span-full text-center py-16 bg-white border border-border rounded-[24px] space-y-4 max-w-md mx-auto mt-6">
                      <span className="text-[32px] block select-none">🔌</span>
                      <h3 className="font-sans font-semibold text-[17px] text-ink">No joined splits</h3>
                      <p className="text-[14px] text-slate max-w-xs mx-auto leading-relaxed">
                        You aren&apos;t a member of any subscription splits yet. Browse available splits to start co-buying.
                      </p>
                      <button
                        onClick={() => router.push('/browse')}
                        className="px-5 py-2.5 bg-charcoal text-white dark:text-[#141c17] font-semibold rounded-xl text-[13px] cursor-pointer"
                      >
                        Browse splits
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB 2: LISTED SPLITS (HOSTED) */}
              {activeTab === 'hosted' && (
                <motion.div
                  key="hosted-splits-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                  {hostedListings.length > 0 ? (
                    hostedListings.map((listing) => {
                      const costPerPerson = listing.totalCost / listing.slotsTotal;
                      const isSlotsExpanded = !!expandedSlots[listing.id];

                      const approvedJoiners = relevantRequests.filter(
                        (r) => r.listingId === listing.id && r.status === 'approved'
                      );

                      return (
                        <div
                          key={listing.id}
                          className="bg-white border border-border rounded-[20px] p-6 shadow-sm flex flex-col justify-between space-y-6"
                        >
                          <div className="space-y-4">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-surface border border-border rounded-[10px] flex items-center justify-center">
                                  <PlanIcon name={listing.planName} size={24} />
                                </div>
                                <div className="text-left">
                                  <h3 className="font-sans font-semibold text-[16px] text-ink leading-tight">
                                    {listing.planName}
                                  </h3>
                                  <span className="text-[12px] text-slate font-medium">{listing.category}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-[18px] font-semibold text-ink block font-numeric-tabular leading-none">
                                  ${costPerPerson.toFixed(2)}
                                </span>
                                <span className="text-[11px] text-dust uppercase font-bold tracking-wider">
                                  per person / mo
                                </span>
                              </div>
                            </div>

                            {/* Slot indicators */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[11px] text-dust font-bold uppercase tracking-wider">
                                <span>Slots filled</span>
                                <span className="text-slate font-numeric-tabular">
                                  {listing.slotsFilled} of {listing.slotsTotal}
                                </span>
                              </div>
                              <div className="w-full h-1 bg-surface rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-ink"
                                  style={{ width: `${(listing.slotsFilled / listing.slotsTotal) * 100}%` }}
                                />
                              </div>
                            </div>

                            {/* MANAGE SLOTS EXPAND DRAW */}
                            <div className="border border-border rounded-xl bg-surface overflow-hidden">
                              <button
                                onClick={() => toggleSlotsExpand(listing.id)}
                                className="w-full px-4 py-3 flex justify-between items-center text-[13px] font-semibold text-slate hover:text-ink bg-white border-b border-border cursor-pointer"
                              >
                                <span className="flex items-center gap-1.5">
                                  <User size={14} className="text-slate" />
                                  <span>Manage split slots</span>
                                </span>
                                <span className="text-[11px] font-bold text-dust uppercase tracking-wider">
                                  {isSlotsExpanded ? 'Hide' : 'Manage'}
                                </span>
                              </button>

                              <AnimatePresence>
                                {isSlotsExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="p-4 space-y-2 text-left"
                                  >
                                    {/* You (Host) Seat */}
                                    <div className="flex justify-between items-center bg-white border border-border rounded-lg p-2.5 text-[13px]">
                                      <div className="flex items-center gap-2">
                                        <img
                                          src={user.avatar}
                                          alt={user.name}
                                          className="w-5 h-5 rounded-full object-cover"
                                          referrerPolicy="no-referrer"
                                        />
                                        <span className="font-semibold text-ink">{user.name.split(' ')[0]} (Host)</span>
                                      </div>
                                      <span className="text-[10px] bg-surface text-slate font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                                        Seat 1
                                      </span>
                                    </div>

                                    {/* Approved Joiners */}
                                    {approvedJoiners.map((joiner, index) => (
                                      <div
                                        key={joiner.id}
                                        className="flex justify-between items-center bg-white border border-border rounded-lg p-2.5 text-[13px]"
                                      >
                                        <div className="space-y-0.5">
                                          <div className="font-semibold text-ink">{joiner.userName}</div>
                                          <div className="text-[11px] text-slate font-mono leading-none flex items-center gap-1.5 mt-0.5">
                                            {joiner.userContact.includes('@') ? (
                                              <span className="flex items-center gap-1 text-red-600 font-sans font-medium text-[10px] bg-red-50 border border-red-100 px-1.5 py-0.5 rounded-md">
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                                                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="#EA4335" />
                                                </svg>
                                                Email
                                              </span>
                                            ) : (
                                              <span className="flex items-center gap-1 text-emerald-600 font-sans font-medium text-[10px] bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-md">
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413" fill="#25D366" />
                                                </svg>
                                                WhatsApp
                                              </span>
                                            )}
                                            <span>{joiner.userContact}</span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <span className="text-[10px] bg-surface text-slate font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                                            Seat {index + 2}
                                          </span>
                                          <button
                                            onClick={() => {
                                              if (
                                                confirm(
                                                  `Remove ${joiner.userName} from this subscription split? Their slot will become vacant.`
                                                )
                                              ) {
                                                handleDeleteJoinRequest(joiner.id);
                                              }
                                            }}
                                            className="p-1 text-dust hover:text-gt-red cursor-pointer"
                                            title="Remove member"
                                          >
                                            <Trash2 size={13} />
                                          </button>
                                        </div>
                                      </div>
                                    ))}

                                    {/* Empty slots placeholders */}
                                    {Array.from({
                                      length: Math.max(0, listing.slotsTotal - approvedJoiners.length - 1),
                                    }).map((_, idx) => (
                                      <div
                                        key={idx}
                                        className="flex justify-between items-center border border-dashed border-border rounded-lg p-2.5 text-[13px] text-dust"
                                      >
                                        <span className="italic font-normal">Waiting for co-buyer ...</span>
                                        <span className="text-[10px] uppercase font-bold tracking-wider">
                                          Seat {approvedJoiners.length + idx + 2}
                                        </span>
                                      </div>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>

                          {/* Manage split action triggers */}
                          <div className="pt-4 border-t border-border flex justify-end">
                            <button
                              onClick={() => {
                                if (
                                  confirm(
                                    `Delete listing for ${listing.planName}? Your split co-buying group will be closed permanently.`
                                  )
                                ) {
                                  handleDeleteJoinRequest(listing.id);
                                }
                              }}
                              className="text-[13px] font-medium text-slate hover:text-gt-red cursor-pointer flex items-center gap-1.5 transition-colors"
                            >
                              <Trash2 size={13} />
                              <span>Delete listing</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    /* Empty hosted state */
                    <div className="col-span-full text-center py-16 bg-white border border-border rounded-[24px] space-y-4 max-w-md mx-auto mt-6">
                      <span className="text-[32px] block select-none">🎒</span>
                      <h3 className="font-sans font-semibold text-[17px] text-ink">No hosted splits</h3>
                      <p className="text-[14px] text-slate max-w-xs mx-auto leading-relaxed">
                        You aren&apos;t hosting any splits yet. Create a split to setup your co-buying group and start saving.
                      </p>
                      <button
                        onClick={() => router.push('/create')}
                        className="px-5 py-2.5 bg-charcoal text-white dark:text-[#141c17] font-semibold rounded-xl text-[13px] cursor-pointer"
                      >
                        List a split
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB 3: JOIN REQUESTS */}
              {activeTab === 'requests' && (
                <motion.div
                  key="requests-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4 max-w-2xl mx-auto"
                >
                  {relevantRequests.length > 0 ? (
                    relevantRequests.map((req) => {
                      const targetPlan = listings.find((l) => l.id === req.listingId);

                      return (
                        <div
                          key={req.id}
                          className="bg-white border border-border rounded-[16px] p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left"
                        >
                          <div className="space-y-2">
                            {/* Request Details */}
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center font-bold text-ink text-[13px] border border-border">
                                {req.userName.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="space-y-0.5">
                                <h4 className="font-semibold text-ink text-[14px] leading-tight">{req.userName}</h4>
                                <p className="text-[12px] text-slate font-mono leading-none flex items-center gap-1.5 mt-0.5">
                                  {req.userContact.includes('@') ? (
                                    <span className="flex items-center gap-1 text-red-600 font-sans font-medium text-[10px] bg-red-50 border border-red-100 px-1.5 py-0.5 rounded-md">
                                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                                        <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="#EA4335" />
                                      </svg>
                                      Email
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 text-emerald-600 font-sans font-medium text-[10px] bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-md">
                                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413" fill="#25D366" />
                                      </svg>
                                      WhatsApp
                                    </span>
                                  )}
                                  <span>{req.userContact}</span>
                                </p>
                              </div>
                            </div>

                            <div className="text-[13px] text-slate">
                              Requested to join:{' '}
                              <strong className="text-ink font-semibold">
                                {targetPlan ? targetPlan.planName : 'Subscription Split'}
                              </strong>
                            </div>
                          </div>

                          {/* Approval Controls */}
                          <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                            {req.status === 'approved' ? (
                              <div className="text-gt-green bg-gt-green-bg border border-[#bbf7d0] px-4 py-1.5 rounded-xl text-[12px] font-bold flex items-center gap-1 w-full sm:w-auto justify-center select-none">
                                <Check size={14} strokeWidth={2.5} />
                                <span>Approved</span>
                              </div>
                            ) : req.status === 'rejected' ? (
                              <div className="text-gt-red bg-red-50 border border-red-200 px-4 py-1.5 rounded-xl text-[12px] font-bold flex items-center gap-1 w-full sm:w-auto justify-center select-none">
                                <X size={14} strokeWidth={2.5} />
                                <span>Rejected</span>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleUpdateJoinStatus(req.id, 'approved')}
                                  className="flex-1 sm:flex-none px-4 py-2 bg-charcoal text-white dark:text-[#141c17] text-[13px] font-semibold rounded-xl cursor-pointer"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleUpdateJoinStatus(req.id, 'rejected')}
                                  className="flex-1 sm:flex-none px-4 py-2 border border-border hover:bg-surface text-slate hover:text-ink text-[13px] font-medium rounded-xl cursor-pointer"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    /* Empty Requests State */
                    <div className="text-center py-16 bg-white border border-border rounded-[24px] space-y-4 max-w-md mx-auto mt-6">
                      <span className="text-[32px] block select-none">📬</span>
                      <h3 className="font-sans font-semibold text-[17px] text-ink">No join requests</h3>
                      <p className="text-[14px] text-slate max-w-xs mx-auto leading-relaxed">
                        No co-buyers have requested to join your listed pools yet. Share your split link to fill slots faster.
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </div>

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

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(u) => {
          setUser(u);
          setIsAuthModalOpen(false);
        }}
      />
    </div>
  );
}
