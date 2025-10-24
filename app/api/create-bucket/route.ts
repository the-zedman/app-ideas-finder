import { createClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Create the avatars bucket
    const { data, error } = await supabase.storage.createBucket('avatars', {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      fileSizeLimit: 5242880 // 5MB
    });

    if (error) {
      return NextResponse.json({ 
        error: error.message,
        details: error
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      bucket: data,
      message: 'Avatars bucket created successfully'
    });

  } catch (err) {
    return NextResponse.json({ 
      error: 'Unexpected error', 
      details: err instanceof Error ? err.message : 'Unknown error' 
    }, { status: 500 });
  }
}
