import { createClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Test if avatars bucket exists
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

    if (bucketsError) {
      return NextResponse.json({ 
        error: bucketsError.message, 
        code: bucketsError.statusCode 
      }, { status: 500 });
    }

    const avatarsBucket = buckets?.find(bucket => bucket.id === 'avatars');
    
    if (!avatarsBucket) {
      return NextResponse.json({ 
        error: 'Avatars bucket does not exist',
        buckets: buckets?.map(b => ({ id: b.id, name: b.name, public: b.public }))
      }, { status: 404 });
    }

    // Test listing files in avatars bucket
    const { data: files, error: filesError } = await supabase.storage
      .from('avatars')
      .list('', { limit: 10 });

    if (filesError) {
      return NextResponse.json({ 
        error: `Cannot list files in avatars bucket: ${filesError.message}`,
        bucket: avatarsBucket
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      bucket: avatarsBucket,
      files: files || []
    });

  } catch (err) {
    return NextResponse.json({ 
      error: 'Unexpected error', 
      details: err instanceof Error ? err.message : 'Unknown error' 
    }, { status: 500 });
  }
}
