import { createClient } from '@/lib/supabase-client';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Test if we can access the avatars bucket directly
    const { data: files, error: filesError } = await supabase.storage
      .from('avatars')
      .list('', { limit: 10 });

    if (filesError) {
      return NextResponse.json({ 
        error: `Cannot access avatars bucket: ${filesError.message}`,
        details: 'Bucket may not exist or you may not have permission'
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Avatars bucket is accessible',
      files: files || []
    });

  } catch (err) {
    return NextResponse.json({ 
      error: 'Unexpected error', 
      details: err instanceof Error ? err.message : 'Unknown error' 
    }, { status: 500 });
  }
}
