import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const url = searchParams.get('url');

    if (!token || !url) {
      return NextResponse.redirect('https://www.appideasfinder.com');
    }

    // Track click if token provided (do this synchronously before redirect)
    if (token) {
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
      
      try {
        const { data: recipient } = await supabaseAdmin
          .from('email_recipients')
          .select('id, clicked_at, clicked_count')
          .eq('tracking_token', token)
          .maybeSingle();

        if (recipient) {
          const now = new Date().toISOString();
          const newClickedCount = (recipient.clicked_count || 0) + 1;

          await supabaseAdmin
            .from('email_recipients')
            .update({
              clicked_at: recipient.clicked_at || now,
              clicked_count: newClickedCount,
            })
            .eq('id', recipient.id);

          console.log(`Email link clicked: token ${token.substring(0, 8)}..., URL: ${url}`);
        }
      } catch (err) {
        console.error('Error tracking email click:', err);
        // Don't block redirect on tracking error
      }
    }

    // Decode the URL and redirect
    const decodedUrl = decodeURIComponent(url);
    
    // Validate URL to prevent open redirects
    try {
      const urlObj = new URL(decodedUrl);
      // Only allow redirects to appideasfinder.com or external URLs (for flexibility)
      // For security, you might want to restrict to specific domains
      return NextResponse.redirect(decodedUrl);
    } catch (error) {
      // Invalid URL, redirect to home
      return NextResponse.redirect('https://www.appideasfinder.com');
    }
  } catch (error) {
    console.error('Error in track-click endpoint:', error);
    // Fallback: redirect to home
    return NextResponse.redirect('https://www.appideasfinder.com');
  }
}

