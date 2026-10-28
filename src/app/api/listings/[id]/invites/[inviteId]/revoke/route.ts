import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  _request: Request,
  { params }: { params: { id: string; inviteId: string } },
) {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidPattern.test(params.id) || !uuidPattern.test(params.inviteId)) {
    return NextResponse.json({ error: 'Invalid listing or invite ID' }, { status: 400 })
  }

  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Sign in first' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('invites')
    .update({ status: 'revoked', revoked_at: new Date().toISOString() })
    .eq('id', params.inviteId)
    .eq('listing_id', params.id)
    .eq('invited_by', user.id)
    .eq('status', 'active')
    .select('id, listing_id, status, revoked_at')
    .maybeSingle()

  if (error) {
    console.error('POST /api/listings/[id]/invites/[inviteId]/revoke failed:', error.message)
    return NextResponse.json({ error: 'Unable to revoke invite link' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json(
      { error: 'Active invite link not found for this listing' },
      { status: 404 },
    )
  }

  return NextResponse.json({ data })
}
