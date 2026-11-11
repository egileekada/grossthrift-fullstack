import Link from 'next/link';
import Navbar from '@/components/Navbar';

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-off-white text-charcoal pt-[90px] pb-24">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="bg-white border border-border rounded-[24px] p-8 sm:p-10 space-y-6 text-left">
          <div>
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-gt-green">
              Escrow Guarantee
            </span>
            <h1 className="text-3xl font-display font-bold text-ink mt-1">
              Refund Policy
            </h1>
            <p className="text-xs text-dust mt-1">Effective Date: November 2026</p>
          </div>

          <section className="space-y-2 text-sm text-slate leading-relaxed">
            <h2 className="font-semibold text-ink text-base">1. Automatic Refund for Host Non-Delivery</h2>
            <p>
              If a host does not send your official provider invitation within the 24-hour SLA after your Paystack payment settles, or if your seat hold expires before payment settles cleanly, your payment is flagged for automatic full refund.
            </p>
          </section>

          <section className="space-y-2 text-sm text-slate leading-relaxed">
            <h2 className="font-semibold text-ink text-base">2. Disputes While Funds Are Held</h2>
            <p>
              If an invitation link fails, access is revoked, or the wrong plan was delivered, click <strong>Report a Problem</strong> on your dashboard. Escrow funds are immediately frozen until GrossThrift Trust &amp; Safety reviews evidence and issues either a refund to you or release to the host.
            </p>
          </section>

          <section className="space-y-2 text-sm text-slate leading-relaxed">
            <h2 className="font-semibold text-ink text-base">3. Confirmed Splits &amp; Leaving a Split</h2>
            <p>
              Once you click <strong>I Have Access</strong> (or the 48-hour dispute window closes without a dispute), escrow funds are released to the host. Choosing <strong>Leave Split</strong> cancels your participation starting at the next billing cycle and does not retroactively refund an already active cycle.
            </p>
          </section>

          <div className="pt-4 border-t border-border flex flex-wrap gap-4 text-xs font-semibold text-gt-green">
            <Link href="/terms" className="hover:underline">Terms of Service</Link>
            <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
            <Link href="/community-rules" className="hover:underline">Community Rules</Link>
            <Link href="/faq" className="hover:underline">FAQ &amp; Support</Link>
          </div>
        </div>
      </main>
    </div>
  );
}

