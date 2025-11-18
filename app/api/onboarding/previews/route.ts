import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    
    // Fetch random sample of analyses for preview (limit to 20)
    const { data: analyses, error } = await supabaseAdmin
      .from('user_analyses')
      .select('id, app_name, app_icon_url, app_id, created_at')
      .not('app_name', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100); // Get more to randomize from
    
    if (error) {
      console.error('Error fetching preview analyses:', error);
      return NextResponse.json({ error: 'Failed to fetch previews' }, { status: 500 });
    }
    
    // Randomize and limit to 20
    const unique = (analyses || []).filter((preview, index, arr) => 
      index === arr.findIndex((p) => p.app_id === preview.app_id));
    const shuffled = unique.sort(() => 0.5 - Math.random()).slice(0, 15);
    
    return NextResponse.json({ previews: shuffled });
    
  } catch (error) {
    console.error('Error in previews endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to fetch previews', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

