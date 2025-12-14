import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// Verify admin status
async function verifyAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() { return allCookies },
      setAll() {},
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { isAdmin: false, error: 'Not authenticated' };
  }

  const { data: adminRecord } = await supabase
    .from('admins')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  return { isAdmin: !!adminRecord, user };
}

// Get sitemap URLs
async function getSitemapUrls(): Promise<string[]> {
  const baseUrl = 'https://www.appideasfinder.com';
  
  // Import the sitemap function
  const { default: sitemap } = await import('@/app/sitemap');
  const sitemapData = sitemap();
  
  return sitemapData.map(entry => entry.url);
}

export async function POST() {
  try {
    // Verify admin
    const { isAdmin, error } = await verifyAdmin();
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: error || 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get URLs from sitemap
    const urlList = await getSitemapUrls();

    // IndexNow configuration
    const host = 'www.appideasfinder.com';
    const key = 'b91d671dd6fd44a58894892453c33cd9';
    const keyLocation = `https://www.appideasfinder.com/${key}.txt`;

    // Prepare request body
    const requestBody = {
      host,
      key,
      keyLocation,
      urlList,
    };

    // Submit to IndexNow API
    const response = await fetch('https://api.indexnow.org/IndexNow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(requestBody),
    });

    const statusCode = response.status;
    let statusText = '';
    let message = '';

    // Map status codes to messages
    switch (statusCode) {
      case 200:
        statusText = 'OK';
        message = 'URLs submitted successfully';
        break;
      case 400:
        statusText = 'Bad Request';
        message = 'Invalid format';
        break;
      case 403:
        statusText = 'Forbidden';
        message = 'Key not valid (e.g. key not found, file found but key not in the file)';
        break;
      case 422:
        statusText = 'Unprocessable Entity';
        message = 'URLs don\'t belong to the host or the key is not matching the schema in the protocol';
        break;
      case 429:
        statusText = 'Too Many Requests';
        message = 'Too Many Requests (potential Spam)';
        break;
      default:
        statusText = `HTTP ${statusCode}`;
        message = `Unexpected response: ${response.statusText}`;
    }

    // Try to get response body if available
    let responseBody = null;
    try {
      const text = await response.text();
      if (text) {
        try {
          responseBody = JSON.parse(text);
        } catch {
          responseBody = text;
        }
      }
    } catch (e) {
      // Ignore errors reading response
    }

    return NextResponse.json({
      success: statusCode === 200,
      statusCode,
      statusText,
      message,
      urlsSubmitted: urlList.length,
      urlList,
      responseBody,
    });

  } catch (error: any) {
    console.error('IndexNow submission error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error.message || 'Failed to submit to IndexNow',
      },
      { status: 500 }
    );
  }
}

