import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

// Rate limiting configuration
const RATE_LIMIT = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 requests per minute
  hourWindowMs: 60 * 60 * 1000, // 1 hour
  maxRequestsHour: 20, // 20 requests per hour
};

// Simple in-memory rate limiting (for production, use Redis or Vercel KV)
const rateLimitMap = new Map<string, { count: number; resetTime: number; hourCount: number; hourResetTime: number }>();

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = `rate_limit:${ip}`;
  
  let rateLimit = rateLimitMap.get(key);
  
  if (!rateLimit || now > rateLimit.resetTime) {
    // Reset minute counter
    rateLimit = {
      count: 0,
      resetTime: now + RATE_LIMIT.windowMs,
      hourCount: rateLimit?.hourCount || 0,
      hourResetTime: rateLimit?.hourResetTime || now + RATE_LIMIT.hourWindowMs,
    };
  }
  
  if (now > rateLimit.hourResetTime) {
    // Reset hour counter
    rateLimit.hourCount = 0;
    rateLimit.hourResetTime = now + RATE_LIMIT.hourWindowMs;
  }
  
  // Check limits
  if (rateLimit.count >= RATE_LIMIT.maxRequests || rateLimit.hourCount >= RATE_LIMIT.maxRequestsHour) {
    rateLimitMap.set(key, rateLimit);
    return {
      allowed: false,
      remaining: 0,
      resetTime: Math.min(rateLimit.resetTime, rateLimit.hourResetTime),
    };
  }
  
  // Increment counters
  rateLimit.count++;
  rateLimit.hourCount++;
  rateLimitMap.set(key, rateLimit);
  
  return {
    allowed: true,
    remaining: Math.min(
      RATE_LIMIT.maxRequests - rateLimit.count,
      RATE_LIMIT.maxRequestsHour - rateLimit.hourCount
    ),
    resetTime: rateLimit.resetTime,
  };
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               request.headers.get('x-real-ip') || 
               request.headers.get('cf-connecting-ip') ||
               'unknown';
    
    // Check rate limit
    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
        }, 
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': RATE_LIMIT.maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetTime.toString(),
          }
        }
      );
    }

    const { token } = await request.json()

    // Input validation
    if (!token) {
      return NextResponse.json({ error: 'Unsubscribe token is required' }, { status: 400 })
    }

    // Token format validation (should be a UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(token)) {
      return NextResponse.json({ error: 'Invalid unsubscribe token format' }, { status: 400 })
    }

    // First, get the email before deleting
    const { data: waitlistEntry, error: fetchError } = await supabase
      .from('waitlist')
      .select('email')
      .eq('unsubscribe_token', token)
      .single();

    if (fetchError || !waitlistEntry) {
      console.error('Supabase fetch error:', fetchError);
      return NextResponse.json({ error: 'Invalid unsubscribe token' }, { status: 400 });
    }

    // Record the unsubscribe
    const { error: insertError } = await supabase
      .from('unsubscribes')
      .insert([{
        email: waitlistEntry.email,
        unsubscribe_token: token,
        ip_address: ip,
        user_agent: request.headers.get('user-agent') || 'unknown'
      }]);

    if (insertError) {
      console.error('Error recording unsubscribe:', insertError);
      // Continue with deletion even if tracking fails
    }

    // Delete the email from the waitlist table using the token
    const { error } = await supabase
      .from('waitlist')
      .delete()
      .eq('unsubscribe_token', token)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      rateLimit: {
        remaining: rateLimit.remaining,
        resetTime: rateLimit.resetTime,
      }
    })
  } catch (error) {
    console.error('Unsubscribe error:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}