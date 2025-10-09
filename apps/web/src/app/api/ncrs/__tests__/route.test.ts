import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../route';
import {
  createMockRequest,
  createMockSupabaseClient,
  extractJSON,
} from '@/test/utils/api-test-helpers';

// Mock the Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('/api/ncrs - GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 when user is not authenticated', async () => {
    const mockSupabase = createMockSupabaseClient({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Not authenticated' },
        }),
      },
    });

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    const request = createMockRequest({ url: 'http://localhost:3000/api/ncrs' });

    const response = await GET(request);
    const data = await extractJSON(response);

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 400 for invalid pagination parameters', async () => {
    const mockSupabase = createMockSupabaseClient();

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    const request = createMockRequest({
      url: 'http://localhost:3000/api/ncrs',
      searchParams: { page: '0', limit: '150' },
    });

    const response = await GET(request);
    const data = await extractJSON(response);

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid pagination parameters');
  });

  it('should return paginated NCRs with default pagination', async () => {
    const mockNcrs = [
      {
        id: 'ncr-1',
        ncr_number: 'NCR-2024-0001',
        title: 'Test NCR 1',
        status: 'open',
        severity: 'high',
        project_id: 'project-1',
        raised_by: 'user-1',
        assigned_to: 'user-2',
        created_at: '2024-01-15T10:00:00Z',
        project: { id: 'project-1', name: 'Test Project', code: 'TP-001' },
        raisedBy: { id: 'user-1', email: 'user1@test.com', full_name: 'User One' },
        assignedTo: { id: 'user-2', email: 'user2@test.com', full_name: 'User Two' },
      },
      {
        id: 'ncr-2',
        ncr_number: 'NCR-2024-0002',
        title: 'Test NCR 2',
        status: 'closed',
        severity: 'medium',
        project_id: 'project-1',
        raised_by: 'user-1',
        created_at: '2024-01-14T10:00:00Z',
        project: { id: 'project-1', name: 'Test Project', code: 'TP-001' },
        raisedBy: { id: 'user-1', email: 'user1@test.com', full_name: 'User One' },
        assignedTo: null,
      },
    ];

    const mockSupabase = createMockSupabaseClient();

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'ncrs') {
        return {
          select: vi.fn((query: string) => {
            if (query === 'id') {
              // Count query
              return {
                eq: vi.fn().mockReturnThis(),
                or: vi.fn().mockReturnThis(),
                then: vi.fn((resolve) => {
                  resolve({ count: 2, error: null });
                }),
              };
            }
            // Data query
            return {
              order: vi.fn().mockReturnThis(),
              range: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              or: vi.fn().mockReturnThis(),
              then: vi.fn((resolve) => {
                resolve({ data: mockNcrs, error: null });
              }),
            };
          }),
        };
      }
      return { select: vi.fn().mockReturnThis() };
    });

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    const request = createMockRequest({ url: 'http://localhost:3000/api/ncrs' });

    const response = await GET(request);
    const data = await extractJSON(response);

    expect(response.status).toBe(200);
    expect(data.ncrs).toHaveLength(2);
    expect(data.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 2,
      totalPages: 1,
      hasMore: false,
    });
  });

  it('should filter NCRs by project_id', async () => {
    const mockNcrs = [
      {
        id: 'ncr-1',
        ncr_number: 'NCR-2024-0001',
        title: 'Project Specific NCR',
        project_id: 'project-123',
        status: 'open',
        project: { id: 'project-123', name: 'Specific Project' },
        raisedBy: { id: 'user-1', email: 'user1@test.com' },
        assignedTo: null,
      },
    ];

    const mockSupabase = createMockSupabaseClient();

    let projectIdFilter: string | null = null;

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'ncrs') {
        return {
          select: vi.fn((query: string) => {
            const builder = {
              order: vi.fn().mockReturnThis(),
              range: vi.fn().mockReturnThis(),
              eq: vi.fn((field: string, value: string) => {
                if (field === 'project_id') {
                  projectIdFilter = value;
                }
                return builder;
              }),
              or: vi.fn().mockReturnThis(),
              then: vi.fn((resolve) => {
                if (query === 'id') {
                  resolve({ count: 1, error: null });
                } else {
                  resolve({ data: mockNcrs, error: null });
                }
              }),
            };
            return builder;
          }),
        };
      }
      return { select: vi.fn().mockReturnThis() };
    });

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    const request = createMockRequest({
      url: 'http://localhost:3000/api/ncrs',
      searchParams: { project_id: 'project-123' },
    });

    const response = await GET(request);
    const data = await extractJSON(response);

    expect(response.status).toBe(200);
    expect(projectIdFilter).toBe('project-123');
    expect(data.ncrs).toHaveLength(1);
  });

  it('should filter NCRs by status', async () => {
    const mockNcrs = [
      {
        id: 'ncr-1',
        status: 'open',
        ncr_number: 'NCR-2024-0001',
        project: {},
        raisedBy: {},
        assignedTo: null,
      },
    ];

    const mockSupabase = createMockSupabaseClient();

    let statusFilter: string | null = null;

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'ncrs') {
        return {
          select: vi.fn((query: string) => {
            const builder = {
              order: vi.fn().mockReturnThis(),
              range: vi.fn().mockReturnThis(),
              eq: vi.fn((field: string, value: string) => {
                if (field === 'status') {
                  statusFilter = value;
                }
                return builder;
              }),
              or: vi.fn().mockReturnThis(),
              then: vi.fn((resolve) => {
                if (query === 'id') {
                  resolve({ count: 1, error: null });
                } else {
                  resolve({ data: mockNcrs, error: null });
                }
              }),
            };
            return builder;
          }),
        };
      }
      return { select: vi.fn().mockReturnThis() };
    });

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    const request = createMockRequest({
      url: 'http://localhost:3000/api/ncrs',
      searchParams: { status: 'open' },
    });

    const response = await GET(request);
    const data = await extractJSON(response);

    expect(response.status).toBe(200);
    expect(statusFilter).toBe('open');
  });

  it('should handle database errors gracefully', async () => {
    const mockSupabase = createMockSupabaseClient();

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'ncrs') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          range: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          then: vi.fn((resolve) => {
            resolve({ data: null, error: { message: 'Database error' } });
          }),
        };
      }
      return { select: vi.fn().mockReturnThis() };
    });

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    const request = createMockRequest({ url: 'http://localhost:3000/api/ncrs' });

    const response = await GET(request);
    const data = await extractJSON(response);

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch NCRs');
  });
});

