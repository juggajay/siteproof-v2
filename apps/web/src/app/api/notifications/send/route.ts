import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import webpush from 'web-push';
import { z } from 'zod';

// Configure web-push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:support@siteproof.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

const notificationSchema = z.object({
  userId: z.string().uuid().optional(),
  userIds: z.array(z.string().uuid()).optional(),
  title: z.string(),
  body: z.string(),
  icon: z.string().optional(),
  badge: z.string().optional(),
  url: z.string().optional(),
  tag: z.string().optional(),
  requireInteraction: z.boolean().optional(),
  actions: z
    .array(
      z.object({
        action: z.string(),
        title: z.string(),
        icon: z.string().optional(),
      })
    )
    .optional(),
  data: z.any().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const notification = notificationSchema.parse(body);

    // Get target user IDs
    const targetUserIds =
      notification.userIds || (notification.userId ? [notification.userId] : []);

    if (targetUserIds.length === 0) {
      return NextResponse.json({ error: 'No recipients specified' }, { status: 400 });
    }

    // Get push subscriptions for target users
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', targetUserIds);

    if (subError || !subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ error: 'No push subscriptions found' }, { status: 404 });
    }

    // Prepare notification payload
    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: notification.icon || '/icons/icon-192x192.png',
      badge: notification.badge || '/icons/icon-72x72.png',
      url: notification.url,
      tag: notification.tag || `notification-${Date.now()}`,
      requireInteraction: notification.requireInteraction || false,
      actions: notification.actions,
      data: {
        ...notification.data,
        timestamp: new Date().toISOString(),
      },
    });

    // Send notifications
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            payload
          );
          return { success: true, userId: sub.user_id };
        } catch (error: any) {
          console.error(`Failed to send notification to ${sub.user_id}:`, error);

          // Remove invalid subscriptions
          if (error.statusCode === 410) {
            await supabase.from('push_subscriptions').delete().eq('id', sub.id);
          }

          return { success: false, userId: sub.user_id, error: error.message };
        }
      })
    );

    // Count successful sends
    const successCount = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;

    // Log notification in database
    await supabase.from('notification_logs').insert({
      sent_by: user.id,
      recipient_ids: targetUserIds,
      title: notification.title,
      body: notification.body,
      data: notification.data,
      success_count: successCount,
      total_count: targetUserIds.length,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      sent: successCount,
      total: targetUserIds.length,
      results: results.map((r) =>
        r.status === 'fulfilled' ? r.value : { success: false, error: r.reason }
      ),
    });
  } catch (error) {
    console.error('Send notification error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid notification data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}
