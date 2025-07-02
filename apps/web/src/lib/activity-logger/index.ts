import { createClient } from '@/lib/supabase/server';

export interface ActivityLogEntry {
  user_id: string;
  action: string;
  details?: Record<string, any>;
  timestamp?: string;
}

export async function createActivityLog(
  userId: string,
  action: string,
  details?: Record<string, any>
): Promise<void> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from('activity_logs').insert({
      user_id: userId,
      action,
      details: details || {},
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Failed to create activity log:', error);
    }
  } catch (error) {
    console.error('Error creating activity log:', error);
  }
}
