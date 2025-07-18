import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Debug endpoint to test ITP operations step by step
export async function GET(_request: NextRequest) {
  const results: any = {
    timestamp: new Date().toISOString(),
    tests: [],
  };

  try {
    const supabase = await createClient();

    // Test 1: Check user authentication
    results.tests.push({ test: 'user_auth', status: 'running' });
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      results.tests[results.tests.length - 1] = {
        test: 'user_auth',
        status: 'error',
        error: userError.message,
      };
      return NextResponse.json(results);
    }

    if (!user) {
      results.tests[results.tests.length - 1] = {
        test: 'user_auth',
        status: 'unauthorized',
        message: 'No authenticated user',
      };
      return NextResponse.json(results);
    }

    results.tests[results.tests.length - 1] = {
      test: 'user_auth',
      status: 'success',
      user_id: user.id,
    };

    // Test 2: Check template access
    results.tests.push({ test: 'template_access', status: 'running' });
    const { data: templates, error: templatesError } = await supabase
      .from('itp_templates')
      .select('id, name, structure, organization_id')
      .limit(3);

    if (templatesError) {
      results.tests[results.tests.length - 1] = {
        test: 'template_access',
        status: 'error',
        error: templatesError.message,
        details: templatesError,
      };
    } else {
      results.tests[results.tests.length - 1] = {
        test: 'template_access',
        status: 'success',
        count: templates?.length || 0,
        sample: templates?.[0]
          ? {
              id: templates[0].id,
              name: templates[0].name,
              has_structure: !!templates[0].structure,
            }
          : null,
      };
    }

    // Test 3: Check specific lot access
    const lotId = 'f497f453-fb01-49fe-967a-3182a61a5a1b';
    const projectId = '89253127-a60a-48a7-a511-ce89c316d3af';

    results.tests.push({ test: 'lot_access', status: 'running' });
    const { data: lot, error: lotError } = await supabase
      .from('lots')
      .select(
        `
        id,
        project_id,
        projects!inner(
          id,
          organization_id
        )
      `
      )
      .eq('id', lotId)
      .eq('project_id', projectId)
      .single();

    if (lotError) {
      results.tests[results.tests.length - 1] = {
        test: 'lot_access',
        status: 'error',
        error: lotError.message,
        details: lotError,
      };
    } else if (!lot) {
      results.tests[results.tests.length - 1] = {
        test: 'lot_access',
        status: 'not_found',
        lotId,
        projectId,
      };
    } else {
      results.tests[results.tests.length - 1] = {
        test: 'lot_access',
        status: 'success',
        lot_id: lot.id,
        organization_id: (lot.projects as any)?.organization_id,
      };

      // Test 4: Check organization membership
      results.tests.push({ test: 'org_membership', status: 'running' });
      const { data: membership, error: membershipError } = await supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', (lot.projects as any).organization_id)
        .eq('user_id', user.id)
        .single();

      if (membershipError) {
        results.tests[results.tests.length - 1] = {
          test: 'org_membership',
          status: 'error',
          error: membershipError.message,
          details: membershipError,
        };
      } else if (!membership) {
        results.tests[results.tests.length - 1] = {
          test: 'org_membership',
          status: 'not_found',
          user_id: user.id,
          organization_id: (lot.projects as any).organization_id,
        };
      } else {
        results.tests[results.tests.length - 1] = {
          test: 'org_membership',
          status: 'success',
          role: membership.role,
        };

        // Test 5: Check ITP instances query
        results.tests.push({ test: 'itp_instances', status: 'running' });
        const { data: instances, error: instancesError } = await supabase
          .from('itp_instances')
          .select(
            `
            id,
            template_id,
            name,
            data,
            status,
            completion_percentage,
            created_at,
            updated_at,
            created_by,
            itp_templates(
              id,
              name,
              description,
              structure,
              organization_id
            )
          `
          )
          .eq('lot_id', lotId)
          .eq('project_id', projectId)
          .order('created_at', { ascending: true });

        if (instancesError) {
          results.tests[results.tests.length - 1] = {
            test: 'itp_instances',
            status: 'error',
            error: instancesError.message,
            details: instancesError,
          };
        } else {
          results.tests[results.tests.length - 1] = {
            test: 'itp_instances',
            status: 'success',
            count: instances?.length || 0,
          };
        }

        // Test 6: Test RPC function
        if (templates && templates.length > 0 && templates[0].structure) {
          results.tests.push({ test: 'rpc_initialize', status: 'running' });
          const { data: rpcData, error: rpcError } = await supabase.rpc(
            'initialize_inspection_data',
            {
              p_template_structure: templates[0].structure,
            }
          );

          if (rpcError) {
            results.tests[results.tests.length - 1] = {
              test: 'rpc_initialize',
              status: 'error',
              error: rpcError.message,
              details: rpcError,
            };
          } else {
            results.tests[results.tests.length - 1] = {
              test: 'rpc_initialize',
              status: 'success',
              has_data: !!rpcData,
            };
          }
        }
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    results.tests.push({
      test: 'global_error',
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(results, { status: 500 });
  }
}
