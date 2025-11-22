import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function requireAdmin() {
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

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const { data: adminData } = await supabaseAdmin
    .from('admins')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!adminData) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return { supabaseAdmin, user };
}

// GET - List all templates
export async function GET() {
  try {
    const context = await requireAdmin();
    if (context instanceof NextResponse) return context;

    const { supabaseAdmin } = context;

    const { data: templates, error } = await supabaseAdmin
      .from('email_templates')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching templates:', error);
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }

    return NextResponse.json({ templates: templates || [] });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

// POST - Create template
export async function POST(request: Request) {
  try {
    const context = await requireAdmin();
    if (context instanceof NextResponse) return context;

    const { supabaseAdmin, user } = context;
    const body = await request.json();
    const { name, subject, htmlContent, textContent } = body;

    if (!name || !subject || !htmlContent) {
      return NextResponse.json({ error: 'Name, subject, and htmlContent are required' }, { status: 400 });
    }

    const { data: template, error } = await supabaseAdmin
      .from('email_templates')
      .insert({
        name,
        subject,
        html_content: htmlContent,
        text_content: textContent || '',
        created_by: user.id,
      })
      .select()
      .single();

    if (error || !template) {
      console.error('Error creating template:', error);
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}

// PATCH - Update template
export async function PATCH(request: Request) {
  try {
    const context = await requireAdmin();
    if (context instanceof NextResponse) return context;

    const { supabaseAdmin } = context;
    const body = await request.json();
    const { id, name, subject, htmlContent, textContent } = body;

    if (!id) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
    }

    const updates: any = {
      updated_at: new Date().toISOString(),
    };
    if (name) updates.name = name;
    if (subject) updates.subject = subject;
    if (htmlContent) updates.html_content = htmlContent;
    if (textContent !== undefined) updates.text_content = textContent;

    const { data: template, error } = await supabaseAdmin
      .from('email_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error || !template) {
      console.error('Error updating template:', error);
      return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }
}

// DELETE - Delete template
export async function DELETE(request: Request) {
  try {
    const context = await requireAdmin();
    if (context instanceof NextResponse) return context;

    const { supabaseAdmin } = context;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('email_templates').delete().eq('id', id);

    if (error) {
      console.error('Error deleting template:', error);
      return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}

