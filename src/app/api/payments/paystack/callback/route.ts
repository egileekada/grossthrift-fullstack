import { NextResponse } from 'next/server';
import { reconcilePaystackReference } from '@/lib/server/paystack';

export async function GET(request: Request) {
  const callbackUrl = new URL(request.url);
  const reference = callbackUrl.searchParams.get('reference')?.trim();
  if (!reference || !/^[A-Za-z0-9.=-]+$/.test(reference)) {
    return NextResponse.redirect(new URL('/dashboard?payment=invalid', callbackUrl.origin));
  }

  let paymentState = 'pending';
  try {
    paymentState = await reconcilePaystackReference(reference);
  } catch {
    paymentState = 'pending';
  }

  const result = paymentState === 'held' ? 'success'
    : paymentState === 'failed' ? 'failed'
    : paymentState.startsWith('refund') ? 'refund'
    : 'pending';
  const destination = new URL('/dashboard', callbackUrl.origin);
  destination.searchParams.set('payment', result);
  return NextResponse.redirect(destination);
}
