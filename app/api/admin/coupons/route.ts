import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient as createAdminClient } from '@supabase/supabase-js';

async function requireAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    throw new Error('Supabase environment variables are not fully configured');
  }

  const cookieStore = await cookies();
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

  const supabaseAdmin = createAdminClient(supabaseUrl, serviceRoleKey);

  const { data: adminData, error: adminError } = await supabaseAdmin
    .from('admins')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (adminError) {
    console.error('Error checking admin status (coupons):', adminError);
    return NextResponse.json(
      { error: 'Failed to verify admin status', message: adminError.message },
      { status: 500 }
    );
  }

  if (!adminData) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return { user, supabaseAdmin };
}

export async function GET() {
  try {
    const adminContext = await requireAdmin();
    if (adminContext instanceof Response) return adminContext;

    const { supabaseAdmin } = adminContext;

    const { data, error } = await supabaseAdmin
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching coupons:', error);
      return NextResponse.json(
        { error: 'Failed to fetch coupons', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ coupons: data || [] });
  } catch (error) {
    console.error('Error in GET /api/admin/coupons:', error);
    return NextResponse.json(
      { error: 'Unexpected error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const adminContext = await requireAdmin();
    if (adminContext instanceof Response) return adminContext;

    const { user, supabaseAdmin } = adminContext;

    const body = await request.json();
    const {
      code,
      discountType,
      discountValue,
      freePlanId,
      maxUses,
      validFrom,
      validUntil,
      description,
      stripeCouponId,
      stripePromotionCode,
    } = body;

    if (!code || !discountType) {
      return NextResponse.json(
        { error: 'Missing required fields', message: 'code and discountType are required' },
        { status: 400 }
      );
    }

    if (!['percentage', 'fixed_amount', 'free_plan'].includes(discountType)) {
      return NextResponse.json(
        { error: 'Invalid discountType', message: 'Must be percentage, fixed_amount, or free_plan' },
        { status: 400 }
      );
    }

    const payload: any = {
      code: String(code).trim().toUpperCase(),
      discount_type: discountType,
      discount_value: discountType === 'free_plan' ? null : discountValue ?? null,
      free_plan_id: discountType === 'free_plan' ? freePlanId ?? null : null,
      max_uses: maxUses ?? null,
      valid_from: validFrom ? new Date(validFrom).toISOString() : new Date().toISOString(),
      valid_until: validUntil ? new Date(validUntil).toISOString() : null,
      description: description ?? null,
      stripe_coupon_id: stripeCouponId ?? null,
      stripe_promotion_code: stripePromotionCode ?? null,
      created_by: user.id,
    };

    const { data, error } = await supabaseAdmin
      .from('coupons')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Error creating coupon:', error);
      return NextResponse.json(
        { error: 'Failed to create coupon', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ coupon: data }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/coupons:', error);
    return NextResponse.json(
      { error: 'Unexpected error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