describe('/api/ncrs - POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 when user is not authenticated', async () => {
    const mockSupabase = createMockSupabaseClient({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Not authenticated' },
        }),
      },
    });

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    const formData = new FormData();
    formData.append('project_id', 'project-123');
    formData.append('title', 'Test NCR');
    formData.append('description', 'This is a test NCR description that meets minimum length');
    formData.append('severity', 'medium');
    formData.append('category', 'structural');

    const request = createMockRequest({
      url: 'http://localhost:3000/api/ncrs',
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await extractJSON(response);

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 400 for invalid input data', async () => {
    const mockSupabase = createMockSupabaseClient();

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    const formData = new FormData();
    formData.append('project_id', 'invalid-uuid');
    formData.append('title', 'Too'); // Too short
    formData.append('description', 'Also too short'); // Too short
    formData.append('severity', 'invalid-severity');
    formData.append('category', 'test');

    const request = createMockRequest({
      url: 'http://localhost:3000/api/ncrs',
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await extractJSON(response);

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid input');
    expect(data.details).toBeDefined();
  });

  it('should return 404 when project is not found', async () => {
    const mockSupabase = createMockSupabaseClient();

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'projects') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found' },
          }),
        };
      }
      return { select: vi.fn().mockReturnThis() };
    });

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    const formData = new FormData();
    formData.append('project_id', '12345678-1234-1234-1234-123456789012');
    formData.append('title', 'Test NCR Title');
    formData.append('description', 'This is a test NCR description that meets minimum length');
    formData.append('severity', 'medium');
    formData.append('category', 'structural');

    const request = createMockRequest({
      url: 'http://localhost:3000/api/ncrs',
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await extractJSON(response);

    expect(response.status).toBe(404);
    expect(data.error).toBe('Project not found');
  });

  it('should return 403 when user does not have permission', async () => {
    const mockSupabase = createMockSupabaseClient();

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'projects') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'project-123', organization_id: 'org-123' },
            error: null,
          }),
        };
      }
      if (table === 'organization_members') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found' },
          }),
        };
      }
      return { select: vi.fn().mockReturnThis() };
    });

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    const formData = new FormData();
    formData.append('project_id', '12345678-1234-1234-1234-123456789012');
    formData.append('title', 'Test NCR Title');
    formData.append('description', 'This is a test NCR description that meets minimum length');
    formData.append('severity', 'medium');
    formData.append('category', 'structural');

    const request = createMockRequest({
      url: 'http://localhost:3000/api/ncrs',
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await extractJSON(response);

    expect(response.status).toBe(403);
    expect(data.error).toContain('permission');
  });

  it('should successfully create NCR with valid data', async () => {
    const mockNcr = {
      id: 'ncr-123',
      ncr_number: 'NCR-2024-0001',
      title: 'Test NCR',
      description: 'Test description that meets minimum length requirement',
      severity: 'medium',
      category: 'structural',
      status: 'open',
      priority: 'normal',
      project_id: '12345678-1234-1234-1234-123456789012',
      organization_id: 'org-123',
      raised_by: 'user-123',
    };

    const mockSupabase = createMockSupabaseClient();

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'projects') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'project-123', organization_id: 'org-123' },
            error: null,
          }),
        };
      }
      if (table === 'organization_members') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { role: 'admin', organization_id: 'org-123' },
            error: null,
          }),
        };
      }
      if (table === 'ncrs') {
        const builder = {
          select: vi.fn((columns?: string) => {
            if (columns === 'id') {
              // Count query
              return {
                eq: vi.fn().mockReturnThis(),
                then: vi.fn((resolve) => {
                  resolve({ count: 0, error: null });
                }),
              };
            }
            // Regular select after insert
            return builder;
          }),
          insert: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: mockNcr,
            error: null,
          }),
        };
        return builder;
      }
      return { select: vi.fn().mockReturnThis() };
    });

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    const formData = new FormData();
    formData.append('project_id', '12345678-1234-1234-1234-123456789012');
    formData.append('title', 'Test NCR');
    formData.append('description', 'This is a test NCR description that meets minimum length');
    formData.append('severity', 'medium');
    formData.append('category', 'structural');
    formData.append('tags', JSON.stringify(['safety', 'urgent']));

    const request = createMockRequest({
      url: 'http://localhost:3000/api/ncrs',
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await extractJSON(response);

    expect(response.status).toBe(200);
    expect(data.message).toBe('NCR created successfully');
    expect(data.ncr).toBeDefined();
    expect(data.ncr.ncr_number).toBe('NCR-2024-0001');
  });

  it('should skip empty UUID fields', async () => {
    const mockNcr = {
      id: 'ncr-123',
      ncr_number: 'NCR-2024-0001',
      title: 'Test NCR',
      project_id: '12345678-1234-1234-1234-123456789012',
    };

    const mockSupabase = createMockSupabaseClient();

    let insertedData: any = null;

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'projects') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'project-123', organization_id: 'org-123' },
            error: null,
          }),
        };
      }
      if (table === 'organization_members') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { role: 'admin', organization_id: 'org-123' },
            error: null,
          }),
        };
      }
      if (table === 'ncrs') {
        const builder = {
          select: vi.fn((columns?: string) => {
            if (columns === 'id') {
              // Count query
              return {
                eq: vi.fn().mockReturnThis(),
                then: vi.fn((resolve) => {
                  resolve({ count: 0, error: null });
                }),
              };
            }
            // Regular select after insert
            return builder;
          }),
          insert: vi.fn((data: any) => {
            insertedData = data;
            return builder;
          }),
          single: vi.fn().mockResolvedValue({
            data: mockNcr,
            error: null,
          }),
        };
        return builder;
      }
      return { select: vi.fn().mockReturnThis() };
    });

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    const formData = new FormData();
    formData.append('project_id', '12345678-1234-1234-1234-123456789012');
    formData.append('title', 'Test NCR');
    formData.append('description', 'This is a test NCR description that meets minimum length');
    formData.append('severity', 'medium');
    formData.append('category', 'structural');
    formData.append('assigned_to', ''); // Empty string should be skipped
    formData.append('contractor_id', ''); // Empty string should be skipped
    formData.append('lot_id', 'invalid-uuid'); // Invalid UUID should be skipped

    const request = createMockRequest({
      url: 'http://localhost:3000/api/ncrs',
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await extractJSON(response);

    expect(response.status).toBe(200);
    expect(insertedData).toBeDefined();
    expect(insertedData.assigned_to).toBeUndefined();
    expect(insertedData.contractor_id).toBeUndefined();
    expect(insertedData.lot_id).toBeUndefined();
  });
});
