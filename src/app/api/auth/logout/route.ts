import { NextResponse } from 'next/server';
import { clearSession, isSupabaseConfigured } from '@/lib/server/db';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  clearSession();

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Ignore if Supabase is not reachable
    }
  }

  return NextResponse.json({ message: 'Signed out.' });
}
