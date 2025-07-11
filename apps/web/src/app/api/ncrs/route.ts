import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const createNcrSchema = z.object({
  project_id: z.string().uuid(),
  lot_id: z.string().uuid().optional(),
  inspection_id: z.string().uuid().optional(),
  inspection_item_ref: z.string().optional(),
  title: z.string().min(5),
  description: z.string().min(20),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  category: z.string(),
  location: z.string().optional(),
  trade: z.string().optional(),
  assigned_to: z.string().uuid().optional(),
  contractor_id: z.string().uuid().optional(),
  due_date: z.string().optional(),
  tags: z.array(z.string()).default([]),
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
    const projectId = searchParams?.get('project_id');
    const status = searchParams?.get('status');
    const assignedTo = searchParams?.get('assigned_to');
    const severity = searchParams?.get('severity');
    const search = searchParams?.get('search');

    // Pagination parameters
    const page = parseInt(searchParams?.get('page') || '1', 10);
    const limit = parseInt(searchParams?.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json({ error: 'Invalid pagination parameters' }, { status: 400 });
    }

    // Build base query for counting
    let countQuery = supabase.from('ncrs').select('id', { count: 'exact', head: true });

    // Build data query
    let dataQuery = supabase
      .from('ncrs')
      .select(
        `
        *,
        raisedBy:users!ncrs_raised_by_fkey(id, email, full_name),
        assignedTo:users!ncrs_assigned_to_fkey(id, email, full_name),
        project:projects(id, name),
        lot:lots(id, lot_number, name)
      `
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters to both queries
    if (projectId) {
      countQuery = countQuery.eq('project_id', projectId);
      dataQuery = dataQuery.eq('project_id', projectId);
    }

    if (status) {
      countQuery = countQuery.eq('status', status);
      dataQuery = dataQuery.eq('status', status);
    }

    if (assignedTo) {
      countQuery = countQuery.eq('assigned_to', assignedTo);
      dataQuery = dataQuery.eq('assigned_to', assignedTo);
    }

    if (severity) {
      countQuery = countQuery.eq('severity', severity);
      dataQuery = dataQuery.eq('severity', severity);
    }

    if (search) {
      const searchPattern = `%${search}%`;
      countQuery = countQuery.or(
        `ncr_number.ilike.${searchPattern},title.ilike.${searchPattern},description.ilike.${searchPattern}`
      );
      dataQuery = dataQuery.or(
        `ncr_number.ilike.${searchPattern},title.ilike.${searchPattern},description.ilike.${searchPattern}`
      );
    }

    // Execute both queries in parallel
    const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);

    if (countResult.error || dataResult.error) {
      throw countResult.error || dataResult.error;
    }

    const totalCount = countResult.count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      ncrs: dataResult.data || [],
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching NCRs:', error);
    return NextResponse.json({ error: 'Failed to fetch NCRs' }, { status: 500 });
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

    const formData = await request.formData();
    const data: any = {};
    const files: File[] = [];

    // Extract form fields and files
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('evidence_')) {
        files.push(value as File);
      } else if (key === 'tags') {
        data[key] = JSON.parse(value as string);
      } else {
        data[key] = value;
      }
    }

    // Validate data
    const validatedData = createNcrSchema.parse(data);

    // Check user has permission in the project
    const { data: project } = await supabase
      .from('projects')
      .select('organization_id')
      .eq('id', validatedData.project_id)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const { data: member } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', project.organization_id)
      .single();

    if (!member) {
      return NextResponse.json(
        { error: 'You do not have permission to create NCRs in this project' },
        { status: 403 }
      );
    }

    // Generate NCR number
    const { data: ncrNumber } = await supabase.rpc('generate_ncr_number', {
      p_organization_id: project.organization_id,
    });

    // Upload evidence files if any
    const evidence: Record<string, string> = {};
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = `ncr-evidence/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('ncr-attachments')
        .upload(fileName, file);

      if (!uploadError) {
        const {
          data: { publicUrl },
        } = supabase.storage.from('ncr-attachments').getPublicUrl(fileName);
        evidence[`file_${i}`] = publicUrl;
      }
    }

    // Create NCR
    const { data: ncr, error: ncrError } = await supabase
      .from('ncrs')
      .insert({
        ...validatedData,
        organization_id: project.organization_id,
        ncr_number: ncrNumber,
        raised_by: user.id,
        evidence,
        status: 'open',
        priority: 'normal',
      })
      .select()
      .single();

    if (ncrError) {
      throw ncrError;
    }

    // Queue notifications
    if (validatedData.assigned_to) {
      await supabase.rpc('queue_notification', {
        p_type: 'ncr_assigned',
        p_entity_type: 'ncr',
        p_entity_id: ncr.id,
        p_recipient_id: validatedData.assigned_to,
        p_subject: `New NCR assigned: ${ncr.ncr_number}`,
        p_body: `You have been assigned a new NCR: "${validatedData.title}" with ${validatedData.severity} severity.`,
        p_priority: validatedData.severity === 'critical' ? 'urgent' : 'high',
      });
    }

    return NextResponse.json({
      message: 'NCR created successfully',
      ncr,
    });
  } catch (error) {
    console.error('Error creating NCR:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to create NCR' }, { status: 500 });
  }
}
