import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Schema for template fields
const fieldSchema = z.object({
  id: z.string(),
  type: z.enum(['text', 'textarea', 'number', 'checkbox', 'select', 'date', 'signature', 'photo']),
  label: z.string(),
  required: z.boolean().default(false),
  placeholder: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  options: z.array(z.string()).optional(),
  raise_ncr_on_fail: z.boolean().optional(),
  validation: z
    .object({
      pattern: z.string().optional(),
      message: z.string().optional(),
    })
    .optional(),
});

const sectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  items: z.array(fieldSchema),
});

const createTemplateSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  category: z.string().optional(),
  structure: z.object({
    sections: z.array(sectionSchema),
  }),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const category = searchParams?.get('category');
    const isActive = searchParams?.get('is_active');

    // Get user's organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'User not part of any organization' }, { status: 403 });
    }

    // Build query
    let query = supabase
      .from('itp_templates')
      .select('*')
      .eq('organization_id', membership.organization_id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true');
    }

    const { data: templates, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ templates: templates || [] });
  } catch (error) {
    console.error('Error fetching ITP templates:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate input
    const validationResult = createTemplateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Get user's organization and check permissions
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'User not part of any organization' }, { status: 403 });
    }

    // Only admin and owner can create templates
    if (membership.role !== 'admin' && membership.role !== 'owner') {
      return NextResponse.json({ error: 'Only admins can create templates' }, { status: 403 });
    }

    // Check for duplicate template name
    const { data: existing } = await supabase
      .from('itp_templates')
      .select('id')
      .eq('organization_id', membership.organization_id)
      .eq('name', data.name)
      .is('deleted_at', null)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'A template with this name already exists' },
        { status: 400 }
      );
    }

    // Create the template
    const { data: template, error: createError } = await supabase
      .from('itp_templates')
      .insert({
        organization_id: membership.organization_id,
        name: data.name,
        description: data.description,
        category: data.category,
        structure: data.structure,
        is_active: true,
        version: 1,
        usage_count: 0,
        created_by: user.id,
      })
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    return NextResponse.json({
      message: 'Template created successfully',
      template,
    });
  } catch (error) {
    console.error('Error creating ITP template:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}
