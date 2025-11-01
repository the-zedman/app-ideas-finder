import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// GET - List all admins
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
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
    
    // Verify user is super admin
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    
    const { data: adminData } = await supabaseAdmin
      .from('admins')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (!adminData || adminData.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }
    
    // Fetch all admins
    const { data: admins } = await supabaseAdmin
      .from('admins')
      .select('*')
      .order('created_at', { ascending: false });
    
    // Get auth users and profiles
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, email');
    
    const authUserMap = new Map();
    authUsers?.users.forEach(u => authUserMap.set(u.id, u));
    
    const profileMap = new Map();
    profiles?.forEach(p => profileMap.set(p.id, p));
    
    // Enrich admin data
    const enrichedAdmins = admins?.map(admin => {
      const authUser = authUserMap.get(admin.user_id);
      const profile = profileMap.get(admin.user_id);
      const createdByUser = authUserMap.get(admin.created_by);
      
      const firstName = profile?.first_name || '';
      const lastName = profile?.last_name || '';
      const fullName = `${firstName} ${lastName}`.trim();
      const displayName = fullName || authUser?.email?.split('@')[0] || 'Unknown';
      
      return {
        ...admin,
        name: displayName,
        email: authUser?.email || 'unknown@email.com',
        created_by_email: createdByUser?.email || null
      };
    });
    
    return NextResponse.json({
      admins: enrichedAdmins || [],
      currentUserId: user.id
    });
    
  } catch (error) {
    console.error('Error fetching admins:', error);
    return NextResponse.json({
      error: 'Failed to fetch admins',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST - Add new admin
export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
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
    
    // Verify user is super admin
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    
    const { data: adminData } = await supabaseAdmin
      .from('admins')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (!adminData || adminData.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }
    
    // Get request body
    const body = await request.json();
    const { email, role } = body;
    
    if (!email || !role) {
      return NextResponse.json({ error: 'Email and role required' }, { status: 400 });
    }
    
    if (!['admin', 'support'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role. Must be admin or support' }, { status: 400 });
    }
    
    // Find user by email
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    const targetUser = authUsers?.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found with that email' }, { status: 404 });
    }
    
    // Check if already an admin
    const { data: existingAdmin } = await supabaseAdmin
      .from('admins')
      .select('role')
      .eq('user_id', targetUser.id)
      .maybeSingle();
    
    if (existingAdmin) {
      return NextResponse.json({ error: 'User is already an admin' }, { status: 400 });
    }
    
    // Insert new admin
    const { error } = await supabaseAdmin
      .from('admins')
      .insert({
        user_id: targetUser.id,
        role: role,
        created_by: user.id
      });
    
    if (error) {
      return NextResponse.json({ error: 'Failed to add admin', message: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to add admin',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE - Remove admin
export async function DELETE(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
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
    
    // Verify user is super admin
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    
    const { data: adminData } = await supabaseAdmin
      .from('admins')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (!adminData || adminData.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }
    
    // Get target user ID
    const body = await request.json();
    const { userId } = body;
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }
    
    // Cannot remove yourself
    if (userId === user.id) {
      return NextResponse.json({ error: 'Cannot remove yourself as admin' }, { status: 400 });
    }
    
    // Check target user's role
    const { data: targetAdmin } = await supabaseAdmin
      .from('admins')
      .select('role')
      .eq('user_id', userId)
      .single();
    
    // Cannot remove other super admins
    if (targetAdmin?.role === 'super_admin') {
      return NextResponse.json({ error: 'Cannot remove super admin. Demote to admin first.' }, { status: 400 });
    }
    
    // Delete admin
    const { error } = await supabaseAdmin
      .from('admins')
      .delete()
      .eq('user_id', userId);
    
    if (error) {
      return NextResponse.json({ error: 'Failed to remove admin', message: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to remove admin',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PATCH - Update admin role
export async function PATCH(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
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
    
    // Verify user is super admin
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    
    const { data: adminData } = await supabaseAdmin
      .from('admins')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (!adminData || adminData.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }
    
    // Get request body
    const body = await request.json();
    const { userId, newRole } = body;
    
    if (!userId || !newRole) {
      return NextResponse.json({ error: 'User ID and new role required' }, { status: 400 });
    }
    
    if (!['super_admin', 'admin', 'support'].includes(newRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }
    
    // Cannot change your own role
    if (userId === user.id) {
      return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 });
    }
    
    // Update role
    const { error } = await supabaseAdmin
      .from('admins')
      .update({ role: newRole })
      .eq('user_id', userId);
    
    if (error) {
      return NextResponse.json({ error: 'Failed to update role', message: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to update role',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

