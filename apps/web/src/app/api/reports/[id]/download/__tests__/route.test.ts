import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import {
  createMockRequest,
  createMockSupabaseClient,
  createMockParams,
} from '@/test/utils/api-test-helpers';

// Mock the Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

// Mock pdf-lib and xlsx since they're heavy dependencies
vi.mock('pdf-lib', () => ({
  PDFDocument: {
    create: vi.fn().mockResolvedValue({
      addPage: vi.fn().mockReturnValue({
        getSize: vi.fn().mockReturnValue({ width: 595.28, height: 841.89 }),
        drawText: vi.fn(),
        drawLine: vi.fn(),
      }),
      embedFont: vi.fn().mockResolvedValue({}),
      save: vi.fn().mockResolvedValue(new Uint8Array([0x25, 0x50, 0x44, 0x46])), // PDF magic bytes
      getPages: vi.fn().mockReturnValue([]),
    }),
  },
  StandardFonts: {
    Helvetica: 'Helvetica',
    HelveticaBold: 'Helvetica-Bold',
  },
  rgb: vi.fn((r, g, b) => ({ r, g, b })),
}));

vi.mock('xlsx', () => ({
  utils: {
    book_new: vi.fn().mockReturnValue({}),
    aoa_to_sheet: vi.fn().mockReturnValue({}),
    json_to_sheet: vi.fn().mockReturnValue({}),
    book_append_sheet: vi.fn(),
  },
  write: vi.fn().mockReturnValue(Buffer.from('mock-excel-data')),
}));

