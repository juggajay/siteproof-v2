// import { createClient } from '@/lib/supabase/server';

export async function createActivityLog(
  userId: string,
  action: string,
  metadata?: Record<string, any>
) {
  try {
    // const supabase = await createClient();
    
    // For now, just log to console
    // In production, this would write to an activity_logs table
    console.log('Activity Log:', {
      user_id: userId,
      action,
      metadata,
      timestamp: new Date().toISOString(),
    });
    
    // Optionally, you could insert into a database table:
    // await supabase.from('activity_logs').insert({
    //   user_id: userId,
    //   action,
    //   metadata,
    //   created_at: new Date().toISOString(),
    // });
    
    return true;
  } catch (error) {
    console.error('Failed to create activity log:', error);
    return false;
  }
}