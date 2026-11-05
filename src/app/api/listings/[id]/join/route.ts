import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/server/db';
import { createAdminClient } from '@/lib/server/supabaseAdmin';
import {
  getPaystackSecret,
  getPlatformFeePercent,
  initializePaystackTransaction,
} from '@/lib/server/paystack';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) return NextResponse.json({ error: 'Verify your email and sign in before checkout.' }, { status: 401 });

  const feePercent = getPlatformFeePercent();
  if (!getPaystackSecret() || !(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY) || feePercent === null) {
    return NextResponse.json({ error: 'Checkout is not configured yet. Ask the project owner to finish payment setup.' }, { status: 503 });
  }

  const supabase = createClient();
  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('id,host_id,currency,status,visibility')
    .eq('id', params.id)
    .maybeSingle();
  if (listingError) return NextResponse.json({ error: 'Could not load listing.' }, { status: 500 });
  if (!listing || listing.status !== 'active' || listing.visibility !== 'public') {
    return NextResponse.json({ error: 'This listing is not open for public checkout.' }, { status: 404 });
  }
  if (listing.currency !== 'NGN') {
    return NextResponse.json({ error: 'Paystack checkout is currently available for NGN listings only.' }, { status: 400 });
  }

  const { data: membership, error: holdError } = await supabase.rpc('hold_listing_seat', {
    p_listing_id: params.id,
  });
  if (holdError) {
    const message = holdError.message || 'Could not reserve a seat.';
    const status = holdError.code === 'P0002' ? 404
      : holdError.code === '23505' ? 409
      : holdError.code === '28000' || holdError.code === '42501' ? 401
      : 400;
    return NextResponse.json({ error: message }, { status });
  }

  const hold = Array.isArray(membership) ? membership[0] : membership;
  if (!hold?.id || !hold.price_per_seat) {
    return NextResponse.json({ error: 'Seat reserved, but its price could not be read.' }, { status: 500 });
  }

  const seatAmountMinor = Math.round(Number(hold.price_per_seat) * 100);
  const feeAmountMinor = Math.round(seatAmountMinor * feePercent / 100);
  const amountMinor = seatAmountMinor + feeAmountMinor;
  const reference = `gt-${crypto.randomUUID()}`;
  const admin = createAdminClient();
  const { error: paymentError } = await admin.from('payments').insert({
    membership_id: hold.id,
    listing_id: listing.id,
    member_id: authUser.id,
    host_id: listing.host_id,
    provider: 'paystack',
    provider_reference: reference,
    currency: 'NGN',
    seat_amount_minor: seatAmountMinor,
    fee_amount_minor: feeAmountMinor,
    amount_minor: amountMinor,
    fee_percent: feePercent,
    status: 'pending',
  });

  if (paymentError) {
    return NextResponse.json({ error: 'Could not start the payment record. The seat hold will expire automatically.' }, { status: 500 });
  }

  try {
    const callbackUrl = new URL('/api/payments/paystack/callback', request.url).toString();
    const initialized = await initializePaystackTransaction({
      email: authUser.email,
      amountMinor,
      reference,
      callbackUrl,
      metadata: {
        payment_reference: reference,
        membership_id: hold.id,
        listing_id: listing.id,
        member_id: authUser.id,
      },
    });

    const checkoutUrl = initialized.data?.authorization_url;
    if (!checkoutUrl || initialized.data?.reference !== reference) throw new Error('Paystack returned an invalid checkout link.');
    const parsedCheckoutUrl = new URL(checkoutUrl);
    if (parsedCheckoutUrl.protocol !== 'https:' || parsedCheckoutUrl.hostname !== 'checkout.paystack.com') {
      throw new Error('Paystack returned an untrusted checkout link.');
    }

    await admin.from('payments').update({
      authorization_url: checkoutUrl,
      updated_at: new Date().toISOString(),
    }).eq('provider_reference', reference);

    return NextResponse.json({
      data: {
        authorizationUrl: checkoutUrl,
        reference,
        membershipId: hold.id,
        currency: 'NGN',
        seatAmountMinor,
        feeAmountMinor,
        amountMinor,
        feePercent,
      },
    }, { status: 201 });
  } catch {
    await admin.rpc('release_failed_paystack_payment', { p_provider_reference: reference });
    return NextResponse.json({ error: 'Paystack checkout could not be started. Your seat has been released; please try again.' }, { status: 502 });
  }
}
