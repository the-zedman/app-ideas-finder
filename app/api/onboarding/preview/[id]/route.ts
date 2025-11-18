import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    
    // Fetch full analysis for preview
    const { data: analysis, error } = await supabaseAdmin
      .from('user_analyses')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }
    
    return NextResponse.json({ analysis });
    
  } catch (error) {
    console.error('Error fetching preview analysis:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preview', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

