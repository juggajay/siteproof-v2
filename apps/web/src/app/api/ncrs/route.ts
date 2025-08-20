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

    // Build data query - simplified without joins for now
    let dataQuery = supabase
      .from('ncrs')
      .select('*')
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

    // Fetch related data for NCRs if any exist
    const ncrs = dataResult.data || [];
    if (ncrs.length > 0) {
      // Get unique IDs
      const projectIds = [...new Set(ncrs.map((n) => n.project_id).filter(Boolean))];
      const userIds = [
        ...new Set([
          ...ncrs.map((n) => n.raised_by).filter(Boolean),
          ...ncrs.map((n) => n.assigned_to).filter(Boolean),
        ]),
      ];

      // Fetch related data in parallel
      const [projectsResult, usersResult] = await Promise.all([
        projectIds.length > 0
          ? supabase.from('projects').select('id, name').in('id', projectIds)
          : { data: [] },
        userIds.length > 0
          ? supabase.from('users').select('id, email, full_name').in('id', userIds)
          : { data: [] },
      ]);

      const projectsMap = new Map((projectsResult.data || []).map((p) => [p.id, p]));
      const usersMap = new Map((usersResult.data || []).map((u) => [u.id, u]));

      // Attach related data to NCRs
      ncrs.forEach((ncr) => {
        ncr.project = projectsMap.get(ncr.project_id) || null;
        ncr.raisedBy = usersMap.get(ncr.raised_by) || null;
        ncr.assignedTo = usersMap.get(ncr.assigned_to) || null;
      });
    }

    return NextResponse.json({
      ncrs,
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
    
    // Provide more detailed error information in development
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = {
      error: 'Failed to fetch NCRs',
      message: errorMessage,
      // Include more details in development
      ...(process.env.NODE_ENV === 'development' && {
        stack: error instanceof Error ? error.stack : undefined,
        details: error
      })
    };
    
    return NextResponse.json(errorDetails, { status: 500 });
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
        // Convert empty strings to undefined for optional UUID fields
        const strValue = value as string;
        if (
          (key === 'lot_id' ||
            key === 'assigned_to' ||
            key === 'contractor_id' ||
            key === 'inspection_id' ||
            key === 'location' ||
            key === 'trade' ||
            key === 'due_date') &&
          strValue === ''
        ) {
          // Don't add to data object if empty string
          continue;
        }
        data[key] = strValue;
      }
    }

    // Validate data
    const validatedData = createNcrSchema.parse(data);

    // Remove any empty string values that might have passed validation
    // This ensures we don't try to insert empty strings as UUID references
    Object.keys(validatedData).forEach((key) => {
      if ((validatedData as any)[key] === '') {
        delete (validatedData as any)[key];
      }
    });

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
    // Count existing NCRs for this organization to generate sequential number
    const { count } = await supabase
      .from('ncrs')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', project.organization_id);

    const sequenceNumber = (count || 0) + 1;
    const ncrNumber = `NCR-${new Date().getFullYear()}-${String(sequenceNumber).padStart(4, '0')}`;

    // Upload evidence files if any
    const evidence: Record<string, string> = {};
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = `ncr-evidence/${Date.now()}-${file.name}`;
      
      try {
        const { error: uploadError } = await supabase.storage
          .from('ncr-attachments')
          .upload(fileName, file);

        if (uploadError) {
          console.error(`Failed to upload file ${file.name}:`, uploadError);
          // Skip this file but continue with NCR creation
          // You might want to create the bucket if it doesn't exist
          if (uploadError.message?.includes('bucket') || uploadError.message?.includes('not found')) {
            console.error('Storage bucket "ncr-attachments" may not exist. Please create it in Supabase.');
          }
        } else {
          const {
            data: { publicUrl },
          } = supabase.storage.from('ncr-attachments').getPublicUrl(fileName);
          evidence[`file_${i}`] = publicUrl;
        }
      } catch (err) {
        console.error(`Error handling file upload for ${file.name}:`, err);
        // Continue without this file
      }
    }

    // Create NCR
    const ncrData = {
      ...validatedData,
      organization_id: project.organization_id,
      ncr_number: ncrNumber,
      raised_by: user.id,
      evidence,
      status: 'open',
      priority: 'normal',
    };

    // Debug logging for production issues
    if (ncrData.contractor_id === '') {
      console.error('Warning: contractor_id is empty string, removing it');
      delete ncrData.contractor_id;
    }
    if (ncrData.assigned_to === '') {
      console.error('Warning: assigned_to is empty string, removing it');
      delete ncrData.assigned_to;
    }

    const { data: ncr, error: ncrError } = await supabase
      .from('ncrs')
      .insert(ncrData)
      .select()
      .single();

    if (ncrError) {
      throw ncrError;
    }

    // Create notification for assigned user (if any)
    if (validatedData.assigned_to) {
      // For now, we'll skip notifications until the notification system is set up
      // In the future, this would create a notification record
      console.log(
        `Notification would be sent to user ${validatedData.assigned_to} for NCR ${ncr.ncr_number}`
      );
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

    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = {
      error: 'Failed to create NCR',
      message: errorMessage,
      // Include more details in development
      ...(process.env.NODE_ENV === 'development' && {
        stack: error instanceof Error ? error.stack : undefined,
        details: error
      })
    };
    
    return NextResponse.json(errorDetails, { status: 500 });
  }
}
