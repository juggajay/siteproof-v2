import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// NCR validation schema - matching database constraints
const ncrSchema = z.object({
  project_id: z.string().uuid('Invalid project ID'),
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().min(1, 'Description is required'),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  category: z.string().min(1, 'Category is required').max(100),
  location: z.string().max(255).optional().nullable(),
  trade: z.string().max(100).optional().nullable(),
  tags: z.array(z.string()).optional().default([]),

  // Optional UUID fields - must be valid UUID or null/undefined
  lot_id: z.string().uuid().optional().nullable(),
  inspection_id: z.string().uuid().optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
  contractor_id: z.string().uuid().optional().nullable(),

  // Optional fields
  due_date: z.string().optional().nullable(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional().default('normal'),
  inspection_item_ref: z.string().max(255).optional().nullable(),
  estimated_cost: z.number().optional().nullable(),
  cost_notes: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (!user || authError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('project_id');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('ncrs')
      .select(
        `
        *,
        raised_by_user:users!ncrs_raised_by_fkey(id, email, display_name),
        assigned_to_user:users!ncrs_assigned_to_fkey(id, email, display_name),
        contractor:organizations!ncrs_contractor_id_fkey(id, name),
        project:projects!ncrs_project_id_fkey(id, name)
      `
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: ncrs, error } = await query;

    if (error) {
      console.error('Error fetching NCRs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch NCRs', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: ncrs || [] });
  } catch (error) {
    console.error('NCR GET error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (!user || authError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const rawData: Record<string, any> = {};

    // Process form data entries
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        // Handle file uploads separately
        continue;
      }

      const strValue = value.toString().trim();

      // Handle empty strings - convert to null for optional fields
      if (strValue === '' || strValue === 'undefined' || strValue === 'null') {
        // For optional UUID fields, set to null
        if (['lot_id', 'inspection_id', 'assigned_to', 'contractor_id'].includes(key)) {
          rawData[key] = null;
        }
        // For other optional fields, set to null
        else if (
          ['location', 'trade', 'due_date', 'inspection_item_ref', 'cost_notes'].includes(key)
        ) {
          rawData[key] = null;
        }
        // Skip if it's not a known field
        continue;
      }

      // Parse JSON strings
      if (key === 'tags' && strValue.startsWith('[')) {
        try {
          rawData[key] = JSON.parse(strValue);
        } catch {
          rawData[key] = [];
        }
      }
      // Parse numbers
      else if (key === 'estimated_cost' && strValue) {
        rawData[key] = parseFloat(strValue) || null;
      }
      // Regular fields
      else {
        rawData[key] = strValue;
      }
    }

    // Validate the data
    const validationResult = ncrSchema.safeParse(rawData);

    if (!validationResult.success) {
      console.error('Validation errors:', validationResult.error.errors);
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;

    // Get project and organization details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, organization_id')
      .eq('id', validatedData.project_id)
      .single();

    if (!project || projectError) {
      return NextResponse.json(
        { error: 'Project not found', details: projectError?.message },
        { status: 404 }
      );
    }

    // Check user has access to this project
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', project.organization_id)
      .single();

    if (!member || memberError) {
      return NextResponse.json(
        { error: 'You do not have access to this project' },
        { status: 403 }
      );
    }

    // Generate NCR number - use simple timestamp-based generation
    const timestamp = Date.now();
    const ncrNumber = `NCR-${new Date().getFullYear()}-${timestamp}`;

    // Prepare NCR data
    const ncrData = {
      ...validatedData,
      organization_id: project.organization_id,
      ncr_number: ncrNumber,
      raised_by: user.id,
      status: 'open',
      evidence: {},
      metadata: {
        created_via: 'web_app',
        user_agent: request.headers.get('user-agent') || 'unknown',
      },
    };

    // Clean up null values for optional UUID fields
    if (ncrData.lot_id === null) delete ncrData.lot_id;
    if (ncrData.inspection_id === null) delete ncrData.inspection_id;
    if (ncrData.assigned_to === null) delete ncrData.assigned_to;
    if (ncrData.contractor_id === null) delete ncrData.contractor_id;

    // Insert NCR
    const { data: newNcr, error: insertError } = await supabase
      .from('ncrs')
      .insert(ncrData)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating NCR:', insertError);
      return NextResponse.json(
        { error: 'Failed to create NCR', details: insertError.message },
        { status: 500 }
      );
    }

    // Handle file uploads if any
    const files = formData.getAll('files') as File[];
    if (files.length > 0) {
      const uploadPromises = files.map(async (file) => {
        const fileName = `${newNcr.id}/${Date.now()}-${file.name}`;
        const { data: upload, error: uploadError } = await supabase.storage
          .from('ncr-attachments')
          .upload(fileName, file);

        if (uploadError) {
          console.error('File upload error:', uploadError);
        }
        return upload;
      });

      const uploads = await Promise.all(uploadPromises);

      // Update NCR with file references
      if (uploads.some((u) => u)) {
        const fileRefs = uploads.filter((u) => u).map((u) => u!.path);
        await supabase
          .from('ncrs')
          .update({
            evidence: {
              ...newNcr.evidence,
              attachments: fileRefs,
            },
          })
          .eq('id', newNcr.id);
      }
    }

    // Queue notifications if assigned
    if (ncrData.assigned_to && ncrData.assigned_to !== user.id) {
      await supabase.rpc('queue_notification', {
        p_type: 'ncr_assigned',
        p_entity_type: 'ncr',
        p_entity_id: newNcr.id,
        p_recipient_id: ncrData.assigned_to,
        p_subject: `New NCR Assigned: ${ncrData.title}`,
        p_body: `You have been assigned to NCR ${ncrNumber}: ${ncrData.title}`,
        p_data: { ncr_id: newNcr.id, project_id: project.id },
        p_priority: ncrData.severity === 'critical' ? 'high' : 'normal',
      });
    }

    return NextResponse.json({ data: newNcr }, { status: 201 });
  } catch (error) {
    console.error('NCR POST error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack:
          process.env.NODE_ENV === 'development' && error instanceof Error
            ? error.stack
            : undefined,
      },
      { status: 500 }
    );
  }
}