describe('/api/reports/[id]/download - GET', () => {
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

    const request = createMockRequest({ url: 'http://localhost:3000/api/reports/123/download' });
    const params = createMockParams({ id: '123' });

    const response = await GET(request, params);
    const text = await response.text();
    const data = JSON.parse(text);

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 404 when report is not found', async () => {
    const mockSupabase = createMockSupabaseClient({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-123',
              email: 'test@example.com',
              user_metadata: { organization_id: 'org-123' },
            },
          },
          error: null,
        }),
      },
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'report_queue') {
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

    const request = createMockRequest({ url: 'http://localhost:3000/api/reports/999/download' });
    const params = createMockParams({ id: '999' });

    const response = await GET(request, params);
    const text = await response.text();
    const data = JSON.parse(text);

    expect(response.status).toBe(404);
    expect(data.error).toBe('Report not found');
  });

  it('should return 403 when user does not belong to report organization', async () => {
    const mockReport = {
      id: '123',
      report_name: 'Test Report',
      report_type: 'project_summary',
      format: 'pdf',
      status: 'completed',
      organization_id: 'org-456',
      organization: {
        name: 'Other Org',
      },
      parameters: {
        project_id: 'project-123',
        date_range: {
          start: '2024-01-01',
          end: '2024-01-31',
        },
      },
    };

    const mockSupabase = createMockSupabaseClient({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-123',
              email: 'test@example.com',
              user_metadata: { organization_id: 'org-123' },
            },
          },
          error: null,
        }),
      },
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'report_queue') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: mockReport,
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

    const request = createMockRequest({ url: 'http://localhost:3000/api/reports/123/download' });
    const params = createMockParams({ id: '123' });

    const response = await GET(request, params);
    const text = await response.text();
    const data = JSON.parse(text);

    expect(response.status).toBe(403);
    expect(data.error).toContain('Forbidden');
  });

  it('should return 202 when report is still being generated', async () => {
    const mockReport = {
      id: '123',
      report_name: 'Test Report',
      report_type: 'project_summary',
      format: 'pdf',
      status: 'processing',
      organization_id: 'org-123',
      requested_at: new Date().toISOString(),
      organization: {
        name: 'Test Org',
      },
      parameters: {
        project_id: 'project-123',
        date_range: {
          start: '2024-01-01',
          end: '2024-01-31',
        },
      },
    };

    const mockSupabase = createMockSupabaseClient({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-123',
              email: 'test@example.com',
              user_metadata: { organization_id: 'org-123' },
            },
          },
          error: null,
        }),
      },
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'report_queue') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: mockReport,
            error: null,
          }),
          update: vi.fn().mockReturnThis(),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
      };
    });

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    const request = createMockRequest({ url: 'http://localhost:3000/api/reports/123/download' });
    const params = createMockParams({ id: '123' });

    const response = await GET(request, params);
    const text = await response.text();
    const data = JSON.parse(text);

    expect(response.status).toBe(202);
    expect(data.error).toContain('being generated');
  });

  it('should return 400 when report generation failed', async () => {
    const mockReport = {
      id: '123',
      report_name: 'Test Report',
      report_type: 'project_summary',
      format: 'pdf',
      status: 'failed',
      error_message: 'Database connection failed',
      organization_id: 'org-123',
      organization: {
        name: 'Test Org',
      },
      parameters: {
        project_id: 'project-123',
        date_range: {
          start: '2024-01-01',
          end: '2024-01-31',
        },
      },
    };

    const mockSupabase = createMockSupabaseClient({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-123',
              email: 'test@example.com',
              user_metadata: { organization_id: 'org-123' },
            },
          },
          error: null,
        }),
      },
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'report_queue') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: mockReport,
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

    const request = createMockRequest({ url: 'http://localhost:3000/api/reports/123/download' });
    const params = createMockParams({ id: '123' });

    const response = await GET(request, params);
    const text = await response.text();
    const data = JSON.parse(text);

    expect(response.status).toBe(400);
    expect(data.error).toBe('Database connection failed');
  });

  it('should generate and return PDF report when all conditions are met', async () => {
    const mockReport = {
      id: '123',
      report_name: 'Test Report',
      report_type: 'project_summary',
      format: 'pdf',
      status: 'completed',
      organization_id: 'org-123',
      organization: {
        name: 'Test Org',
      },
      parameters: {
        project_id: 'project-123',
        date_range: {
          start: '2024-01-01',
          end: '2024-01-31',
        },
      },
    };

    const mockProject = {
      id: 'project-123',
      name: 'Test Project',
    };

    const mockSupabase = createMockSupabaseClient({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-123',
              email: 'test@example.com',
              user_metadata: { organization_id: 'org-123' },
            },
          },
          error: null,
        }),
      },
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'report_queue') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: mockReport,
            error: null,
          }),
        };
      }
      if (table === 'projects') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: mockProject,
            error: null,
          }),
        };
      }
      if (table === 'daily_diaries' || table === 'inspections' || table === 'ncrs') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockResolvedValue({
            data: [],
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

    const request = createMockRequest({ url: 'http://localhost:3000/api/reports/123/download' });
    const params = createMockParams({ id: '123' });

    const response = await GET(request, params);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/pdf');
    expect(response.headers.get('Content-Disposition')).toContain('Test Report.pdf');
  });

  it('should support format override via query parameter', async () => {
    const mockReport = {
      id: '123',
      report_name: 'Test Report',
      report_type: 'project_summary',
      format: 'pdf',
      status: 'completed',
      organization_id: 'org-123',
      organization: {
        name: 'Test Org',
      },
      parameters: {
        project_id: 'project-123',
        date_range: {
          start: '2024-01-01',
          end: '2024-01-31',
        },
      },
    };

    const mockProject = {
      id: 'project-123',
      name: 'Test Project',
    };

    const mockSupabase = createMockSupabaseClient({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-123',
              email: 'test@example.com',
              user_metadata: { organization_id: 'org-123' },
            },
          },
          error: null,
        }),
      },
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'report_queue') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: mockReport,
            error: null,
          }),
        };
      }
      if (table === 'projects') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: mockProject,
            error: null,
          }),
        };
      }
      if (table === 'daily_diaries' || table === 'inspections' || table === 'ncrs') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockResolvedValue({
            data: [],
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
      url: 'http://localhost:3000/api/reports/123/download?format=json',
    });
    const params = createMockParams({ id: '123' });

    const response = await GET(request, params);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    expect(response.headers.get('Content-Disposition')).toContain('Test Report.json');
  });
});
