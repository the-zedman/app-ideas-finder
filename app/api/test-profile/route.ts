import { createClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Test if profiles table exists and is accessible
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(5);

    if (error) {
      return NextResponse.json({ 
        error: error.message, 
        code: error.code,
        details: error.details,
        hint: error.hint 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      profiles: profiles,
      count: profiles?.length || 0 
    });

  } catch (err) {
    return NextResponse.json({ 
      error: 'Unexpected error', 
      details: err instanceof Error ? err.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    
    // Test inserting a profile
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: body.id || 'test-user-id',
        first_name: body.first_name || 'Test',
        last_name: body.last_name || 'User',
        username: body.username || 'testuser',
        email_notifications: true,
        dark_mode: false
      })
      .select();

    if (error) {
      return NextResponse.json({ 
        error: error.message, 
        code: error.code,
        details: error.details,
        hint: error.hint 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      profile: data[0] 
    });

  } catch (err) {
    return NextResponse.json({ 
      error: 'Unexpected error', 
      details: err instanceof Error ? err.message : 'Unknown error' 
    }, { status: 500 });
  }
}
