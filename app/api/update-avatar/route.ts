import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { userId, avatarUrl } = await request.json()
    
    if (!userId || !avatarUrl) {
      return NextResponse.json({ error: 'Missing userId or avatarUrl' }, { status: 400 })
    }

    const supabase = await createClient()
    
    console.log('API: Updating profile for user:', userId)
    console.log('API: New avatar URL:', avatarUrl)
    
    // Update the profile using service role (bypasses RLS)
    const { data, error } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', userId)
      .select()

    console.log('API: Update result:', { data, error })

    if (error) {
      console.error('Database update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Check if the update actually worked
    const { data: checkData, error: checkError } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', userId)
      .single()

    console.log('API: Verification check:', { checkData, checkError })
    console.log('API: Current avatar_url in DB:', checkData?.avatar_url)

    console.log('Profile updated successfully:', data)
    return NextResponse.json({ success: true, data, verification: checkData })
    
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
