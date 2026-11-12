import { NextResponse } from 'next/server';
import { getAuthenticatedUser, toPublicUser } from '@/lib/server/db';
import { createAdminClient } from '@/lib/server/supabaseAdmin';
import { createClient } from '@/lib/supabase/server';

const allowedFields = new Set([
  'display_name',
  'avatar_url',
  'bio',
  'phone',
  'country',
  'country_flag',
  'verification_method',
  'verification_detail',
  'is_vetted',
]);

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in to view your profile.' }, { status: 401 });
  }

  const supabase = createClient();
  const [{ data: authResult }, { data: profile, error: profileError }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('profiles')
      .select('display_name,avatar_url,bio,rating_avg,completed_splits')
      .eq('id', user.id)
      .maybeSingle(),
  ]);

  if (profileError) {
    console.error('GET /api/profile failed:', profileError.message);
    return NextResponse.json({ error: 'Could not load your profile.' }, { status: 500 });
  }

  const metadata = (authResult.user?.user_metadata ?? {}) as Record<string, unknown>;
  return NextResponse.json({
    user: toPublicUser(user),
    profile,
    phone: typeof metadata.phone === 'string' ? metadata.phone : null,
    metadata: {
      country: typeof metadata.country === 'string' ? metadata.country : 'Nigeria',
      countryFlag: typeof metadata.country_flag === 'string' ? metadata.country_flag : '🇳🇬',
      verificationMethod:
        typeof metadata.verification_method === 'string' ? metadata.verification_method : null,
      verificationDetail:
        typeof metadata.verification_detail === 'string' ? metadata.verification_detail : null,
      isVetted: metadata.is_vetted === true || metadata.onboarding_completed === true,
    },
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(request: Request) {
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return NextResponse.json({ error: 'Send a valid profile update.' }, { status: 400 });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Send valid JSON.' }, { status: 400 });
  }

  if (!Object.keys(body).length || Object.keys(body).some((key) => !allowedFields.has(key))) {
    return NextResponse.json({ error: 'Send supported profile fields only.' }, { status: 400 });
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in to update your profile.' }, { status: 401 });
  }

  const supabase = createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json({ error: 'Your session has expired. Sign in again.' }, { status: 401 });
  }

  const metadataPatch: Record<string, unknown> = {};
  for (const key of ['phone', 'country', 'country_flag', 'verification_method', 'verification_detail'] as const) {
    if (key in body) metadataPatch[key] = body[key];
  }
  if ('is_vetted' in body) {
    if (typeof body.is_vetted !== 'boolean') {
      return NextResponse.json({ error: 'Invalid verification status.' }, { status: 400 });
    }
    metadataPatch.is_vetted = body.is_vetted;
    if (body.is_vetted) {
      metadataPatch.onboarding_completed = true;
      metadataPatch.pledge_accepted_at = new Date().toISOString();
    }
  }

  const profilePatch: Record<string, unknown> = {};
  if (typeof body.display_name === 'string') {
    const value = body.display_name.trim();
    if (value.length < 2 || value.length > 100) {
      return NextResponse.json({ error: 'Display name must be between 2 and 100 characters.' }, { status: 400 });
    }
    profilePatch.display_name = value;
    metadataPatch.display_name = value;
    metadataPatch.name = value;
  }
  if (typeof body.avatar_url === 'string') {
    profilePatch.avatar_url = body.avatar_url.trim() || null;
    metadataPatch.avatar_url = body.avatar_url.trim() || null;
  }
  if (typeof body.bio === 'string') {
    const value = body.bio.trim();
    if (value.length > 500) {
      return NextResponse.json({ error: 'Bio must be 500 characters or fewer.' }, { status: 400 });
    }
    profilePatch.bio = value || null;
  }

  if (Object.keys(metadataPatch).length) {
    const nextMetadata = { ...authData.user.user_metadata, ...metadataPatch };
    const { error: metaError } = await supabase.auth.updateUser({
      data: nextMetadata,
    });
    if (metaError) {
      let savedViaAdmin = false;
      if (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const admin = createAdminClient();
        const { error: adminMetaErr } = await admin.auth.admin.updateUserById(user.id, {
          user_metadata: nextMetadata,
        });
        savedViaAdmin = !adminMetaErr;
      }
      if (!savedViaAdmin) {
        console.error('PATCH /api/profile metadata update failed:', metaError.message);
        return NextResponse.json({ error: 'Could not save your account details.' }, { status: 500 });
      }
    }
  }

  if (Object.keys(profilePatch).length) {
    const hasServiceRole = Boolean(
      process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const clients = [supabase, ...(hasServiceRole ? [createAdminClient()] : [])];
    let profileSaved = false;
    let lastProfileError = '';

    for (const client of clients) {
      const { data: updatedRows, error: updateErr } = await client
        .from('profiles')
        .update(profilePatch)
        .eq('id', user.id)
        .select('id');

      if (!updateErr && updatedRows && updatedRows.length > 0) {
        profileSaved = true;
        break;
      }

      const { error: upsertErr } = await client.from('profiles').upsert(
        { id: user.id, ...profilePatch },
        { onConflict: 'id' },
      );

      if (!upsertErr) {
        profileSaved = true;
        break;
      }
      lastProfileError = upsertErr.message || updateErr?.message || '';
    }

    if (!profileSaved) {
      console.error('PATCH /api/profile profile update failed:', lastProfileError);
      return NextResponse.json({ error: 'Could not save your public profile.' }, { status: 500 });
    }
  }

  const updatedUser = await getAuthenticatedUser();
  return NextResponse.json({
    message: 'Profile updated.',
    user: updatedUser ? toPublicUser(updatedUser) : toPublicUser(user),
    onboarding: {
      country: metadataPatch.country ?? user.country,
      countryFlag: metadataPatch.country_flag ?? user.countryFlag,
      verificationMethod: metadataPatch.verification_method ?? user.verificationMethod,
      verificationDetail: metadataPatch.verification_detail ?? user.verificationDetail,
      isVetted:
        updatedUser?.isVetted ??
        (typeof metadataPatch.is_vetted === 'boolean'
          ? metadataPatch.is_vetted
          : user.isVetted ?? false),
    },
  }, { headers: { 'Cache-Control': 'no-store' } });
}
