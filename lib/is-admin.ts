import { createClient } from '@/lib/supabase-client';

export type AdminRole = 'super_admin' | 'admin' | 'support';

export interface AdminCheck {
  isAdmin: boolean;
  role: AdminRole | null;
  isSuperAdmin: boolean;
  isSupport: boolean;
}

/**
 * Check if a user is an admin and what role they have
 * @param userId - The user's UUID from Supabase auth
 * @returns AdminCheck object with role information
 */
export async function checkAdminStatus(userId: string | undefined): Promise<AdminCheck> {
  if (!userId) {
    return {
      isAdmin: false,
      role: null,
      isSuperAdmin: false,
      isSupport: false
    };
  }

  const supabase = createClient();
  
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('role')
      .eq('user_id', userId)
      .single();

    console.log('Admin query result:', { userId, data, error });

    if (error || !data) {
      console.log('Admin check failed:', error?.message || 'No data');
      return {
        isAdmin: false,
        role: null,
        isSuperAdmin: false,
        isSupport: false
      };
    }

    return {
      isAdmin: true,
      role: data.role as AdminRole,
      isSuperAdmin: data.role === 'super_admin',
      isSupport: data.role === 'support'
    };
  } catch (error) {
    console.error('Error checking admin status:', error);
    return {
      isAdmin: false,
      role: null,
      isSuperAdmin: false,
      isSupport: false
    };
  }
}

/**
 * Check if user has permission for a specific action
 */
export function hasPermission(adminCheck: AdminCheck, permission: string): boolean {
  if (!adminCheck.isAdmin) return false;
  
  // Super admin can do everything
  if (adminCheck.isSuperAdmin) return true;
  
  // Define permissions for each role
  const permissions: Record<AdminRole, string[]> = {
    super_admin: ['*'], // All permissions
    admin: [
      'view_dashboard',
      'view_users',
      'edit_users',
      'view_analyses',
      'view_costs',
      'view_analytics',
      'manage_waitlist'
    ],
    support: [
      'view_dashboard',
      'view_users',
      'view_analyses'
    ]
  };
  
  if (!adminCheck.role) return false;
  
  const rolePermissions = permissions[adminCheck.role];
  return rolePermissions.includes('*') || rolePermissions.includes(permission);
}

