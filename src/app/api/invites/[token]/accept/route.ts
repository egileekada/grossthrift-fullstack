import { createHash, randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/server/supabaseAdmin'
import {
  getPaystackSecret,
  getPlatformFeePercent,
  initializePaystackTransaction,
} from '@/lib/server/paystack'

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

export async function POST(
  request: Request,
  { params }: { params: { token: string } },
) {
  if (!TOKEN_PATTERN.test(params.token)) {
    return NextResponse.json({ error: 'Invite link not found or no longer available' }, { status: 404 })
  }

  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user || !user.email) {
    return NextResponse.json({ error: 'Sign in first' }, { status: 401 })
  }

  const tokenHash = createHash('sha256').update(params.token).digest('hex')
  const { data, error } = await supabase.rpc('accept_private_invite', {
    p_token_hash: tokenHash,
  })

  if (error) {
    const status =
      error.code === 'P0002'
        ? 404
        : error.code === '23505'
          ? 409
          : error.code === '28000'
            ? 401
            : error.code === '42501'
              ? 403
              : error.code === '22023'
                ? 409
                : 500

    if (status === 500) {
      console.error('POST /api/invites/[token]/accept failed:', error.message)
      return NextResponse.json({ error: 'Unable to reserve a seat' }, { status })
    }

    return NextResponse.json({ error: error.message }, { status })
  }

  const hold = Array.isArray(data) ? data[0] : data
  const feePercent = getPlatformFeePercent() ?? 10
  const seatAmountMinor = Math.round(Number(hold.price_per_seat) * 100)
  const feeAmountMinor = Math.round((seatAmountMinor * feePercent) / 100)
  const amountMinor = seatAmountMinor + feeAmountMinor

  let authorizationUrl: string | undefined
  let reference: string | undefined

  if (
    getPaystackSecret() &&
    (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)
  ) {
    try {
      const admin = createAdminClient()
      const { data: listing } = await admin
        .from('listings')
        .select('id, host_id, currency')
        .eq('id', hold.listing_id)
        .maybeSingle()

      reference = `gt-${randomUUID()}`
      await admin.from('payments').insert({
        membership_id: hold.id,
        listing_id: hold.listing_id,
        member_id: user.id,
        host_id: listing?.host_id ?? null,
        provider: 'paystack',
        provider_reference: reference,
        currency: 'NGN',
        seat_amount_minor: seatAmountMinor,
        fee_amount_minor: feeAmountMinor,
        amount_minor: amountMinor,
        fee_percent: feePercent,
        status: 'pending',
      })

      const callbackUrl = new URL('/api/payments/paystack/callback', request.url).toString()
      const initialized = await initializePaystackTransaction({
        email: user.email,
        amountMinor,
        reference,
        callbackUrl,
        metadata: {
          payment_reference: reference,
          membership_id: hold.id,
          listing_id: hold.listing_id,
          member_id: user.id,
        },
      })

      if (initialized.data?.authorization_url) {
        authorizationUrl = initialized.data.authorization_url
        await admin
          .from('payments')
          .update({
            authorization_url: authorizationUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('provider_reference', reference)
      }
    } catch (err) {
      console.warn('Invite accept Paystack init warning:', err)
    }
  }

  return NextResponse.json(
    {
      data: {
        id: hold.id,
        listing_id: hold.listing_id,
        status: hold.status,
        price_per_seat: hold.price_per_seat,
        seat_expires_at: hold.seat_expires_at,
        authorizationUrl,
        reference,
        seatAmountMinor,
        feeAmountMinor,
        amountMinor,
        feePercent,
      },
      next: 'checkout',
    },
    { status: 201, headers: { 'Cache-Control': 'no-store' } },
  )
}
