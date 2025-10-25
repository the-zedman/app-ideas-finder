import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { userId, avatarUrl } = await request.json()
    
    if (!userId || !avatarUrl) {
      return NextResponse.json({ error: 'Missing userId or avatarUrl' }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Update the profile using service role (bypasses RLS)
    const { data, error } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', userId)
      .select()

    if (error) {
      console.error('Database update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
    
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
