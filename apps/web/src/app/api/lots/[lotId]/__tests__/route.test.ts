import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, DELETE } from '../route';
import {
  createMockRequest,
  createMockSupabaseClient,
  extractJSON,
  createMockParams,
} from '@/test/utils/api-test-helpers';

// Mock the Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('/api/lots/[lotId] - GET', () => {
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

    const request = createMockRequest({ url: 'http://localhost:3000/api/lots/123' });
    const params = createMockParams({ lotId: '123' });

    const response = await GET(request, params);
    const data = await extractJSON(response);

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 404 when lot is not found', async () => {
    const mockSupabase = createMockSupabaseClient();

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'lots') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found' },
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
    });

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    const request = createMockRequest({ url: 'http://localhost:3000/api/lots/999' });
    const params = createMockParams({ lotId: '999' });

    const response = await GET(request, params);
    const data = await extractJSON(response);

    expect(response.status).toBe(404);
    expect(data.error).toBe('Lot not found');
  });

  it('should return 403 when user does not have access to the organization', async () => {
    const mockLot = {
      id: '123',
      lot_number: 'LOT-001',
      projects: {
        id: 'project-123',
        name: 'Test Project',
        organization_id: 'org-456',
      },
    };

    const mockSupabase = createMockSupabaseClient();

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'lots') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: mockLot,
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
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
    });

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    const request = createMockRequest({ url: 'http://localhost:3000/api/lots/123' });
    const params = createMockParams({ lotId: '123' });

    const response = await GET(request, params);
    const data = await extractJSON(response);

    expect(response.status).toBe(403);
    expect(data.error).toBe('Access denied');
  });

  it('should return lot with ITP instances when user has access', async () => {
    const mockLot = {
      id: '123',
      lot_number: 'LOT-001',
      description: 'Test Lot',
      projects: {
        id: 'project-123',
        name: 'Test Project',
        organization_id: 'org-123',
      },
    };

    const mockItpInstances = [
      {
        id: 'itp-1',
        template_id: 'template-1',
        inspection_status: 'completed',
        itp_templates: {
          id: 'template-1',
          name: 'Foundation Inspection',
          category: 'structural',
        },
      },
    ];

    const mockMembership = {
      role: 'admin',
    };

    const mockSupabase = createMockSupabaseClient();

    // Mock lots query
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'lots') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: mockLot,
            error: null,
          }),
        };
      }
      if (table === 'organization_members') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: mockMembership,
            error: null,
          }),
        };
      }
      if (table === 'itp_instances') {
        const chain = {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: mockItpInstances,
                  error: null,
                }),
              }),
            }),
          }),
        };
        return chain;
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
    });

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    const request = createMockRequest({ url: 'http://localhost:3000/api/lots/123' });
    const params = createMockParams({ lotId: '123' });

    const response = await GET(request, params);
    const data = await extractJSON(response);

    expect(response.status).toBe(200);
    expect(data.lot).toBeDefined();
    expect(data.lot.id).toBe('123');
    expect(data.lot.itp_instances).toHaveLength(1);
    expect(data.userRole).toBe('admin');
  });
});

describe('/api/lots/[lotId] - DELETE', () => {
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

    const request = createMockRequest({
      url: 'http://localhost:3000/api/lots/123',
      method: 'DELETE',
    });
    const params = createMockParams({ lotId: '123' });

    const response = await DELETE(request, params);
    const data = await extractJSON(response);

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 404 when lot is not found', async () => {
    const mockSupabase = createMockSupabaseClient();

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'organization_members') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { organization_id: 'org-123', role: 'admin' },
            error: null,
          }),
        };
      }
      if (table === 'lots') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found' },
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
      };
    });

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    const request = createMockRequest({
      url: 'http://localhost:3000/api/lots/999',
      method: 'DELETE',
    });
    const params = createMockParams({ lotId: '999' });

    const response = await DELETE(request, params);
    const data = await extractJSON(response);

    expect(response.status).toBe(404);
    expect(data.error).toBe('Lot not found');
  });

  it('should return 403 when user does not have permission to delete', async () => {
    const mockLot = {
      id: '123',
      projects: {
        organization_id: 'org-123',
      },
    };

    const mockSupabase = createMockSupabaseClient();

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'organization_members') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { organization_id: 'org-123', role: 'viewer' },
            error: null,
          }),
        };
      }
      if (table === 'lots') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: mockLot,
            error: null,
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
      };
    });

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    const request = createMockRequest({
      url: 'http://localhost:3000/api/lots/123',
      method: 'DELETE',
    });
    const params = createMockParams({ lotId: '123' });

    const response = await DELETE(request, params);
    const data = await extractJSON(response);

    expect(response.status).toBe(403);
    expect(data.error).toBe('You do not have permission to delete lots');
  });

  it('should return 400 when lot has associated inspections', async () => {
    const mockLot = {
      id: '123',
      projects: {
        organization_id: 'org-123',
      },
    };

    const mockSupabase = createMockSupabaseClient();

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'organization_members') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { organization_id: 'org-123', role: 'admin' },
            error: null,
          }),
        };
      }
      if (table === 'lots') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: mockLot,
            error: null,
          }),
        };
      }
      if (table === 'inspections') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: [{ id: 'inspection-1' }],
            error: null,
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
      };
    });

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    const request = createMockRequest({
      url: 'http://localhost:3000/api/lots/123',
      method: 'DELETE',
    });
    const params = createMockParams({ lotId: '123' });

    const response = await DELETE(request, params);
    const data = await extractJSON(response);

    expect(response.status).toBe(400);
    expect(data.error).toContain('Cannot delete lot with associated inspections');
  });

  it('should successfully delete lot when all conditions are met', async () => {
    const mockLot = {
      id: '123',
      projects: {
        organization_id: 'org-123',
      },
    };

    const mockSupabase = createMockSupabaseClient();

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'organization_members') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { organization_id: 'org-123', role: 'admin' },
            error: null,
          }),
        };
      }
      if (table === 'lots') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: mockLot,
            error: null,
          }),
          delete: vi.fn().mockReturnThis(),
        };
      }
      if (table === 'inspections') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };
    });

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    const request = createMockRequest({
      url: 'http://localhost:3000/api/lots/123',
      method: 'DELETE',
    });
    const params = createMockParams({ lotId: '123' });

    const response = await DELETE(request, params);
    const data = await extractJSON(response);

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Lot deleted successfully');
  });
});
