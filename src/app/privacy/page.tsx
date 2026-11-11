import Link from 'next/link';
import Navbar from '@/components/Navbar';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-off-white text-charcoal pt-[90px] pb-24">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="bg-white border border-border rounded-[24px] p-8 sm:p-10 space-y-6 text-left">
          <div>
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-gt-green">
              Data Protection &amp; NDPA 2023 Alignment
            </span>
            <h1 className="text-3xl font-display font-bold text-ink mt-1">
              Privacy Policy
            </h1>
            <p className="text-xs text-dust mt-1">Effective Date: November 2026</p>
          </div>

          <section className="space-y-2 text-sm text-slate leading-relaxed">
            <h2 className="font-semibold text-ink text-base">1. Data We Collect</h2>
            <p>
              We collect only the data required to operate splits safely: your display name, email address, optional phone number, payout bank account details for hosts, and Paystack transaction references. Public profiles display only your display name, avatar, rating, and completed split count — never your email or phone number.
            </p>
          </section>

          <section className="space-y-2 text-sm text-slate leading-relaxed">
            <h2 className="font-semibold text-ink text-base">2. No Card or Password Storage</h2>
            <p>
              All card and bank checkout flows are processed by Paystack. GrossThrift never collects payment card numbers or subscription account passwords.
            </p>
          </section>

          <section className="space-y-2 text-sm text-slate leading-relaxed">
            <h2 className="font-semibold text-ink text-base">3. Access Control &amp; Row-Level Security</h2>
            <p>
              Database records are protected by Supabase Row-Level Security (RLS) so users can only view or modify records they own or participate in.
            </p>
          </section>

          <section className="space-y-2 text-sm text-slate leading-relaxed">
            <h2 className="font-semibold text-ink text-base">4. Data Export &amp; Account Deletion</h2>
            <p>
              You may request an export or deletion of your personal data at any time by contacting{' '}
              <a href="mailto:miracle4424@gmail.com" className="text-gt-green font-semibold hover:underline">
                miracle4424@gmail.com
              </a>.
            </p>
          </section>

          <div className="pt-4 border-t border-border flex flex-wrap gap-4 text-xs font-semibold text-gt-green">
            <Link href="/terms" className="hover:underline">Terms of Service</Link>
            <Link href="/refund-policy" className="hover:underline">Refund Policy</Link>
            <Link href="/community-rules" className="hover:underline">Community Rules</Link>
            <Link href="/faq" className="hover:underline">FAQ &amp; Support</Link>
          </div>
        </div>
      </main>
    </div>
  );
}

