import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import type { DailyDiary, Project, User } from '@siteproof/database';

const createDiarySchema = z.object({
  project_id: z.string().uuid(),
  diary_date: z.string(),
  weather: z.any().optional(),
  weather_conditions: z.string().optional(),
  temperature_min: z.number().optional(),
  temperature_max: z.number().optional(),
  wind_conditions: z.string().optional(),
  site_conditions: z.string().optional(),
  work_areas: z.array(z.string()).default([]),
  access_issues: z.string().optional(),
  work_summary: z.string().min(10),
  trades_on_site: z.array(z.any()).default([]),
  total_workers: z.number().min(0).default(0),
  key_personnel: z.array(z.any()).default([]),
  equipment_on_site: z.array(z.any()).default([]),
  material_deliveries: z.array(z.any()).default([]),
  delays: z.array(z.any()).default([]),
  safety_incidents: z.array(z.any()).default([]),
  inspections: z.array(z.any()).default([]),
  visitors: z.array(z.any()).default([]),
  milestones_achieved: z.array(z.string()).default([]),
  general_notes: z.string().optional(),
  tomorrow_planned_work: z.string().optional(),
  notes_for_tomorrow: z.string().optional(),
  // New fields for cost tracking
  labour_entries: z.array(z.any()).optional(),
  plant_entries: z.array(z.any()).optional(),
  material_entries: z.array(z.any()).optional(),
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

    // Get user's role
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams?.get('project_id');
    const startDate = searchParams?.get('start_date');
    const endDate = searchParams?.get('end_date');
    const page = parseInt(searchParams?.get('page') || '1');
    const limit = parseInt(searchParams?.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Check if user has financial access (still needed for filtering financial data)
    const hasFinancialAccess = ['owner', 'admin', 'finance_manager', 'accountant'].includes(
      member.role
    );

    // Build query - removed daily_workforce_costs until it's properly set up
    const selectString = `
        *,
        project:projects(id, name, client_name),
        createdBy:users!daily_diaries_created_by_fkey(id, email, full_name),
        approvedBy:users!daily_diaries_approved_by_fkey(id, email, full_name)
      `;

    // Build count query
    let countQuery = supabase
      .from('daily_diaries')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', member.organization_id);

    // Build data query
    let dataQuery = supabase
      .from('daily_diaries')
      .select(selectString)
      .eq('organization_id', member.organization_id)
      .order('diary_date', { ascending: false });

    // Apply filters to both queries
    if (projectId) {
      countQuery = countQuery.eq('project_id', projectId);
      dataQuery = dataQuery.eq('project_id', projectId);
    }

    if (startDate) {
      countQuery = countQuery.gte('diary_date', startDate);
      dataQuery = dataQuery.gte('diary_date', startDate);
    }

    if (endDate) {
      countQuery = countQuery.lte('diary_date', endDate);
      dataQuery = dataQuery.lte('diary_date', endDate);
    }

    // Type definition for the diary with joined data
    type DiaryWithRelations = DailyDiary & {
      project?: Pick<Project, 'id' | 'name' | 'client_name'>;
      createdBy?: Pick<User, 'id' | 'email' | 'full_name'>;
      approvedBy?: Pick<User, 'id' | 'email' | 'full_name'>;
      daily_workforce_costs?: Array<{
        workforce_costs: any;
        total_daily_cost: number;
      }>;
    };

    // Execute queries in parallel
    const [countResult, dataResult] = await Promise.all([
      countQuery,
      dataQuery.range(offset, offset + limit - 1),
    ]);

    const { count, error: countError } = countResult;
    const { data: diaries, error: dataError } = dataResult as {
      data: DiaryWithRelations[] | null;
      error: any;
    };

    if (countError || dataError) {
      throw countError || dataError;
    }

    // Filter out financial data from trades if user doesn't have access
    const processedDiaries = diaries?.map((diary) => {
      if (!hasFinancialAccess && diary.trades_on_site) {
        return {
          ...diary,
          trades_on_site: diary.trades_on_site.map((trade: any) => ({
            ...trade,
            hourly_rate: undefined,
            daily_rate: undefined,
            total_cost: undefined,
          })),
          daily_workforce_costs: undefined,
        };
      }
      return diary;
    });

    // Calculate pagination metadata
    const totalPages = count ? Math.ceil(count / limit) : 0;
    const hasMore = page < totalPages;

    return NextResponse.json({
      diaries: processedDiaries,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasMore,
      },
    });
  } catch (error) {
    console.error('Error fetching diaries:', error);
    return NextResponse.json({ error: 'Failed to fetch diaries' }, { status: 500 });
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
    const validatedData = createDiarySchema.parse(body);

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

    if (!member || !['owner', 'admin', 'member'].includes(member.role)) {
      return NextResponse.json(
        { error: 'You do not have permission to create diaries in this project' },
        { status: 403 }
      );
    }

    // Check if diary already exists for this date
    const { data: existingDiary } = await supabase
      .from('daily_diaries')
      .select('id')
      .eq('project_id', validatedData.project_id)
      .eq('diary_date', validatedData.diary_date)
      .single();

    if (existingDiary) {
      return NextResponse.json({ error: 'A diary already exists for this date' }, { status: 400 });
    }

    // Generate diary number (fallback if RPC doesn't exist)
    let diaryNumber: string;
    try {
      const { data: rpcNumber, error: rpcError } = await supabase.rpc('generate_diary_number', {
        p_project_id: validatedData.project_id,
        p_diary_date: validatedData.diary_date,
      });
      
      if (rpcError) {
        // Fallback: Generate diary number manually
        const dateStr = validatedData.diary_date.replace(/-/g, '');
        const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        diaryNumber = `DD-${dateStr}-${randomSuffix}`;
      } else {
        diaryNumber = rpcNumber;
      }
    } catch (error) {
      // Fallback: Generate diary number manually
      const dateStr = validatedData.diary_date.replace(/-/g, '');
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      diaryNumber = `DD-${dateStr}-${randomSuffix}`;
    }

    // Create diary (exclude the entry arrays from main diary)
    const { 
      labour_entries, 
      plant_entries, 
      material_entries,
      weather_conditions,
      temperature_min,
      temperature_max,
      wind_conditions,
      ...diaryData 
    } = validatedData;

    // Build weather object if weather fields are provided
    let weatherData = diaryData.weather;
    if (weather_conditions || temperature_min || temperature_max || wind_conditions) {
      weatherData = {
        conditions: weather_conditions,
        temperature: {
          min: temperature_min,
          max: temperature_max
        },
        wind: wind_conditions
      };
    }

    // Calculate total workers from labour entries if not provided
    const totalWorkers = diaryData.total_workers || 
      (labour_entries ? labour_entries.reduce((sum: number, entry: any) => 
        sum + (entry.workers || 1), 0) : 0);

    const { data: diary, error: diaryError } = await supabase
      .from('daily_diaries')
      .insert({
        ...diaryData,
        weather: weatherData,
        total_workers: totalWorkers,
        organization_id: project.organization_id,
        diary_number: diaryNumber,
        created_by: user.id,
      })
      .select()
      .single();

    if (diaryError) {
      throw diaryError;
    }

    // Insert labour entries if provided
    if (labour_entries && labour_entries.length > 0) {
      // First try with all fields, then fallback to basic fields if it fails
      const labourData = labour_entries.map((entry: any) => ({
        diary_id: diary.id,
        employee_id: entry.employee_id || null,
        trade: entry.trade || '',
        company_id: entry.company_id || null,
        // These fields might not exist if migration hasn't been run
        worker_name: entry.worker_name || '',
        company: entry.company || '',
        workers: entry.workers || 1,
        start_time: entry.start_time || null,
        end_time: entry.end_time || null,
        break_duration: entry.break_duration ? `${entry.break_duration} minutes` : null,
        total_hours: entry.total_hours || 0,
        overtime_hours: entry.overtime_hours || 0,
        standard_rate: entry.standard_rate || null,
        overtime_rate: entry.overtime_rate || null,
        total_cost: entry.total_cost || null,
        work_performed: entry.work_performed || '',
        location: entry.location || null,
        created_by: user.id,
      }));

      const { data: insertedLabour, error: labourError } = await supabase
        .from('diary_labour_entries')
        .insert(labourData)
        .select();

      if (labourError) {
        console.error('Error inserting labour entries with new fields:', labourError);
        
        // Try fallback with only basic fields if new columns don't exist
        const basicLabourData = labour_entries.map((entry: any) => ({
          diary_id: diary.id,
          employee_id: entry.employee_id || null,
          trade: entry.trade || '',
          company_id: entry.company_id || null,
          start_time: entry.start_time || null,
          end_time: entry.end_time || null,
          break_duration: entry.break_duration ? `${entry.break_duration} minutes` : null,
          total_hours: entry.total_hours || 0,
          overtime_hours: entry.overtime_hours || 0,
          standard_rate: entry.standard_rate || null,
          overtime_rate: entry.overtime_rate || null,
          total_cost: entry.total_cost || null,
          work_performed: entry.work_performed || '',
          location: entry.location || null,
          created_by: user.id,
        }));
        
        const { data: fallbackLabour, error: fallbackError } = await supabase
          .from('diary_labour_entries')
          .insert(basicLabourData)
          .select();
          
        if (fallbackError) {
          console.error('Error inserting labour entries with basic fields:', fallbackError);
          console.error('Labour data that failed:', basicLabourData);
        } else {
          console.log(`Successfully inserted ${fallbackLabour?.length || 0} labour entries with basic fields`);
        }
      } else {
        console.log(`Successfully inserted ${insertedLabour?.length || 0} labour entries`);
      }
    }

    // Insert plant entries if provided
    if (plant_entries && plant_entries.length > 0) {
      const plantData = plant_entries.map((entry: any) => ({
        diary_id: diary.id,
        equipment_id: entry.equipment_id || null,
        equipment_name: entry.equipment_name || entry.name || '',
        name: entry.name || '',
        type: entry.type || '',
        quantity: entry.quantity || 1,
        supplier_id: entry.supplier_id || null,
        start_time: entry.start_time || null,
        end_time: entry.end_time || null,
        total_hours: entry.total_hours || entry.hours_used || null,
        hours_used: entry.hours_used || entry.total_hours || null,
        operator_id: entry.operator_id || null,
        operator_name: entry.operator_name || null,
        hourly_rate: entry.hourly_rate || null,
        fuel_cost: entry.fuel_cost || null,
        total_cost: entry.total_cost || null,
        work_performed: entry.work_performed || '',
        location: entry.location || null,
        notes: entry.notes || null,
        created_by: user.id,
      }));

      const { error: plantError } = await supabase.from('diary_plant_entries').insert(plantData);

      if (plantError) {
        console.error('Error inserting plant entries:', plantError);
      }
    }

    // Insert material entries if provided
    if (material_entries && material_entries.length > 0) {
      const materialData = material_entries.map((entry: any) => ({
        diary_id: diary.id,
        material_id: entry.material_id || null,
        material_name: entry.material_name || entry.name || '',
        name: entry.name || '',
        supplier_id: entry.supplier_id || null,
        supplier: entry.supplier || '',
        quantity: entry.quantity || 0,
        unit_of_measure: entry.unit_of_measure || entry.unit || '',
        unit: entry.unit || entry.unit_of_measure || '',
        unit_cost: entry.unit_cost || null,
        total_cost: entry.total_cost || null,
        delivery_time: entry.delivery_time || null,
        delivery_location: entry.delivery_location || null,
        delivery_note: entry.delivery_note || null,
        docket_number: entry.docket_number || null,
        notes: entry.notes || null,
        created_by: user.id,
      }));

      const { error: materialError } = await supabase
        .from('diary_material_entries')
        .insert(materialData);

      if (materialError) {
        console.error('Error inserting material entries:', materialError);
      }
    }

    return NextResponse.json({
      message: 'Daily diary created successfully',
      diary,
    });
  } catch (error) {
    console.error('Error creating diary:', error);

    if (error instanceof z.ZodError) {
      console.error('Validation errors:', error.errors);
      return NextResponse.json({ 
        error: 'Invalid input', 
        details: error.errors,
        message: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      }, { status: 400 });
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      error: 'Failed to create diary',
      message: errorMessage 
    }, { status: 500 });
  }
}
