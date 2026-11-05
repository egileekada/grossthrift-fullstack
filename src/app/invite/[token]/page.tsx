'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Clock,
  Lock,
  ShieldCheck,
  Users,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import NotificationBar from '@/components/NotificationBar';
import AuthModal from '@/components/AuthModal';
import PlanIcon from '@/components/PlanIcon';
import { AppButton, CustomText } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { prdApi, PrivateInvitePreview } from '@/lib/httpService';

export default function PrivateInvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = String(params?.token || '');
  const { user, setUser, isAuthModalOpen, setIsAuthModalOpen, refreshListings } = useApp();

  const [invite, setInvite] = useState<PrivateInvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    prdApi
      .getInvitePreview(token)
      .then((res) => {
        setInvite(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : 'Invite link not found, expired, or no longer available.'
        );
        setLoading(false);
      });
  }, [token]);

  const handleAcceptInvite = async () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    setAccepting(true);
    setActionError('');
    try {
      const res = await prdApi.acceptInvite(token);
      await refreshListings();
      if (res.data.authorizationUrl) {
        window.location.assign(res.data.authorizationUrl);
        return;
      }
      router.push('/dashboard?payment=pending');
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Unable to accept this private invite.'
      );
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-off-white text-charcoal">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-10 h-10 border-4 border-[#115c3e]/20 border-t-[#115c3e] rounded-full animate-spin" />
        </main>
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="min-h-screen flex flex-col bg-off-white text-charcoal">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6 pt-32">
          <div className="max-w-md w-full bg-white border border-border rounded-[24px] p-8 text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <AlertCircle size={22} />
            </div>
            <CustomText type="title-lg" as="h1" className="font-bold font-display text-ink">
              Invite Unavailable
            </CustomText>
            <CustomText type="body-sm" className="text-slate">
              {error || 'This private split invite link has expired, been revoked, or reached its seat limit.'}
            </CustomText>
            <div className="pt-2">
              <AppButton variant="primary" size="lg" fullWidth onPress={() => router.push('/browse')}>
                Browse Public Splits
              </AppButton>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const seatPrice = Number(invite.price_per_seat);
  const feeAmount = Number((seatPrice * 0.1).toFixed(2));
  const checkoutTotal = Number((seatPrice + feeAmount).toFixed(2));

  return (
    <div className="min-h-screen flex flex-col bg-off-white text-charcoal">
      <Navbar />
      <NotificationBar />

      <main className="flex-1 pt-[110px] pb-24 px-6 max-w-[680px] mx-auto w-full text-left">
        <div className="mb-6">
          <Link
            href="/browse"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate hover:text-ink"
          >
            <ArrowLeft size={14} />
            <span>Back to Browse</span>
          </Link>
        </div>

        <div className="bg-white border border-border rounded-[28px] p-6 sm:p-10 shadow-gt-card space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold uppercase tracking-wider">
            <Lock size={12} />
            <span>Private Split Invitation</span>
          </div>

          <div className="flex items-start justify-between gap-4 pb-6 border-b border-border">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-surface border border-border rounded-2xl flex items-center justify-center shrink-0">
                <PlanIcon name={invite.plan_type || invite.service_name} size={28} />
              </div>
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-dust">
                  {invite.service_category}
                </span>
                <CustomText type="headline-sm" as="h1" className="font-display font-bold text-ink">
                  {invite.plan_type || invite.service_name}
                </CustomText>
                <p className="text-xs text-slate mt-1">
                  Hosted by <strong className="text-ink">{invite.host_display_name || 'Verified Host'}</strong>
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-2xl font-bold font-numeric-tabular text-gt-green block">
                ₦{seatPrice.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] text-dust">/{invite.billing_cycle}</span>
            </div>
          </div>

          {invite.description && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-dust block">
                About This Private Group
              </span>
              <p className="text-sm text-slate leading-relaxed">{invite.description}</p>
            </div>
          )}

          {invite.rules && (
            <div className="p-4 rounded-2xl bg-surface border border-border text-xs text-slate space-y-1">
              <span className="font-bold text-ink block">Host Split Rules:</span>
              <p>{invite.rules}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-surface border border-border flex items-center gap-2.5">
              <Users size={16} className="text-gt-green shrink-0" />
              <div>
                <span className="text-dust block text-[10px] uppercase font-bold">Open Seats</span>
                <span className="font-semibold text-ink">
                  {invite.seats_open} available ({invite.uses_remaining} invite uses left)
                </span>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-surface border border-border flex items-center gap-2.5">
              <Clock size={16} className="text-amber-600 shrink-0" />
              <div>
                <span className="text-dust block text-[10px] uppercase font-bold">Invite Expires</span>
                <span className="font-semibold text-ink">
                  {new Date(invite.expires_at).toLocaleDateString('en-NG', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Checkout Breakdown */}
          <div className="bg-surface rounded-2xl p-5 border border-border space-y-2.5 text-xs">
            <div className="flex justify-between text-slate">
              <span>Seat price ({invite.billing_cycle})</span>
              <span>₦{seatPrice.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-slate">
              <span>GrossThrift escrow protection fee (10%)</span>
              <span>₦{feeAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2.5 font-bold text-ink text-sm">
              <span>Total due at Paystack checkout</span>
              <span>₦{checkoutTotal.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-2.5 text-xs">
            <ShieldCheck size={18} className="text-emerald-700 shrink-0" />
            <span>
              Your payment is held in escrow until the host invites you via {invite.service_name}&apos;s official invitation flow and you confirm access.
            </span>
          </div>

          {actionError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
              {actionError}
            </div>
          )}

          <AppButton
            variant="primary"
            size="lg"
            fullWidth
            loading={accepting}
            onPress={handleAcceptInvite}
            endContent={<ArrowRight size={16} />}
          >
            {user
              ? `Accept Invite & Pay ₦${checkoutTotal.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
              : 'Sign in to Accept Private Invite'}
          </AppButton>
        </div>
      </main>

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

