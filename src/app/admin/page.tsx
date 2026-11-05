'use client';

import React, { useEffect, useState } from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import {
  CheckCircle2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import NotificationBar from '@/components/NotificationBar';
import { AppButton, CustomText, FormikField } from '@/components/ui';
import { prdApi } from '@/lib/httpService';
import { useApp } from '@/context/AppContext';

const officialListingSchema = Yup.object({
  planName: Yup.string().min(2).required('Enter a plan name'),
  totalCost: Yup.number().min(500).required('Enter total cost in NGN'),
  seatsTotal: Yup.number().min(2).max(20).required('Enter seats (2-20)'),
  description: Yup.string().max(250),
});

export default function AdminConsolePage() {
  const { user, refreshListings } = useApp();
  const [data, setData] = useState<{
    listings: Array<Record<string, unknown>>;
    memberships: Array<Record<string, unknown>>;
    payments: Array<Record<string, unknown>>;
    disputes: Array<Record<string, unknown>>;
    payouts: Array<Record<string, unknown>>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busyAction, setBusyAction] = useState(false);

  const loadAdmin = async () => {
    setLoading(true);
    try {
      const res = await prdApi.getAdminOverview();
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load admin console.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadAdmin();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleResolveDispute = async (
    disputeId: string,
    membershipId: string,
    decision: 'refund' | 'release'
  ) => {
    setBusyAction(true);
    setNotice('');
    setError('');
    try {
      const res = await prdApi.runAdminAction({
        action: 'resolve_dispute',
        disputeId,
        membershipId,
        decision,
      });
      setNotice(res.message);
      await loadAdmin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resolve dispute.');
    } finally {
      setBusyAction(false);
    }
  };

  const handleMarkPayoutPaid = async (payoutId: string) => {
    setBusyAction(true);
    setNotice('');
    setError('');
    try {
      const res = await prdApi.runAdminAction({
        action: 'mark_payout_paid',
        payoutId,
      });
      setNotice(res.message);
      await loadAdmin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update payout.');
    } finally {
      setBusyAction(false);
    }
  };

  const handleRunCron = async () => {
    setBusyAction(true);
    setNotice('');
    setError('');
    try {
      const res = await prdApi.runCronReconcile();
      setNotice(
        `SLA Reconciled: ${res.expiredHoldsReleased} expired holds released, ${res.autoConfirmedAfter48h} 48h invites auto-confirmed, ${res.overdueHostInvites24h} overdue 24h host invites flagged.`
      );
      await loadAdmin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not run SLA reconciliation.');
    } finally {
      setBusyAction(false);
    }
  };

  return (
    <div className="min-h-screen bg-off-white text-charcoal pt-[90px] pb-24">
      <Navbar />
      <NotificationBar />

      <div className="max-w-[1120px] mx-auto px-6 py-10 space-y-10 text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-border rounded-[24px] p-6 sm:p-8">
          <div>
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-gt-green">
              GrossThrift Operations &amp; Trust Console
            </span>
            <CustomText type="headline-md" as="h1" className="font-display font-bold text-ink mt-1">
              Admin &amp; Escrow Management
            </CustomText>
            <p className="text-xs text-slate mt-1">
              Publish Official GrossThrift splits, adjudicate disputes, process Nigerian bank payouts, and run 24h/48h SLA jobs.
            </p>
          </div>
          <div className="flex gap-2.5 shrink-0">
            <AppButton
              variant="secondary-outline"
              size="md"
              onPress={handleRunCron}
              loading={busyAction}
              startContent={<RefreshCw size={14} />}
            >
              Run 24h/48h SLA Check
            </AppButton>
          </div>
        </div>

        {notice && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{notice}</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Metrics Row */}
        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="bg-white border border-border rounded-2xl p-5">
              <span className="text-[11px] font-bold uppercase text-dust block">Listings</span>
              <span className="text-2xl font-bold text-ink mt-1 block">{data.listings.length}</span>
            </div>
            <div className="bg-white border border-border rounded-2xl p-5">
              <span className="text-[11px] font-bold uppercase text-dust block">Memberships</span>
              <span className="text-2xl font-bold text-ink mt-1 block">{data.memberships.length}</span>
            </div>
            <div className="bg-white border border-border rounded-2xl p-5">
              <span className="text-[11px] font-bold uppercase text-dust block">Paystack Txns</span>
              <span className="text-2xl font-bold text-ink mt-1 block">{data.payments.length}</span>
            </div>
            <div className="bg-white border border-border rounded-2xl p-5">
              <span className="text-[11px] font-bold uppercase text-dust block">Open Disputes</span>
              <span className="text-2xl font-bold text-rose-600 mt-1 block">
                {data.disputes.filter((d) => d.status === 'open').length}
              </span>
            </div>
            <div className="bg-white border border-border rounded-2xl p-5">
              <span className="text-[11px] font-bold uppercase text-dust block">Pending Payouts</span>
              <span className="text-2xl font-bold text-gt-green mt-1 block">
                {data.payouts.filter((p) => p.status === 'requested').length}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Publish Official GrossThrift Listing (PRD ADM-1 / F-57) */}
          <div className="lg:col-span-5 bg-white border border-border rounded-[24px] p-6 space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                <Sparkles size={18} />
              </div>
              <div>
                <h2 className="font-display font-bold text-base text-ink">
                  Create Official GrossThrift Split
                </h2>
                <p className="text-xs text-slate">
                  Lists with <code className="text-[11px]">host_type = &apos;official&apos;</code> badge.
                </p>
              </div>
            </div>

            <Formik
              initialValues={{
                planName: 'Netflix Premium 4K',
                totalCost: 8500,
                seatsTotal: 4,
                description: 'Official GrossThrift managed family subscription with instant invite SLA.',
              }}
              validationSchema={officialListingSchema}
              onSubmit={async (values) => {
                setBusyAction(true);
                setNotice('');
                setError('');
                try {
                  const res = await prdApi.runAdminAction({
                    action: 'create_official_listing',
                    ...values,
                  });
                  setNotice(res.message);
                  await refreshListings();
                  await loadAdmin();
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Failed to create official listing.');
                } finally {
                  setBusyAction(false);
                }
              }}
            >
              {() => (
                <Form className="space-y-4">
                  <FormikField
                    name="planName"
                    label="Official Service / Plan Name"
                    placeholder="e.g. Spotify Family, YouTube Premium"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <FormikField
                      name="totalCost"
                      type="number"
                      label="Total Cost (NGN)"
                    />
                    <FormikField
                      name="seatsTotal"
                      type="number"
                      label="Total Seats"
                    />
                  </div>
                  <FormikField
                    name="description"
                    as="textarea"
                    label="Description"
                  />
                  <AppButton
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={busyAction}
                  >
                    Publish Official Listing
                  </AppButton>
                </Form>
              )}
            </Formik>
          </div>

          {/* Right Column: Disputes & Payout Queues */}
          <div className="lg:col-span-7 space-y-6">
            {/* Disputes Queue */}
            <div className="bg-white border border-border rounded-[24px] p-6 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldAlert size={18} className="text-rose-600" />
                <h2 className="font-display font-bold text-base text-ink">
                  Dispute Adjudication Queue
                </h2>
              </div>

              {loading ? (
                <p className="text-xs text-slate">Loading disputes...</p>
              ) : !data?.disputes.length ? (
                <p className="text-xs text-slate py-4">No disputes have been opened.</p>
              ) : (
                <div className="space-y-3">
                  {data.disputes.map((d) => (
                    <div
                      key={String(d.id)}
                      className="p-4 rounded-xl bg-surface border border-border flex flex-col sm:flex-row justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold uppercase">
                            {String(d.reason).replace('_', ' ')}
                          </span>
                          <span className="text-[11px] font-mono text-dust">
                            Status: {String(d.status)}
                          </span>
                        </div>
                        <p className="text-xs text-ink font-medium">{String(d.description)}</p>
                      </div>
                      {d.status === 'open' && (
                        <div className="flex gap-2 shrink-0 items-center">
                          <AppButton
                            size="sm"
                            variant="danger"
                            onPress={() =>
                              handleResolveDispute(
                                String(d.id),
                                String(d.membership_id),
                                'refund'
                              )
                            }
                          >
                            Refund Member
                          </AppButton>
                          <AppButton
                            size="sm"
                            variant="primary"
                            onPress={() =>
                              handleResolveDispute(
                                String(d.id),
                                String(d.membership_id),
                                'release'
                              )
                            }
                          >
                            Release to Host
                          </AppButton>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payout Queue */}
            <div className="bg-white border border-border rounded-[24px] p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Wallet size={18} className="text-gt-green" />
                <h2 className="font-display font-bold text-base text-ink">
                  Host Bank Payout Queue (NGN)
                </h2>
              </div>

              {loading ? (
                <p className="text-xs text-slate">Loading payouts...</p>
              ) : !data?.payouts.length ? (
                <p className="text-xs text-slate py-4">No pending payout requests.</p>
              ) : (
                <div className="space-y-3">
                  {data.payouts.map((p) => (
                    <div
                      key={String(p.id)}
                      className="p-4 rounded-xl bg-surface border border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                    >
                      <div className="space-y-1">
                        <span className="font-bold text-ink text-sm">
                          ₦{Number(p.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                        </span>
                        <p className="text-xs text-slate">
                          {String(p.bank_name)} · {String(p.account_number)} ({String(p.account_name)})
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-full bg-white border border-border text-[11px] font-semibold uppercase">
                          {String(p.status)}
                        </span>
                        {p.status === 'requested' && (
                          <AppButton
                            size="sm"
                            variant="primary"
                            onPress={() => handleMarkPayoutPaid(String(p.id))}
                            startContent={<ShieldCheck size={13} />}
                          >
                            Mark Paid
                          </AppButton>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

