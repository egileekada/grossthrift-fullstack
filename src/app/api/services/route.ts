import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('services')
    .select('id, name, category, logo_url, sharing_policy_note')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) {
    console.error('GET /api/services failed:', error.message)
    return NextResponse.json(
      { error: 'Unable to load services' },
      { status: 500 },
    )
  }

  return NextResponse.json({ data })
}