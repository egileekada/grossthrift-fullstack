import { NextResponse } from 'next/server';
import {
  isValidPaystackSignature,
  reconcilePaystackReference,
  recordPaystackRefundEvent,
} from '@/lib/server/paystack';

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-paystack-signature');
  if (!isValidPaystackSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid Paystack signature.' }, { status: 401 });
  }

  let event: { event?: unknown; data?: unknown };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid event body.' }, { status: 400 });
  }

  const eventName = typeof event.event === 'string' ? event.event : '';
  const data = event.data && typeof event.data === 'object'
    ? event.data as Record<string, unknown>
    : {};

  try {
    if (eventName === 'charge.success') {
      const reference = typeof data.reference === 'string' ? data.reference : '';
      if (!reference) return NextResponse.json({ error: 'Missing transaction reference.' }, { status: 400 });
      await reconcilePaystackReference(reference);
    } else if (eventName.startsWith('refund.')) {
      await recordPaystackRefundEvent(eventName, data);
    }
  } catch {
    // A non-2xx response asks Paystack to retry delivery.
    return NextResponse.json({ error: 'Could not process Paystack event.' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
