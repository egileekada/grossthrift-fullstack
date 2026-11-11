import Link from 'next/link';
import Navbar from '@/components/Navbar';

const FAQS = [
  {
    q: 'How does GrossThrift protect my money when joining a split?',
    a: 'Your Paystack payment is held safely in escrow until the host sends your official invitation and you confirm "I Have Access" on your dashboard. If the invite fails or never arrives, you can open a dispute for a full refund.',
  },
  {
    q: 'Does GrossThrift ask for or share my subscription password?',
    a: 'Never. Hosts only invite members through the service provider’s official family, duo, or team seat invitation system.',
  },
  {
    q: 'What happens after I reserve a seat at checkout?',
    a: 'Your seat is locked for 10 minutes while you complete Paystack checkout. If payment is abandoned or fails, the seat automatically returns to open availability.',
  },
  {
    q: 'How do Private Splits work?',
    a: 'Private splits never appear in public Browse or Search results. Hosts generate a unique private invite link from their dashboard and share it with friends and family.',
  },
  {
    q: 'How and when do hosts get paid?',
    a: 'When a member confirms access, their seat share moves from Held Escrow into your Available Wallet Balance. Once you have at least ₦2,000, you can submit a withdrawal request to your Nigerian bank account.',
  },
];

export default function FaqSupportPage() {
  return (
    <div className="min-h-screen bg-off-white text-charcoal pt-[90px] pb-24">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6 text-left">
        <div className="bg-white border border-border rounded-[24px] p-8 sm:p-10 space-y-6">
          <div>
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-gt-green">
              Help Center
            </span>
            <h1 className="text-3xl font-display font-bold text-ink mt-1">
              Frequently Asked Questions &amp; Support
            </h1>
            <p className="text-sm text-slate mt-2">
              Need help with a split, payout, or dispute? Email us at{' '}
              <a href="mailto:miracle4424@gmail.com" className="text-gt-green font-semibold hover:underline">
                miracle4424@gmail.com
              </a>.
            </p>
          </div>

          <div className="space-y-4">
            {FAQS.map((item) => (
              <div key={item.q} className="p-5 rounded-2xl bg-surface border border-border space-y-1.5">
                <h2 className="font-semibold text-ink text-sm">{item.q}</h2>
                <p className="text-xs text-slate leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-border flex flex-wrap gap-4 text-xs font-semibold text-gt-green">
            <Link href="/community-rules" className="hover:underline">Community Rules</Link>
            <Link href="/refund-policy" className="hover:underline">Refund Policy</Link>
            <Link href="/terms" className="hover:underline">Terms of Service</Link>
            <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
          </div>
        </div>
      </main>
    </div>
  );
}

