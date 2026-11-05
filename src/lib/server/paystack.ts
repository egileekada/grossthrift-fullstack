import crypto from 'crypto';
import { createAdminClient } from '@/lib/server/supabaseAdmin';

type PaystackEnvelope<T> = { status: boolean; message?: string; data?: T };

export type PaystackVerifiedTransaction = {
  id: number | string;
  reference: string;
  status: string;
  amount: number;
  currency: string;
};

export function getPaystackSecret() {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  return secret?.trim() || null;
}

export function getPlatformFeePercent() {
  const raw = process.env.PLATFORM_FEE_PERCENT;
  if (!raw?.trim()) return null;
  const percent = Number(raw);
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) return null;
  return percent;
}

export function isValidPaystackSignature(rawBody: string, signature: string | null) {
  const secret = getPaystackSecret();
  if (!secret || !signature || !/^[a-f0-9]{128}$/i.test(signature)) return false;
  const expected = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
  const actualBytes = Buffer.from(signature, 'hex');
  const expectedBytes = Buffer.from(expected, 'hex');
  return actualBytes.length === expectedBytes.length && crypto.timingSafeEqual(actualBytes, expectedBytes);
}

async function paystackRequest<T>(path: string, init?: RequestInit): Promise<PaystackEnvelope<T>> {
  const secret = getPaystackSecret();
  if (!secret) throw new Error('Paystack secret key is not configured.');
  const response = await fetch(`https://api.paystack.co${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
  });
  const result = await response.json() as PaystackEnvelope<T>;
  if (!response.ok || !result.status) throw new Error(result.message || 'Paystack request failed.');
  return result;
}

export async function initializePaystackTransaction(input: {
  email: string;
  amountMinor: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, string>;
}) {
  return paystackRequest<{
    authorization_url: string;
    access_code: string;
    reference: string;
  }>('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({
      email: input.email,
      amount: String(input.amountMinor),
      currency: 'NGN',
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: JSON.stringify(input.metadata),
    }),
  });
}

export async function verifyPaystackTransaction(reference: string) {
  const encoded = encodeURIComponent(reference);
  const response = await paystackRequest<PaystackVerifiedTransaction>(`/transaction/verify/${encoded}`);
  if (!response.data) throw new Error('Paystack verification returned no transaction.');
  return response.data;
}

async function requestFullRefund(reference: string) {
  return paystackRequest<{ id: number | string; status: string }>('/refund', {
    method: 'POST',
    body: JSON.stringify({
      transaction: reference,
      customer_note: 'The seat reservation expired before payment completed.',
      merchant_note: `GrossThrift automatic refund for ${reference}`,
    }),
  });
}

export async function reconcilePaystackReference(reference: string) {
  const transaction = await verifyPaystackTransaction(reference);
  const admin = createAdminClient();
  const { data: payment, error: paymentError } = await admin
    .from('payments')
    .select('amount_minor,currency,status')
    .eq('provider_reference', reference)
    .maybeSingle();
  if (paymentError || !payment) throw new Error('Payment record not found.');
  if (transaction.reference !== reference) throw new Error('Paystack reference did not match.');

  if (transaction.status === 'success') {
    if (Number(transaction.amount) !== Number(payment.amount_minor) || transaction.currency !== payment.currency) {
      throw new Error('Paystack amount or currency did not match the payment record.');
    }

    const { data: state, error } = await admin.rpc('settle_paystack_payment', {
      p_provider_reference: reference,
      p_provider_transaction_id: String(transaction.id),
      p_amount_minor: transaction.amount,
      p_currency: transaction.currency,
    });
    if (error) throw new Error('Could not settle the verified Paystack payment.');

    if (state === 'refund_due') {
      const { data: claimed, error: claimError } = await admin.rpc('claim_paystack_refund', {
        p_provider_reference: reference,
      });
      if (claimError) throw new Error('Could not claim the late-payment refund.');
      if (claimed === true) {
        try {
          const refund = await requestFullRefund(reference);
          await admin.from('payments').update({
            refund_reference: String(refund.data?.id ?? ''),
            status: 'refund_pending',
            updated_at: new Date().toISOString(),
          }).eq('provider_reference', reference);
        } catch {
          // Keep the refund pending for review; do not automatically issue a duplicate refund.
        }
      }
    }
    return String(state ?? 'held');
  }

  if (transaction.status === 'failed' || transaction.status === 'abandoned') {
    const { error } = await admin.rpc('release_failed_paystack_payment', {
      p_provider_reference: reference,
    });
    if (error) throw new Error('Could not release the failed payment reservation.');
    return 'failed';
  }

  return 'pending';
}

export async function recordPaystackRefundEvent(event: string, data: Record<string, unknown>) {
  const transaction = data.transaction;
  const transactionData = transaction && typeof transaction === 'object'
    ? transaction as Record<string, unknown>
    : {};
  const reference = typeof transactionData.reference === 'string'
    ? transactionData.reference
    : typeof data.reference === 'string' ? data.reference : null;
  if (!reference) return;

  const status = event === 'refund.processed' ? 'refunded'
    : event === 'refund.failed' || event === 'refund.needs-attention' ? 'refund_due'
    : 'refund_pending';
  const admin = createAdminClient();
  const { error } = await admin.from('payments')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('provider_reference', reference)
    .in('status', ['refund_pending', 'refund_due']);
  if (error) throw new Error('Could not update the refund record.');
}
