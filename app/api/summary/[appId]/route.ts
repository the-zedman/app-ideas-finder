import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    const { appId } = await params;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Try to find by app_id (could be "id6739765789" or "6739765789")
    const normalizedId = appId.startsWith('id') ? appId : `id${appId}`;
    const numericId = appId.replace(/^id/, '');

    const { data: analysis, error } = await supabaseAdmin
      .from('user_analyses')
      .select('*')
      .or(`app_id.eq.${normalizedId},app_id.eq.${numericId}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[summary API] Error fetching analysis:', error);
      return NextResponse.json({ error: 'Failed to fetch analysis' }, { status: 500 });
    }

    if (!analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('[summary API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analysis', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

