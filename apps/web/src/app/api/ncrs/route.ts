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
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('project_id');
    const status = searchParams.get('status');
    const assignedTo = searchParams.get('assigned_to');
    const severity = searchParams.get('severity');

    let query = supabase
      .from('ncrs')
      .select(`
        *,
        raisedBy:users!ncrs_raised_by_fkey(id, email, full_name),
        assignedTo:users!ncrs_assigned_to_fkey(id, email, full_name),
        project:projects(id, name),
        lot:lots(id, lot_number, name)
      `)
      .order('created_at', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (assignedTo) {
      query = query.eq('assigned_to', assignedTo);
    }

    if (severity) {
      query = query.eq('severity', severity);
    }

    const { data: ncrs, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ ncrs });
  } catch (error) {
    console.error('Error fetching NCRs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch NCRs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
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
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
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
    const { data: ncrNumber } = await supabase
      .rpc('generate_ncr_number', { p_organization_id: project.organization_id });

    // Upload evidence files if any
    const evidence: Record<string, string> = {};
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = `ncr-evidence/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('ncr-attachments')
        .upload(fileName, file);

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('ncr-attachments')
          .getPublicUrl(fileName);
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
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create NCR' },
      { status: 500 }
    );
  }
}