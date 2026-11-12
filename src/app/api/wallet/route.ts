import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/server/db';
import { createAdminClient } from '@/lib/server/supabaseAdmin';
import { createClient } from '@/lib/supabase/server';
import { createInAppNotification } from '@/lib/server/email';
import {
  createPaystackTransferRecipient,
  getPaystackSecret,
  listPaystackNigerianBanks,
  resolvePaystackBankAccount,
} from '@/lib/server/paystack';

export async function GET(request: Request) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) {
    return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  }

  const wantBanks = new URL(request.url).searchParams.get('banks') === '1';
  if (wantBanks) {
    if (!getPaystackSecret()) {
      return NextResponse.json({ banks: [] });
    }
    try {
      const banks = await listPaystackNigerianBanks();
      return NextResponse.json({ banks });
    } catch {
      return NextResponse.json({ banks: [] });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) {
    return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const bankName = typeof body.bankName === 'string' ? body.bankName.trim() : '';
  const requestedBankCode = typeof body.bankCode === 'string' ? body.bankCode.trim() : '';
  const accountNumber = typeof body.accountNumber === 'string' ? body.accountNumber.trim() : '';
  const providedAccountName = typeof body.accountName === 'string' ? body.accountName.trim() : '';

  if (!bankName || !/^\d{10}$/.test(accountNumber) || !providedAccountName) {
    return NextResponse.json(
      { error: 'Provide a valid Nigerian bank name, 10-digit NUBAN account number, and account name.' },
      { status: 400 }
    );
  }

  let resolvedAccountName = providedAccountName;
  let resolvedBankCode = requestedBankCode;
  let bankVerified = false;
  let recipientCode: string | null = null;

  if (getPaystackSecret()) {
    try {
      if (!resolvedBankCode) {
        const banks = await listPaystackNigerianBanks();
        const lowerBank = bankName.toLowerCase();
        const match = banks.find(
          (b) => b.name.toLowerCase() === lowerBank || b.name.toLowerCase().includes(lowerBank)
        );
        if (match) resolvedBankCode = match.code;
      }

      if (resolvedBankCode) {
        const resolved = await resolvePaystackBankAccount(accountNumber, resolvedBankCode);
        resolvedAccountName = resolved.account_name;
        bankVerified = true;

        const recipient = await createPaystackTransferRecipient({
          name: resolvedAccountName,
          accountNumber,
          bankCode: resolvedBankCode,
        });
        recipientCode = recipient.recipient_code;
      }
    } catch (verifyErr) {
      console.warn('Paystack bank verification fallback:', verifyErr);
    }
  }

  const client =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createAdminClient()
      : createClient();

  try {
    await client.from('wallets').upsert(
      {
        user_id: authUser.id,
        bank_name: bankName,
        account_number: accountNumber,
        account_name: resolvedAccountName,
        ...(resolvedBankCode ? { bank_code: resolvedBankCode } : {}),
        bank_verified: bankVerified,
        ...(recipientCode ? { provider_recipient_code: recipientCode } : {}),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
  } catch {
    // Also persist on user_metadata as fallback if wallets table migration hasn't run yet
  }

  try {
    const supabase = createClient();
    const { data: authData } = await supabase.auth.getUser();
    if (authData.user) {
      await supabase.auth.updateUser({
        data: {
          ...authData.user.user_metadata,
          bank_name: bankName,
          bank_code: resolvedBankCode || null,
          bank_verified: bankVerified,
          paystack_recipient_code: recipientCode,
          account_number: accountNumber,
          account_name: resolvedAccountName,
        },
      });
    }
  } catch {
    // ignore
  }

  return NextResponse.json({
    message: bankVerified
      ? `Bank payout details verified via Paystack (${resolvedAccountName}).`
      : 'Bank payout details saved.',
    data: {
      bankName,
      bankCode: resolvedBankCode || null,
      accountNumber,
      accountName: resolvedAccountName,
      verified: bankVerified,
      recipientCode,
    },
  });
}

export async function POST(request: Request) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) {
    return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const amount = Number(body.amount ?? 0);
  const bankName = typeof body.bankName === 'string' ? body.bankName.trim() : '';
  const accountNumber = typeof body.accountNumber === 'string' ? body.accountNumber.trim() : '';
  const accountName = typeof body.accountName === 'string' ? body.accountName.trim() : '';

  if (!Number.isFinite(amount) || amount < 2000) {
    return NextResponse.json(
      { error: 'Minimum payout request amount is ₦2,000.' },
      { status: 400 }
    );
  }
  if (!bankName || !/^\d{10}$/.test(accountNumber) || !accountName) {
    return NextResponse.json(
      { error: 'Save your Nigerian bank name, 10-digit account number, and account name first.' },
      { status: 400 }
    );
  }

  const client =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createAdminClient()
      : createClient();

  // Verify available balance
  const { data: wallet } = await client
    .from('wallets')
    .select('available_balance, held_balance')
    .eq('user_id', authUser.id)
    .maybeSingle();

  let available = Number(wallet?.available_balance ?? 0);
  if (!wallet) {
    const { data: hosted } = await client
      .from('listings')
      .select('id')
      .eq('host_id', authUser.id);
    const hostedIds = (hosted ?? []).map((h) => h.id);
    if (hostedIds.length > 0) {
      const { data: activeMemberships } = await client
        .from('memberships')
        .select('price_per_seat')
        .in('listing_id', hostedIds)
        .eq('status', 'active');
      available = (activeMemberships ?? []).reduce(
        (sum, m) => sum + Number(m.price_per_seat ?? 0),
        0
      );
    }
  }

  if (amount > available) {
    return NextResponse.json(
      { error: `Insufficient available balance (₦${available.toFixed(2)} available).` },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const { data: payout, error: payoutError } = await client
    .from('payout_requests')
    .insert({
      host_id: authUser.id,
      amount,
      bank_name: bankName,
      account_number: accountNumber,
      account_name: accountName,
      status: 'requested',
    })
    .select('*')
    .single();

  if (payoutError) {
    return NextResponse.json(
      { error: 'Could not submit payout request. Ensure database migration 202611050001 is applied.' },
      { status: 500 }
    );
  }

  try {
    await client.from('wallets').upsert(
      {
        user_id: authUser.id,
        available_balance: Math.max(0, available - amount),
        held_balance: Number(wallet?.held_balance ?? 0),
        bank_name: bankName,
        account_number: accountNumber,
        account_name: accountName,
        updated_at: now,
      },
      { onConflict: 'user_id' }
    );

    await client.from('wallet_transactions').insert({
      user_id: authUser.id,
      type: 'withdrawal',
      amount,
      status: 'pending',
      description: `Payout request to ${bankName} (${accountNumber})`,
    });
  } catch {
    // non-blocking
  }

  await createInAppNotification({
    userId: authUser.id,
    type: 'payout_requested',
    title: `Payout request for ₦${amount.toFixed(2)} received`,
    body: `Your withdrawal to ${bankName} (${accountNumber}) is queued for processing.`,
    link: '/dashboard',
  });

  return NextResponse.json(
    {
      message: `Payout request for ₦${amount.toFixed(2)} submitted!`,
      data: payout,
    },
    { status: 201 }
  );
}

