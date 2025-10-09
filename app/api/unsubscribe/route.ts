import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: 'Unsubscribe token is required' }, { status: 400 })
    }

    // Delete the email from the waitlist table using the token
    const { error } = await supabase
      .from('waitlist')
      .delete()
      .eq('unsubscribe_token', token)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unsubscribe error:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}

