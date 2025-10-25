import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { userId, avatarUrl } = await request.json()
    
    if (!userId || !avatarUrl) {
      return NextResponse.json({ error: 'Missing userId or avatarUrl' }, { status: 400 })
    }

    const supabase = createAdminClient()
    
    console.log('=== AVATAR UPDATE DEBUG ===')
    console.log('User ID:', userId)
    console.log('Avatar URL:', avatarUrl)
    
    // Update the profile using service role (bypasses RLS)
    const { data, error } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', userId)
      .select()

    console.log('Update result:', { data, error })
    console.log('Rows affected:', data?.length || 0)

    if (error) {
      console.error('Database update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Verify the update worked
    const { data: verifyData, error: verifyError } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', userId)
      .single()

    console.log('Verification:', { verifyData, verifyError })
    console.log('=== END DEBUG ===')

    return NextResponse.json({ success: true, data, verification: verifyData })
    
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
