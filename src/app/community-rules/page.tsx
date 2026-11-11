import Link from 'next/link';
import Navbar from '@/components/Navbar';

export default function CommunityRulesPage() {
  return (
    <div className="min-h-screen bg-off-white text-charcoal pt-[90px] pb-24">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="bg-white border border-border rounded-[24px] p-8 sm:p-10 space-y-6 text-left">
          <div>
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-gt-green">
              Trust &amp; Safety
            </span>
            <h1 className="text-3xl font-display font-bold text-ink mt-1">
              GrossThrift Community Rules
            </h1>
            <p className="text-xs text-dust mt-1">Last updated: November 2026</p>
          </div>

          <section className="space-y-2 text-sm text-slate leading-relaxed">
            <h2 className="font-semibold text-ink text-base">1. Host-Pays-First &amp; Plan Eligibility</h2>
            <p>
              Hosts may only list active, paid subscriptions whose official terms permit sharing with family, group, duo, or invited workspace members. Never list trial, expired, or single-user accounts.
            </p>
          </section>

          <section className="space-y-2 text-sm text-slate leading-relaxed">
            <h2 className="font-semibold text-ink text-base">2. Zero Shared Passwords Policy</h2>
            <p>
              GrossThrift never asks for, stores, or transmits primary account passwords. Hosts must add members exclusively using the provider’s official seat or family invitation mechanism.
            </p>
          </section>

          <section className="space-y-2 text-sm text-slate leading-relaxed">
            <h2 className="font-semibold text-ink text-base">3. 24-Hour Invite SLA &amp; 48-Hour Access Confirmation</h2>
            <p>
              Once a member pays via Paystack, funds remain protected in escrow. Hosts must send the official provider invitation and click <strong>Mark Official Invite Sent</strong> within 24 hours. Members have 48 hours to confirm access or open a dispute.
            </p>
          </section>

          <section className="space-y-2 text-sm text-slate leading-relaxed">
            <h2 className="font-semibold text-ink text-base">4. Respectful Seat Usage</h2>
            <p>
              Members must use only their assigned seat or profile and must never alter the host’s billing method, plan tier, or other members’ profiles. Repeated disputes result in account suspension.
            </p>
          </section>

          <div className="pt-4 border-t border-border flex flex-wrap gap-4 text-xs font-semibold text-gt-green">
            <Link href="/terms" className="hover:underline">Terms of Service</Link>
            <Link href="/refund-policy" className="hover:underline">Refund Policy</Link>
            <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
            <Link href="/faq" className="hover:underline">FAQ &amp; Support</Link>
          </div>
        </div>
      </main>
    </div>
  );
}

