import Link from 'next/link';
import Navbar from '@/components/Navbar';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-off-white text-charcoal pt-[90px] pb-24">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="bg-white border border-border rounded-[24px] p-8 sm:p-10 space-y-6 text-left">
          <div>
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-gt-green">
              Legal
            </span>
            <h1 className="text-3xl font-display font-bold text-ink mt-1">
              Terms of Service
            </h1>
            <p className="text-xs text-dust mt-1">Effective Date: November 2026</p>
          </div>

          <section className="space-y-2 text-sm text-slate leading-relaxed">
            <h2 className="font-semibold text-ink text-base">1. Platform Role</h2>
            <p>
              GrossThrift provides coordination, invite workflows, and escrow payment settlement for eligible group and family subscription splits in Nigeria (NGN). Community hosts independently manage their underlying provider plans, while GrossThrift Official listings are managed directly by GrossThrift.
            </p>
          </section>

          <section className="space-y-2 text-sm text-slate leading-relaxed">
            <h2 className="font-semibold text-ink text-base">2. Eligibility &amp; Verification</h2>
            <p>
              You must register with an accurate name, verify your email address, and maintain only one active account. Unverified accounts may browse public splits but cannot publish or join a split.
            </p>
          </section>

          <section className="space-y-2 text-sm text-slate leading-relaxed">
            <h2 className="font-semibold text-ink text-base">3. Fees, Escrow &amp; Price Lock</h2>
            <p>
              Every checkout clearly displays the seat share, platform fee, and total payable before payment. Member funds are held until access is confirmed or the 48-hour confirmation window passes without a dispute. Hosts cannot change seat prices for existing active members mid-cycle.
            </p>
          </section>

          <section className="space-y-2 text-sm text-slate leading-relaxed">
            <h2 className="font-semibold text-ink text-base">4. Suspension &amp; Compliance</h2>
            <p>
              GrossThrift may suspend accounts or listings involved in non-delivery, password sharing, chargebacks, or repeated disputes.
            </p>
          </section>

          <div className="pt-4 border-t border-border flex flex-wrap gap-4 text-xs font-semibold text-gt-green">
            <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
            <Link href="/refund-policy" className="hover:underline">Refund Policy</Link>
            <Link href="/community-rules" className="hover:underline">Community Rules</Link>
            <Link href="/faq" className="hover:underline">FAQ &amp; Support</Link>
          </div>
        </div>
      </main>
    </div>
  );
}

