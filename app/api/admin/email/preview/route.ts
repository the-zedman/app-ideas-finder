import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { generateEmailHTML } from '@/lib/email-template';

async function requireAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const { cookies: nextCookies } = await import('next/headers');
  const cookieStore = await nextCookies();
  const allCookies = cookieStore.getAll();
  const { createServerClient } = await import('@supabase/ssr');

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return allCookies;
      },
      setAll() {},
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { createClient } = await import('@supabase/supabase-js');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const { data: adminData } = await supabaseAdmin
    .from('admins')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!adminData) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return true;
}

export async function POST(request: Request) {
  try {
    const isAdmin = await requireAdmin();
    if (isAdmin !== true) return isAdmin;

    const body = await request.json();
    const { htmlContent } = body;

    if (!htmlContent) {
      return NextResponse.json({ error: 'htmlContent is required' }, { status: 400 });
    }

    // Generate preview HTML (no tracking token for preview)
    const previewHTML = generateEmailHTML({
      htmlContent,
      trackingToken: undefined,
    });

    return NextResponse.json({ previewHTML });
  } catch (error) {
    console.error('Error generating preview:', error);
    return NextResponse.json({ error: 'Failed to generate preview' }, { status: 500 });
  }
}

