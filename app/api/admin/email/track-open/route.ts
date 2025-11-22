import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    // Track open if token provided (do this asynchronously, don't wait)
    if (token) {
      // Don't await - track in background so we can return image quickly
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
      
      supabaseAdmin
        .from('email_recipients')
        .select('id, opened_at, opened_count')
        .eq('tracking_token', token)
        .maybeSingle()
        .then(({ data: recipient }) => {
          if (recipient) {
            const now = new Date().toISOString();
            const newOpenedCount = (recipient.opened_count || 0) + 1;

            supabaseAdmin
              .from('email_recipients')
              .update({
                opened_at: recipient.opened_at || now,
                opened_count: newOpenedCount,
              })
              .eq('id', recipient.id)
              .then(() => {
                console.log(`Email opened: token ${token.substring(0, 8)}...`);
              })
              .catch((err) => {
                console.error('Error updating open count:', err);
              });
          }
        })
        .catch((err) => {
          console.error('Error tracking email open:', err);
        });
    }

    // Fetch and return the logo image
    // This serves as both the logo display and the tracking mechanism
    try {
      const logoResponse = await fetch('https://www.appideasfinder.com/App%20Ideas%20Finder%20-%20logo%20-%20200x200.png');
      if (logoResponse.ok) {
        const logoBuffer = await logoResponse.arrayBuffer();
        return new NextResponse(logoBuffer, {
          headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      }
    } catch (fetchError) {
      console.error('Error fetching logo:', fetchError);
    }

    // Fallback: redirect to logo URL
    return NextResponse.redirect('https://www.appideasfinder.com/App%20Ideas%20Finder%20-%20logo%20-%20200x200.png');
  } catch (error) {
    console.error('Error in track-open endpoint:', error);
    // Fallback: redirect to logo
    return NextResponse.redirect('https://www.appideasfinder.com/App%20Ideas%20Finder%20-%20logo%20-%20200x200.png');
  }
}

