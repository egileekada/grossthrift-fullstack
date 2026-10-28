import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

export async function GET(
  _request: Request,
  { params }: { params: { token: string } },
) {
  if (!TOKEN_PATTERN.test(params.token)) {
    return NextResponse.json({ error: 'Invite link not found or no longer available' }, { status: 404 })
  }

  const tokenHash = createHash('sha256').update(params.token).digest('hex')
  const supabase = createClient()
  const { data, error } = await supabase.rpc('get_private_invite_preview', {
    p_token_hash: tokenHash,
  })

  if (error) {
    console.error('GET /api/invites/[token] failed:', error.message)
    return NextResponse.json({ error: 'Unable to load invite' }, { status: 500 })
  }

  const invite = Array.isArray(data) ? data[0] : null
  if (!invite) {
    return NextResponse.json({ error: 'Invite link not found or no longer available' }, { status: 404 })
  }

  return NextResponse.json({ data: invite }, { headers: { 'Cache-Control': 'no-store' } })
}
