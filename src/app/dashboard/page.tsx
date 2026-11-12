'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Key,
  Link2,
  Lock,
  Send,
  ShieldAlert,
  ShieldCheck,
  Star,
  Trash2,
  User,
  Wallet,
  X,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import {
  AppButton,
  CustomField,
  CustomText,
  FormikField,
} from '@/components/ui';
import {
  useConfirmAccessMutation,
  useCreateInviteMutation,
  useDashboardQuery,
  useLeaveSplitMutation,
  useMarkInvitedMutation,
  useOpenDisputeMutation,
  useRequestPayoutMutation,
  useRevokeInviteMutation,
  useSaveBankDetailsMutation,
  useSubmitRatingMutation,
} from '@/hooks/useAuth';
import Navbar from '@/components/Navbar';
import NotificationBar from '@/components/NotificationBar';
import ListingDetailModal, { getPoolCredentials } from '@/components/ListingDetailModal';
import AuthModal from '@/components/AuthModal';
import PlanIcon from '@/components/PlanIcon';

type TabType = 'joined' | 'hosted' | 'requests' | 'wallet';

const bankDetailsSchema = Yup.object({
  bankName: Yup.string().min(2, 'Enter your bank name').required('Bank name is required'),
  accountNumber: Yup.string()
    .matches(/^\d{10}$/, 'Enter a valid 10-digit NUBAN account number')
    .required('10-digit account number is required'),
  accountName: Yup.string().min(2, 'Enter the account holder name').required('Account name is required'),
});

const payoutSchema = Yup.object({
  amount: Yup.number()
    .min(2000, 'Minimum withdrawal is ₦2,000')
    .required('Enter an amount to withdraw'),
});

