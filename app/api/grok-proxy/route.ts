import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { hasActiveSubscription } from '@/lib/check-subscription';

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const grokApiKey = process.env.GROK_API_KEY;

    if (!grokApiKey) {
      return NextResponse.json({ error: 'Grok API key not configured' }, { status: 500 });
    }

    // Get current user
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const { createServerClient } = await import('@supabase/ssr');
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() { return allCookies },
        setAll() {},
      },
    });

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if user has active subscription or bonus access
    const hasAccess = await hasActiveSubscription(user.id, supabaseUrl, serviceRoleKey, user.email);
    if (!hasAccess) {
      return NextResponse.json({ error: 'No active subscription or access' }, { status: 403 });
    }

    // Parse the request body
    const { messages, model = 'grok-4-fast-reasoning', temperature = 0.2, max_tokens = 5000 } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array required' }, { status: 400 });
    }

    // Call Grok API
    const endpoint = 'https://api.x.ai/v1/chat/completions';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${grokApiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Grok API error:', response.status, errorText);
      return NextResponse.json(
        { error: `Grok API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Return the full response including usage data for cost tracking
    return NextResponse.json({
      content: data.choices?.[0]?.message?.content || '',
      usage: data.usage || null,
    });

  } catch (error) {
    console.error('Error in grok-proxy:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

