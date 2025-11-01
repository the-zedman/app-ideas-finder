import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const grokApiKey = process.env.GROK_API_KEY!;
    
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
    
    // Verify user is admin
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    
    const { data: adminData } = await supabaseAdmin
      .from('admins')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (!adminData) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }
    
    const healthData: any = {
      timestamp: new Date().toISOString(),
      overall: 'healthy',
      services: {},
      metrics: {},
      recentErrors: []
    };
    
    // Test Database
    try {
      const dbStart = Date.now();
      const { count, error } = await supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      const dbTime = Date.now() - dbStart;
      
      healthData.services.database = {
        status: error ? 'error' : 'healthy',
        responseTime: dbTime,
        message: error?.message || 'Connected',
        userCount: count || 0
      };
      
      if (error) healthData.overall = 'warning';
    } catch (error) {
      healthData.services.database = {
        status: 'error',
        responseTime: 0,
        message: error instanceof Error ? error.message : 'Failed to connect'
      };
      healthData.overall = 'error';
    }
    
    // Test Grok API
    try {
      const grokStart = Date.now();
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${grokApiKey}`
        },
        body: JSON.stringify({
          model: 'grok-4-fast-reasoning',
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 5
        })
      });
      const grokTime = Date.now() - grokStart;
      
      healthData.services.grok = {
        status: response.ok ? 'healthy' : 'error',
        responseTime: grokTime,
        message: response.ok ? 'API responding' : `HTTP ${response.status}`
      };
      
      if (!response.ok) healthData.overall = 'warning';
    } catch (error) {
      healthData.services.grok = {
        status: 'error',
        responseTime: 0,
        message: error instanceof Error ? error.message : 'Failed to connect'
      };
      healthData.overall = 'error';
    }
    
    // Test iTunes API
    try {
      const itunesStart = Date.now();
      const response = await fetch('https://itunes.apple.com/lookup?id=544007664&country=us');
      const itunesTime = Date.now() - itunesStart;
      
      healthData.services.itunes = {
        status: response.ok ? 'healthy' : 'error',
        responseTime: itunesTime,
        message: response.ok ? 'API responding' : `HTTP ${response.status}`
      };
      
      if (!response.ok && healthData.overall !== 'error') healthData.overall = 'warning';
    } catch (error) {
      healthData.services.itunes = {
        status: 'error',
        responseTime: 0,
        message: error instanceof Error ? error.message : 'Failed to connect'
      };
      if (healthData.overall !== 'error') healthData.overall = 'warning';
    }
    
    // Test Auth
    try {
      const authStart = Date.now();
      const { data: sessions } = await supabaseAdmin.auth.admin.listUsers();
      const authTime = Date.now() - authStart;
      
      healthData.services.auth = {
        status: 'healthy',
        responseTime: authTime,
        message: 'Auth working',
        activeUsers: sessions?.users?.length || 0
      };
    } catch (error) {
      healthData.services.auth = {
        status: 'error',
        responseTime: 0,
        message: error instanceof Error ? error.message : 'Auth check failed'
      };
      healthData.overall = 'error';
    }
    
    // Performance Metrics
    const { data: analyses } = await supabaseAdmin
      .from('user_analyses')
      .select('analysis_time_seconds, api_cost, created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (analyses && analyses.length > 0) {
      const avgTime = analyses.reduce((sum, a) => sum + (a.analysis_time_seconds || 0), 0) / analyses.length;
      const successCount = analyses.length; // All in DB are successful
      const successRate = 100; // If it's in DB, it succeeded
      
      healthData.metrics = {
        avgAnalysisTime: avgTime,
        successRate: successRate,
        totalAnalyses: analyses.length,
        last24Hours: analyses.filter(a => 
          new Date(a.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        ).length
      };
    }
    
    // Recent errors would come from a separate error logging system
    // For now, we'll show placeholder
    healthData.recentErrors = [];
    
    return NextResponse.json(healthData);
    
  } catch (error) {
    console.error('Error fetching health data:', error);
    return NextResponse.json({
      error: 'Failed to fetch health data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