const disputeSchema = Yup.object({
  reason: Yup.string().required('Select a reason'),
  description: Yup.string()
    .min(10, 'Provide at least 10 characters explaining the issue')
    .required('Description is required'),
});

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentParam = searchParams?.get('payment');
  const tabParam = searchParams?.get('tab');

  const {
    user,
    setUser,
    listings,
    joinedListingIds,
    handleDeleteJoinRequest,
    selectedListing,
    setSelectedListing,
    isDetailModalOpen,
    setIsDetailModalOpen,
    isAuthModalOpen,
    setIsAuthModalOpen,
    handleConfirmJoin,
    refreshListings,
  } = useApp();

  const dashboardQuery = useDashboardQuery(user?.id);
  const markInvitedMutation = useMarkInvitedMutation();
  const confirmAccessMutation = useConfirmAccessMutation();
  const leaveSplitMutation = useLeaveSplitMutation();
  const createInviteMutation = useCreateInviteMutation();
  const revokeInviteMutation = useRevokeInviteMutation();
  const saveBankMutation = useSaveBankDetailsMutation();
  const requestPayoutMutation = useRequestPayoutMutation();
  const openDisputeMutation = useOpenDisputeMutation();
  const submitRatingMutation = useSubmitRatingMutation();

  const [activeTab, setActiveTab] = useState<TabType>(
    tabParam === 'hosted' || tabParam === 'wallet'
      ? tabParam
      : 'joined'
  );
  const [paymentBannerStatus, setPaymentBannerStatus] = useState<string | null>(paymentParam);
  const [actionMessage, setActionMessage] = useState<string>('');
  const [actionError, setActionError] = useState<string>('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [expandedCredentials, setExpandedCredentials] = useState<Record<string, boolean>>({});
  const [expandedSlots, setExpandedSlots] = useState<Record<string, boolean>>({});
  const [generatedInviteUrls, setGeneratedInviteUrls] = useState<Record<string, string>>({});

  // Dispute Modal State
  const [disputeTarget, setDisputeTarget] = useState<{
    membershipId: string;
    planName: string;
  } | null>(null);
  const [disputeEvidence, setDisputeEvidence] = useState<Array<{ name: string; dataUrl: string }>>([]);

  const prevUserIdRef = useRef<string | undefined>(user?.id);

  // Strip ?payment=... from the URL once captured so it does not persist across user switches
  useEffect(() => {
    if (paymentParam) {
      setPaymentBannerStatus(paymentParam);
      router.replace('/dashboard', { scroll: false });
    }
  }, [paymentParam, router]);

  useEffect(() => {
    if (tabParam === 'hosted' || tabParam === 'wallet' || tabParam === 'joined') {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Reset transient dashboard state/banners only when the active user actually changes
  useEffect(() => {
    if (prevUserIdRef.current !== user?.id) {
      prevUserIdRef.current = user?.id;
      setActionMessage('');
      setActionError('');
      setPaymentBannerStatus(null);
      setExpandedCredentials({});
      setExpandedSlots({});
      setGeneratedInviteUrls({});
      setDisputeTarget(null);
      setDisputeEvidence([]);
    }
  }, [user?.id]);

  const dashboardData = dashboardQuery.data;

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

  // Map memberships by listingId for the current user
  const myMembershipByListingId = useMemo(() => {
    const map = new Map<string, NonNullable<typeof dashboardData>['memberships'][number]>();
    if (!user || !dashboardData?.memberships) return map;
    for (const m of dashboardData.memberships) {
      if (m.memberId === user.id) {
        map.set(m.listingId, m);
      }
    }
    return map;
  }, [dashboardData, user]);

  // Memberships on listings hosted by this user
  const hostSeatMemberships = useMemo(() => {
    if (!user || !dashboardData?.memberships) return [];
    return dashboardData.memberships.filter(
      (m) => m.isHost && m.memberId !== user.id && m.status !== 'left'
    );
  }, [dashboardData, user]);

  const pendingHostActionCount = useMemo(() => {
    return hostSeatMemberships.filter((m) => m.status === 'paid_and_held').length;
  }, [hostSeatMemberships]);

  // Rated membership IDs
  const ratedStarsByMembershipId = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of dashboardData?.ratings ?? []) {
      map.set(r.membership_id, r.stars);
    }
    return map;
  }, [dashboardData]);

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

  const toggleCredentialsExpand = (listingId: string) => {
    setExpandedCredentials((prev) => ({ ...prev, [listingId]: !prev[listingId] }));
  };

  const toggleSlotsExpand = (listingId: string) => {
    setExpandedSlots((prev) => ({ ...prev, [listingId]: !prev[listingId] }));
  };

  const handleMarkInvited = async (membershipId: string) => {
    setActionError('');
    setActionMessage('');
    try {
      const res = await markInvitedMutation.mutateAsync(membershipId);
      setActionMessage(res.message);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to mark invitation as sent.');
    }
  };

  const handleConfirmAccess = async (membershipId: string) => {
    setActionError('');
    setActionMessage('');
    try {
      const res = await confirmAccessMutation.mutateAsync(membershipId);
      setActionMessage(res.message);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to confirm access.');
    }
  };

  const handleLeaveSplit = async (membershipOrListingId: string, planName: string) => {
    if (!confirm(`Are you sure you want to leave ${planName}?`)) return;
    setActionError('');
    setActionMessage('');
    try {
      const res = await leaveSplitMutation.mutateAsync(membershipOrListingId);
      setActionMessage(res.message);
      await refreshListings();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to leave split.');
    }
  };

  const handleGenerateInviteLink = async (listingId: string, openSeats: number) => {
    setActionError('');
    setActionMessage('');
    try {
      const res = await createInviteMutation.mutateAsync({
        listingId,
        expires_in_hours: 72,
        max_uses: Math.max(1, openSeats),
      });
      setGeneratedInviteUrls((prev) => ({
        ...prev,
        [listingId]: res.data.invite_url,
      }));
      navigator.clipboard.writeText(res.data.invite_url);
      setActionMessage('Private invite link created and copied to your clipboard!');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not create private invite link.');
    }
  };

  const handleRevokeInvite = async (listingId: string, inviteId: string) => {
    setActionError('');
    setActionMessage('');
    try {
      await revokeInviteMutation.mutateAsync({ listingId, inviteId });
      setActionMessage('Invite link revoked.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not revoke invite link.');
    }
  };

  const handleRateMembership = async (membershipId: string, stars: number) => {
    setActionError('');
    setActionMessage('');
    try {
      const res = await submitRatingMutation.mutateAsync({ membershipId, stars });
      setActionMessage(res.message);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not submit rating.');
    }
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
                Please sign in to view your dashboard, active splits, official invitations, and escrow wallet.
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

  const wallet = dashboardData?.wallet;

  return (
    <div className="bg-off-white min-h-screen pt-[80px]" id="dashboard-layout">
      <Navbar />
      <NotificationBar />

      <div className="max-w-[1120px] mx-auto px-6 py-12 space-y-8 text-left">
        {/* Paystack Callback Banner */}
        {paymentBannerStatus && (
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs font-semibold ${
              paymentBannerStatus === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : paymentBannerStatus === 'failed' || paymentBannerStatus === 'invalid'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={17} className="shrink-0" />
              <span>
                {paymentBannerStatus === 'success'
                  ? 'Payment confirmed and held in escrow! Your host has 24 hours to send your official provider invitation. Once you receive it, click "I Have Access" below.'
                  : paymentBannerStatus === 'failed'
                    ? 'Your Paystack payment did not complete and the reserved seat was released.'
                    : paymentBannerStatus === 'refund'
                      ? 'Your payment is queued for an automatic refund.'
                      : 'Your seat reservation is awaiting payment confirmation.'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setPaymentBannerStatus(null)}
              className="font-bold opacity-70 hover:opacity-100 shrink-0"
              aria-label="Dismiss payment notice"
            >
              ✕
            </button>
          </div>
        )}

        {actionMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle2 size={15} />
              <span>{actionMessage}</span>
            </span>
            <button onClick={() => setActionMessage('')} className="text-emerald-700 font-bold">
              ✕
            </button>
          </div>
        )}

        {actionError && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{actionError}</span>
            </span>
            <button onClick={() => setActionError('')} className="text-rose-700 font-bold">
              ✕
            </button>
          </div>
        )}

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
              <h1 className="font-sans font-semibold text-[20px] text-ink leading-tight flex flex-wrap items-center gap-2">
                <span>{user.name}</span>
                <span className="bg-[#f0fdf4] text-gt-green border border-[#bbf7d0] text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck size={11} className="text-emerald-600 shrink-0" />
                  <span>Verified Account</span>
                </span>
                <Link
                  href="/admin"
                  className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border border-border bg-surface text-slate hover:text-ink"
                >
                  Admin Console
                </Link>
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
                      <span>Vetted Member</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Stats columns right */}
          <div className="flex flex-wrap items-center gap-6 sm:gap-8 w-full md:w-auto border-t md:border-t-0 border-border pt-6 md:pt-0">
            <div className="space-y-1 flex-1 md:flex-none">
              <span className="block font-sans font-semibold text-[22px] text-ink font-numeric-tabular leading-none">
                ₦{totalSpend.toFixed(2)}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-dust block">
                Spend / mo
              </span>
            </div>

            <div className="h-10 w-[1px] bg-border hidden sm:block" />

            <div className="space-y-1 flex-1 md:flex-none">
              <span className="block font-sans font-semibold text-[22px] text-gt-green font-numeric-tabular leading-none">
                ₦{totalSaved.toFixed(2)}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-dust block">
                Saved / mo
              </span>
            </div>

            <div className="h-10 w-[1px] bg-border hidden sm:block" />

            <div className="space-y-1 flex-1 md:flex-none">
              <span className="block font-sans font-semibold text-[22px] text-ink font-numeric-tabular leading-none">
                ₦{Number(wallet?.availableBalance ?? 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-dust block">
                Host Wallet ({activeSplitsCount} splits)
              </span>
            </div>
          </div>
        </section>

        {/* --- TABBED VIEW SYSTEM --- */}
        <section className="space-y-6" id="dashboard-tabs-section">
          <div className="flex items-center overflow-x-auto border-b border-border" id="dashboard-tabs">
            <button
              onClick={() => setActiveTab('joined')}
              className={`py-3.5 px-5 text-[13.5px] font-medium transition-all duration-150 cursor-pointer relative shrink-0 ${
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

            <button
              onClick={() => setActiveTab('hosted')}
              className={`py-3.5 px-5 text-[13.5px] font-medium transition-all duration-150 cursor-pointer relative shrink-0 ${
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

            <button
              onClick={() => setActiveTab('requests')}
              className={`py-3.5 px-5 text-[13.5px] font-medium transition-all duration-150 cursor-pointer relative shrink-0 ${
                activeTab === 'requests' ? 'text-ink font-semibold' : 'text-slate hover:text-ink'
              }`}
            >
              <span>Member Invites &amp; Handshakes</span>
              {pendingHostActionCount > 0 ? (
                <span className="ml-1.5 px-2 py-0.5 bg-gt-red text-white text-[11px] rounded-full font-bold animate-pulse">
                  {pendingHostActionCount}
                </span>
              ) : (
                <span className="ml-1.5 px-2 py-0.5 bg-surface text-slate text-[11px] rounded-full font-bold">
                  {hostSeatMemberships.length}
                </span>
              )}
              {activeTab === 'requests' && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-ink" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('wallet')}
              className={`py-3.5 px-5 text-[13.5px] font-medium transition-all duration-150 cursor-pointer relative shrink-0 flex items-center gap-1.5 ${
                activeTab === 'wallet' ? 'text-ink font-semibold' : 'text-slate hover:text-ink'
              }`}
            >
              <Wallet size={14} />
              <span>Wallet &amp; Payouts</span>
              {activeTab === 'wallet' && (
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
                      const credentials = getPoolCredentials(listing);
                      const isCredsExpanded = !!expandedCredentials[listing.id];
                      const membership = myMembershipByListingId.get(listing.id);
                      const mStatus = membership?.status || 'paid_and_held';
                      const existingRating = membership
                        ? ratedStarsByMembershipId.get(membership.id)
                        : undefined;

                      return (
                        <div
                          key={listing.id}
                          className="bg-white border border-border rounded-[20px] p-6 shadow-sm flex flex-col justify-between space-y-5"
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
                                  <span className="text-[12px] text-slate font-medium">
                                    {listing.category}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-[18px] font-semibold text-ink block font-numeric-tabular leading-none">
                                  ₦{costPerPerson.toFixed(2)}
                                </span>
                                <span className="text-[11px] text-dust uppercase font-bold tracking-wider">
                                  per seat / {listing.billingCycle || 'mo'}
                                </span>
                              </div>
                            </div>

                            {/* PRD Membership Lifecycle Badge */}
                            <div className="flex flex-wrap items-center justify-between gap-2 bg-surface border border-border rounded-xl px-3.5 py-2.5 text-xs">
                              <div className="flex items-center gap-2">
                                <img
                                  src={listing.hostAvatar}
                                  alt={listing.hostName}
                                  className="w-5 h-5 rounded-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                                <span className="font-medium text-ink">Host: {listing.hostName}</span>
                              </div>
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  mStatus === 'active'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : mStatus === 'invited'
                                      ? 'bg-sky-100 text-sky-800 border border-sky-200'
                                      : mStatus === 'disputed'
                                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                                }`}
                              >
                                {mStatus === 'active'
                                  ? '✓ Active Access'
                                  : mStatus === 'invited'
                                    ? 'Invite Sent — Confirm Access'
                                    : mStatus === 'paid_and_held'
                                      ? 'Escrow Held — Awaiting Host Invite'
                                      : mStatus === 'pending_payment'
                                        ? 'Seat Reserved — Payment Pending'
                                        : mStatus}
                              </span>
                            </div>

                            {/* PRD Handshake Action Box (ACC-1 / ACC-2 / F-30) */}
                            {membership && mStatus === 'pending_payment' && membership.authorizationUrl && (
                              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-2.5">
                                <p className="text-xs text-amber-900 font-medium">
                                  Your seat reservation is held for 10 minutes. Complete Paystack checkout to lock in your seat.
                                </p>
                                <AppButton
                                  variant="primary"
                                  size="sm"
                                  fullWidth
                                  onPress={() => window.location.assign(membership.authorizationUrl!)}
                                >
                                  Complete Paystack Checkout →
                                </AppButton>
                              </div>
                            )}

                            {membership && (mStatus === 'paid_and_held' || mStatus === 'invited') && (
                              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-3">
                                <p className="text-xs text-emerald-950 leading-relaxed">
                                  {mStatus === 'invited'
                                    ? 'Your host marked the official provider invitation as sent! Check your email/service account, accept the invite, and click "I Have Access" below to release the host payout.'
                                    : 'Your payment is protected in escrow. Once you receive and accept the official invitation from the host, click "I Have Access" below.'}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  <AppButton
                                    variant="primary"
                                    size="sm"
                                    loading={confirmAccessMutation.isPending}
                                    onPress={() => handleConfirmAccess(membership.id)}
                                    startContent={<Check size={14} />}
                                  >
                                    I Have Access (Release Escrow)
                                  </AppButton>
                                  <AppButton
                                    variant="secondary-outline"
                                    size="sm"
                                    onPress={() =>
                                      setDisputeTarget({
                                        membershipId: membership.id,
                                        planName: listing.planName,
                                      })
                                    }
                                    startContent={<ShieldAlert size={13} />}
                                  >
                                    Report a Problem
                                  </AppButton>
                                </div>
                              </div>
                            )}

                            {/* 1–5 Star Host Rating (PRD RAT-1 / F-45) */}
                            {membership && mStatus === 'active' && (
                              <div className="px-3.5 py-2.5 rounded-xl bg-surface border border-border flex items-center justify-between text-xs">
                                <span className="font-medium text-slate">
                                  {existingRating ? 'Your host rating:' : 'Rate this host:'}
                                </span>
                                <div className="flex items-center gap-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                      key={star}
                                      type="button"
                                      onClick={() => handleRateMembership(membership.id, star)}
                                      className="p-1 cursor-pointer text-amber-500 hover:scale-110 transition-transform"
                                      title={`Rate ${star} stars`}
                                    >
                                      <Star
                                        size={15}
                                        fill={
                                          existingRating && star <= existingRating
                                            ? 'currentColor'
                                            : 'none'
                                        }
                                      />
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Official Invitation Instructions Drawer */}
                            <div className="border border-border rounded-xl bg-surface overflow-hidden">
                              <button
                                onClick={() => toggleCredentialsExpand(listing.id)}
                                className="w-full px-4 py-3 flex justify-between items-center text-[13px] font-semibold text-slate hover:text-ink bg-white border-b border-border cursor-pointer"
                              >
                                <span className="flex items-center gap-1.5">
                                  <Key size={14} className="text-slate" />
                                  <span>Official Invitation &amp; Access Rules</span>
                                </span>
                                <span className="text-[11px] font-bold text-dust uppercase tracking-wider">
                                  {isCredsExpanded ? 'Hide' : 'View'}
                                </span>
                              </button>

                              <AnimatePresence>
                                {isCredsExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="p-4 space-y-3 text-left text-xs"
                                  >
                                    <div className="p-3 bg-white border border-border rounded-lg text-slate leading-relaxed">
                                      <span className="font-bold text-ink block mb-0.5">
                                        No Shared Passwords Policy:
                                      </span>
                                      {credentials.instructions}
                                    </div>
                                    {listing.rules && (
                                      <div className="p-3 bg-white border border-border rounded-lg text-slate leading-relaxed">
                                        <span className="font-bold text-ink block mb-0.5">
                                          Host Split Rules:
                                        </span>
                                        {listing.rules}
                                      </div>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>

                          {/* Bottom Actions */}
                          <div className="pt-4 border-t border-border flex items-center justify-between">
                            {membership && mStatus === 'active' ? (
                              <button
                                onClick={() =>
                                  setDisputeTarget({
                                    membershipId: membership.id,
                                    planName: listing.planName,
                                  })
                                }
                                className="text-[12px] font-medium text-slate hover:text-amber-700 cursor-pointer flex items-center gap-1"
                              >
                                <ShieldAlert size={13} />
                                <span>Report problem</span>
                              </button>
                            ) : (
                              <div />
                            )}

                            <button
                              onClick={() =>
                                handleLeaveSplit(
                                  membership?.id || listing.id,
                                  listing.planName
                                )
                              }
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
                    <div className="col-span-full text-center py-16 bg-white border border-border rounded-[24px] space-y-4 max-w-md mx-auto mt-6">
                      <span className="text-[32px] block select-none">🔌</span>
                      <h3 className="font-sans font-semibold text-[17px] text-ink">No joined splits</h3>
                      <p className="text-[14px] text-slate max-w-xs mx-auto leading-relaxed">
                        You aren&apos;t a member of any subscription splits yet. Browse available splits to start co-buying.
                      </p>
                      <AppButton variant="primary" onPress={() => router.push('/browse')}>
                        Browse splits
                      </AppButton>
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
                      const openSeats = Math.max(0, listing.slotsTotal - listing.slotsFilled);
                      const listingMembers = hostSeatMemberships.filter(
                        (m) => m.listingId === listing.id
                      );
                      const listingInvites = (dashboardData?.invites ?? []).filter(
                        (i) => i.listing_id === listing.id && i.status === 'active'
                      );
                      const latestInviteUrl = generatedInviteUrls[listing.id];

                      return (
                        <div
                          key={listing.id}
                          className="bg-white border border-border rounded-[20px] p-6 shadow-sm flex flex-col justify-between space-y-5"
                        >
                          <div className="space-y-4">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-surface border border-border rounded-[10px] flex items-center justify-center">
                                  <PlanIcon name={listing.planName} size={24} />
                                </div>
                                <div className="text-left">
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-sans font-semibold text-[16px] text-ink leading-tight">
                                      {listing.planName}
                                    </h3>
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                        listing.visibility === 'private'
                                          ? 'bg-amber-100 text-amber-800'
                                          : 'bg-emerald-50 text-emerald-700'
                                      }`}
                                    >
                                      {listing.visibility === 'private' ? 'Private' : 'Public'}
                                    </span>
                                  </div>
                                  <span className="text-[12px] text-slate font-medium">
                                    {listing.category}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-[18px] font-semibold text-ink block font-numeric-tabular leading-none">
                                  ₦{costPerPerson.toFixed(2)}
                                </span>
                                <span className="text-[11px] text-dust uppercase font-bold tracking-wider">
                                  per seat / {listing.billingCycle || 'mo'}
                                </span>
                              </div>
                            </div>

                            {/* Slot indicators */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[11px] text-dust font-bold uppercase tracking-wider">
                                <span>Seats filled</span>
                                <span className="text-slate font-numeric-tabular">
                                  {listing.slotsFilled} of {listing.slotsTotal} ({openSeats} open)
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-ink"
                                  style={{
                                    width: `${(listing.slotsFilled / listing.slotsTotal) * 100}%`,
                                  }}
                                />
                              </div>
                            </div>

                            {/* Private Invite Link Generator (PRD INV-1 / F-18 / F-20) */}
                            <div className="p-3.5 rounded-xl bg-surface border border-border space-y-2.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                                  <Link2 size={14} className="text-gt-green" />
                                  <span>Private Invite Links</span>
                                </span>
                                <AppButton
                                  size="sm"
                                  variant="secondary-outline"
                                  loading={createInviteMutation.isPending}
                                  disabled={openSeats < 1}
                                  onPress={() => handleGenerateInviteLink(listing.id, openSeats)}
                                  startContent={<Lock size={12} />}
                                >
                                  Generate Invite Link
                                </AppButton>
                              </div>

                              {latestInviteUrl && (
                                <div className="flex items-center gap-2 bg-white border border-border rounded-lg p-2 text-xs">
                                  <span className="font-mono text-[11px] text-ink truncate flex-1">
                                    {latestInviteUrl}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyText(latestInviteUrl, listing.id)}
                                    className="px-2 py-1 bg-charcoal text-white dark:text-[#141c17] rounded text-[10px] font-bold cursor-pointer shrink-0 flex items-center gap-1"
                                  >
                                    <Copy size={11} />
                                    <span>{copiedField === listing.id ? 'Copied' : 'Copy'}</span>
                                  </button>
                                </div>
                              )}

                              {listingInvites.length > 0 && (
                                <div className="space-y-1.5 pt-1">
                                  {listingInvites.map((inv) => (
                                    <div
                                      key={inv.id}
                                      className="flex items-center justify-between text-[11px] bg-white border border-border rounded-lg px-2.5 py-1.5"
                                    >
                                      <span className="text-slate">
                                        Uses: {inv.use_count}/{inv.max_uses} · Expires{' '}
                                        {new Date(inv.expires_at).toLocaleDateString('en-NG', {
                                          month: 'short',
                                          day: 'numeric',
                                        })}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleRevokeInvite(listing.id, inv.id)}
                                        className="text-rose-600 hover:underline font-semibold cursor-pointer"
                                      >
                                        Revoke
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* MANAGE SEATS EXPAND DRAW */}
                            <div className="border border-border rounded-xl bg-surface overflow-hidden">
                              <button
                                onClick={() => toggleSlotsExpand(listing.id)}
                                className="w-full px-4 py-3 flex justify-between items-center text-[13px] font-semibold text-slate hover:text-ink bg-white border-b border-border cursor-pointer"
                              >
                                <span className="flex items-center gap-1.5">
                                  <User size={14} className="text-slate" />
                                  <span>Manage split seats ({listingMembers.length} members)</span>
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
                                    {/* Host Seat */}
                                    <div className="flex justify-between items-center bg-white border border-border rounded-lg p-2.5 text-[13px]">
                                      <div className="flex items-center gap-2">
                                        <img
                                          src={user.avatar}
                                          alt={user.name}
                                          className="w-5 h-5 rounded-full object-cover"
                                          referrerPolicy="no-referrer"
                                        />
                                        <span className="font-semibold text-ink">
                                          {user.name.split(' ')[0]} (Host)
                                        </span>
                                      </div>
                                      <span className="text-[10px] bg-surface text-slate font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                                        Seat 1
                                      </span>
                                    </div>

                                    {/* Real Seat Members */}
                                    {listingMembers.map((member, index) => (
                                      <div
                                        key={member.id}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white border border-border rounded-lg p-2.5 text-[12px]"
                                      >
                                        <div>
                                          <div className="font-semibold text-ink">
                                            {member.memberName}{' '}
                                            <span className="text-[10px] font-mono text-dust">
                                              (Seat {index + 2})
                                            </span>
                                          </div>
                                          <div className="text-[11px] text-slate font-mono">
                                            {member.memberEmail}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-surface text-slate">
                                            {member.status}
                                          </span>
                                          {member.status === 'paid_and_held' && (
                                            <AppButton
                                              size="sm"
                                              variant="primary"
                                              loading={markInvitedMutation.isPending}
                                              onPress={() => handleMarkInvited(member.id)}
                                            >
                                              Mark Invited
                                            </AppButton>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>

                          {/* Delete / Cancel listing */}
                          <div className="pt-4 border-t border-border flex justify-between items-center">
                            <Link
                              href={`/listings/${listing.id}`}
                              className="text-xs font-semibold text-gt-green hover:underline"
                            >
                              View public page →
                            </Link>
                            <button
                              onClick={() => {
                                if (
                                  confirm(
                                    `Delete or cancel listing for ${listing.planName}?`
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
                    <div className="col-span-full text-center py-16 bg-white border border-border rounded-[24px] space-y-4 max-w-md mx-auto mt-6">
                      <span className="text-[32px] block select-none">🎒</span>
                      <h3 className="font-sans font-semibold text-[17px] text-ink">No hosted splits</h3>
                      <p className="text-[14px] text-slate max-w-xs mx-auto leading-relaxed">
                        You aren&apos;t hosting any splits yet. Create a split to set up your co-buying group and start saving.
                      </p>
                      <AppButton variant="primary" onPress={() => router.push('/create')}>
                        List a split
                      </AppButton>
                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB 3: MEMBER INVITES & HANDSHAKES (PRD ACC-1 / F-29) */}
              {activeTab === 'requests' && (
                <motion.div
                  key="requests-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4 max-w-3xl mx-auto"
                >
                  {hostSeatMemberships.length > 0 ? (
                    hostSeatMemberships.map((m) => (
                      <div
                        key={m.id}
                        className="bg-white border border-border rounded-[18px] p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-surface flex items-center justify-center font-bold text-ink text-xs border border-border">
                              {m.memberName.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="font-semibold text-ink text-sm leading-tight">
                                {m.memberName}
                              </h4>
                              <p className="text-xs text-slate font-mono">{m.memberEmail}</p>
                            </div>
                          </div>
                          <p className="text-xs text-slate">
                            Split: <strong className="text-ink">{m.planName}</strong> · Seat Payout:{' '}
                            <strong className="text-gt-green">₦{m.pricePerSeat.toFixed(2)}</strong>
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
                          {m.status === 'paid_and_held' ? (
                            <AppButton
                              variant="primary"
                              size="md"
                              loading={markInvitedMutation.isPending}
                              onPress={() => handleMarkInvited(m.id)}
                              startContent={<Send size={13} />}
                            >
                              Mark Official Invite Sent
                            </AppButton>
                          ) : m.status === 'invited' ? (
                            <span className="px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 text-xs font-semibold">
                              Invite Sent · Awaiting Member Confirmation (48h)
                            </span>
                          ) : m.status === 'active' ? (
                            <span className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-1">
                              <Check size={13} />
                              <span>Access Confirmed · Funds Released</span>
                            </span>
                          ) : (
                            <span className="px-3 py-1.5 rounded-xl bg-surface border border-border text-slate text-xs font-semibold uppercase">
                              {m.status}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-16 bg-white border border-border rounded-[24px] space-y-4 max-w-md mx-auto mt-6">
                      <span className="text-[32px] block select-none">📬</span>
                      <h3 className="font-sans font-semibold text-[17px] text-ink">
                        No member handshakes pending
                      </h3>
                      <p className="text-[14px] text-slate max-w-xs mx-auto leading-relaxed">
                        When a member pays for a seat on one of your listings via Paystack, they will appear here so you can send their official provider invitation.
                      </p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB 4: HOST WALLET & NIGERIAN BANK PAYOUTS (PRD Section 8.6 / F-35 to F-40) */}
              {activeTab === 'wallet' && (
                <motion.div
                  key="wallet-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
                >
                  {/* Left Column: Balances & Withdrawal Request */}
                  <div className="lg:col-span-6 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-white border border-border rounded-[20px] p-6 space-y-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-dust block">
                          Available to Withdraw
                        </span>
                        <span className="text-3xl font-bold font-numeric-tabular text-gt-green block">
                          ₦{Number(wallet?.availableBalance ?? 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[11px] text-slate block">
                          Released from confirmed seats
                        </span>
                      </div>

                      <div className="bg-white border border-border rounded-[20px] p-6 space-y-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-dust block">
                          Held in Escrow
                        </span>
                        <span className="text-3xl font-bold font-numeric-tabular text-ink block">
                          ₦{Number(wallet?.heldBalance ?? 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[11px] text-slate block">
                          Unlocks when members confirm access
                        </span>
                      </div>
                    </div>

                    {/* Bank Account Setup Form (Formik + FormikField) */}
                    <div className="bg-white border border-border rounded-[20px] p-6 space-y-4">
                      <div>
                        <CustomText type="title-md" as="h3" className="font-bold text-ink">
                          Nigerian Bank Payout Account
                        </CustomText>
                        <p className="text-xs text-slate mt-0.5">
                          Save your NUBAN bank account to receive host payouts in NGN.
                        </p>
                      </div>

                      <Formik
                        enableReinitialize
                        initialValues={{
                          bankName: wallet?.bankName || '',
                          accountNumber: wallet?.accountNumber || '',
                          accountName: wallet?.accountName || user.name || '',
                        }}
                        validationSchema={bankDetailsSchema}
                        onSubmit={async (values) => {
                          setActionError('');
                          setActionMessage('');
                          try {
                            const res = await saveBankMutation.mutateAsync(values);
                            setActionMessage(res.message);
                          } catch (err) {
                            setActionError(
                              err instanceof Error ? err.message : 'Could not save bank details.'
                            );
                          }
                        }}
                      >
                        {() => (
                          <Form className="space-y-4">
                            <FormikField
                              name="bankName"
                              label="Bank Name"
                              placeholder="e.g. GTBank, Access Bank, Zenith Bank, Kuda"
                            />
                            <FormikField
                              name="accountNumber"
                              label="10-Digit Account Number (NUBAN)"
                              placeholder="0123456789"
                            />
                            <FormikField
                              name="accountName"
                              label="Account Holder Name"
                              placeholder="Full name on bank account"
                            />
                            <AppButton
                              type="submit"
                              variant="secondary-outline"
                              size="md"
                              fullWidth
                              loading={saveBankMutation.isPending}
                            >
                              Save Bank Account Details
                            </AppButton>
                          </Form>
                        )}
                      </Formik>
                    </div>

                    {/* Request Withdrawal Form */}
                    <div className="bg-white border border-border rounded-[20px] p-6 space-y-4">
                      <div>
                        <CustomText type="title-md" as="h3" className="font-bold text-ink">
                          Request Payout Withdrawal (Min ₦2,000)
                        </CustomText>
                        <p className="text-xs text-slate mt-0.5">
                          Withdraw available escrow earnings to your saved Nigerian bank account.
                        </p>
                      </div>

                      <Formik
                        enableReinitialize
                        initialValues={{
                          amount: Math.max(2000, Number(wallet?.availableBalance ?? 2000)),
                        }}
                        validationSchema={payoutSchema}
                        onSubmit={async (values) => {
                          setActionError('');
                          setActionMessage('');
                          if (!wallet?.bankName || !wallet?.accountNumber || !wallet?.accountName) {
                            setActionError('Please save your Nigerian bank account details above first.');
                            return;
                          }
                          try {
                            const res = await requestPayoutMutation.mutateAsync({
                              amount: Number(values.amount),
                              bankName: wallet.bankName,
                              accountNumber: wallet.accountNumber,
                              accountName: wallet.accountName,
                            });
                            setActionMessage(res.message);
                          } catch (err) {
                            setActionError(
                              err instanceof Error ? err.message : 'Unable to request payout.'
                            );
                          }
                        }}
                      >
                        {() => (
                          <Form className="space-y-4">
                            <FormikField
                              name="amount"
                              type="number"
                              label="Withdrawal Amount (NGN)"
                              placeholder="2000"
                            />
                            <AppButton
                              type="submit"
                              variant="primary"
                              size="lg"
                              fullWidth
                              loading={requestPayoutMutation.isPending}
                              disabled={Number(wallet?.availableBalance ?? 0) < 2000}
                            >
                              Request Bank Payout
                            </AppButton>
                          </Form>
                        )}
                      </Formik>
                    </div>
                  </div>

                  {/* Right Column: Payout History & Ledger */}
                  <div className="lg:col-span-6 space-y-6">
                    <div className="bg-white border border-border rounded-[20px] p-6 space-y-4">
                      <CustomText type="title-md" as="h3" className="font-bold text-ink">
                        Payout Requests
                      </CustomText>
                      {!wallet?.payoutRequests?.length ? (
                        <p className="text-xs text-slate py-4">
                          No payout withdrawals requested yet.
                        </p>
                      ) : (
                        <div className="space-y-2.5">
                          {wallet.payoutRequests.map((p) => (
                            <div
                              key={p.id}
                              className="flex items-center justify-between p-3.5 rounded-xl bg-surface border border-border text-xs"
                            >
                              <div>
                                <span className="font-bold text-ink block">
                                  ₦{Number(p.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                                </span>
                                <span className="text-slate text-[11px]">
                                  {p.bank_name} · {p.account_number}
                                </span>
                              </div>
                              <span className="px-2.5 py-1 rounded-full bg-white border border-border text-[10px] font-bold uppercase">
                                {p.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="bg-white border border-border rounded-[20px] p-6 space-y-4">
                      <CustomText type="title-md" as="h3" className="font-bold text-ink">
                        Escrow &amp; Wallet Ledger
                      </CustomText>
                      {!wallet?.transactions?.length ? (
                        <p className="text-xs text-slate py-4">
                          Escrow holds and releases will appear here as members join and confirm access.
                        </p>
                      ) : (
                        <div className="space-y-2.5">
                          {wallet.transactions.map((t) => (
                            <div
                              key={t.id}
                              className="flex items-center justify-between p-3.5 rounded-xl bg-surface border border-border text-xs"
                            >
                              <div>
                                <span className="font-semibold text-ink block">
                                  {t.description || t.type.replace(/_/g, ' ')}
                                </span>
                                <span className="text-[10px] text-dust font-mono">
                                  {new Date(t.created_at).toLocaleDateString('en-NG', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </span>
                              </div>
                              <span className="font-bold font-numeric-tabular text-gt-green">
                                ₦{Number(t.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </div>

      {/* Report a Problem (Dispute) Modal (PRD Section 8.7 / F-41) */}
      <AnimatePresence>
        {disputeTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDisputeTarget(null)}
              className="fixed inset-0 bg-ink/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-md bg-white border border-border rounded-[24px] p-6 sm:p-8 shadow-2xl space-y-5 text-left"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-rose-600 font-bold">
                    Escrow Dispute Protection
                  </span>
                  <CustomText type="title-lg" as="h3" className="font-bold text-ink mt-0.5">
                    Report a Problem ({disputeTarget.planName})
                  </CustomText>
                </div>
                <button
                  onClick={() => setDisputeTarget(null)}
                  className="p-1.5 rounded-full hover:bg-surface text-slate"
                >
                  <X size={16} />
                </button>
              </div>

              <Formik
                initialValues={{
                  reason: 'no_invite',
                  description: '',
                }}
                validationSchema={disputeSchema}
                onSubmit={async (values) => {
                  setActionError('');
                  setActionMessage('');
                  try {
                    const res = await openDisputeMutation.mutateAsync({
                      membershipId: disputeTarget.membershipId,
                      reason: values.reason,
                      description: values.description,
                      evidenceFiles: disputeEvidence.length ? disputeEvidence : undefined,
                    });
                    setActionMessage(res.message);
                    setDisputeEvidence([]);
                    setDisputeTarget(null);
                  } catch (err) {
                    setActionError(
                      err instanceof Error ? err.message : 'Unable to submit dispute.'
                    );
                  }
                }}
              >
                {({ values, setFieldValue }) => (
                  <Form className="space-y-4">
                    <CustomField
                      as="select"
                      label="Issue Category"
                      value={values.reason}
                      options={[
                        { label: 'Host has not sent official invite', value: 'no_invite' },
                        { label: 'Official invite link failed / expired', value: 'invite_failed' },
                        { label: 'Access was revoked during billing cycle', value: 'access_revoked' },
                        { label: 'Plan does not match listing description', value: 'wrong_plan' },
                        { label: 'Other issue', value: 'other' },
                      ]}
                      onChange={(val) => setFieldValue('reason', String(val))}
                    />

                    <FormikField
                      name="description"
                      as="textarea"
                      label="Describe what happened"
                      placeholder="Include details so Trust & Safety can verify and issue your refund or resolution."
                    />

                    <div>
                      <label className="block text-xs font-semibold text-charcoal mb-1.5">
                        Screenshot Evidence (optional, up to 3 PNG/JPG/WEBP images)
                      </label>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        multiple
                        onChange={async (e) => {
                          const files = Array.from(e.target.files ?? []).slice(0, 3);
                          const encoded = await Promise.all(
                            files.map(
                              (file) =>
                                new Promise<{ name: string; dataUrl: string }>((resolve) => {
                                  const reader = new FileReader();
                                  reader.onload = () =>
                                    resolve({
                                      name: file.name,
                                      dataUrl: typeof reader.result === 'string' ? reader.result : '',
                                    });
                                  reader.readAsDataURL(file);
                                })
                            )
                          );
                          setDisputeEvidence(encoded.filter((f) => f.dataUrl));
                        }}
                        className="block w-full text-xs text-slate file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sage-light file:text-sage hover:file:bg-sage/15 cursor-pointer"
                      />
                      {disputeEvidence.length > 0 && (
                        <p className="text-[11px] text-sage mt-1">
                          {disputeEvidence.length} screenshot(s) attached:{' '}
                          {disputeEvidence.map((f) => f.name).join(', ')}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-3 pt-2">
                      <AppButton
                        type="button"
                        variant="secondary-outline"
                        fullWidth
                        onPress={() => {
                          setDisputeEvidence([]);
                          setDisputeTarget(null);
                        }}
                      >
                        Cancel
                      </AppButton>
                      <AppButton
                        type="submit"
                        variant="danger"
                        fullWidth
                        loading={openDisputeMutation.isPending}
                      >
                        Freeze Escrow &amp; Submit
                      </AppButton>
                    </div>
                  </Form>
                )}
              </Formik>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

export default function MyDashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-off-white">
          <div className="w-8 h-8 border-2 border-ink border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
