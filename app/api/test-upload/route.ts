import { createClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Create a simple test file
    const testContent = 'test file content';
    const testBlob = new Blob([testContent], { type: 'text/plain' });
    const testFile = new File([testBlob], 'test.txt', { type: 'text/plain' });
    
    const testPath = `test-${Date.now()}.txt`;
    
    // Try to upload to avatars bucket
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(testPath, testFile);

    if (error) {
      return NextResponse.json({ 
        error: error.message,
        details: 'Failed to upload test file'
      }, { status: 500 });
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(testPath);

    return NextResponse.json({ 
      success: true,
      file: data,
      publicUrl: publicUrl,
      message: 'Test upload successful'
    });

  } catch (err) {
    return NextResponse.json({ 
      error: 'Unexpected error', 
      details: err instanceof Error ? err.message : 'Unknown error' 
    }, { status: 500 });
  }
}
