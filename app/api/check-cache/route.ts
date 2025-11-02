import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const appId = searchParams.get('appId');
    
    if (!appId) {
      return NextResponse.json({ error: 'App ID required' }, { status: 400 });
    }
    
    // Use service role to bypass RLS and check for ANY analysis of this app
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    
    const { data, error } = await supabaseAdmin
      .from('user_analyses')
      .select('*')
      .eq('app_id', appId)
      .gte('created_at', fourteenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) {
      console.error('Error checking cache:', error);
      return NextResponse.json({ cached: null });
    }
    
    return NextResponse.json({ cached: data });
    
  } catch (error) {
    console.error('Error in check-cache:', error);
    return NextResponse.json(
      { error: 'Failed to check cache', cached: null },
      { status: 500 }
    );
  }
}

