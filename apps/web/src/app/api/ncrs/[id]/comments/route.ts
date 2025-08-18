import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty'),
  is_internal: z.boolean().default(false),
  parent_comment_id: z.string().uuid().optional(),
});

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch comments for the NCR
    const { data: comments, error } = await supabase
      .from('ncr_comments')
      .select(
        `
        *,
        author:users!ncr_comments_author_id_fkey(id, email, full_name, avatar_url),
        replies:ncr_comments!parent_comment_id(
          *,
          author:users!ncr_comments_author_id_fkey(id, email, full_name, avatar_url)
        )
      `
      )
      .eq('ncr_id', params.id)
      .is('parent_comment_id', null)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Filter out internal comments if user doesn't have permission
    const { data: member } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const canViewInternal = ['owner', 'admin', 'member'].includes(member?.role || '');

    const filteredComments = comments?.filter((comment) => {
      if (comment.is_internal && !canViewInternal) {
        return false;
      }
      // Filter replies as well
      if (comment.replies) {
        comment.replies = comment.replies.filter(
          (reply: any) => !reply.is_internal || canViewInternal
        );
      }
      return true;
    });

    return NextResponse.json(filteredComments || []);
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createCommentSchema.parse(body);

    // Check NCR exists
    const { data: ncr } = await supabase
      .from('ncrs')
      .select('id, organization_id')
      .eq('id', params.id)
      .single();

    if (!ncr) {
      return NextResponse.json({ error: 'NCR not found' }, { status: 404 });
    }

    // Get user's role for author_role field
    const { data: member } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', ncr.organization_id)
      .single();

    // Create comment
    const { data: comment, error: commentError } = await supabase
      .from('ncr_comments')
      .insert({
        ncr_id: params.id,
        content: validatedData.content,
        is_internal: validatedData.is_internal,
        author_id: user.id,
        author_role: member?.role || 'viewer',
        parent_comment_id: validatedData.parent_comment_id,
        created_at: new Date().toISOString(),
      })
      .select(
        `
        *,
        author:users!ncr_comments_author_id_fkey(id, email, full_name, avatar_url)
      `
      )
      .single();

    if (commentError) {
      throw commentError;
    }

    // Log in history
    await supabase.from('ncr_history').insert({
      ncr_id: params.id,
      action: 'comment_added',
      performed_by: user.id,
      performed_at: new Date().toISOString(),
      comment:
        validatedData.content.substring(0, 100) + (validatedData.content.length > 100 ? '...' : ''),
    });

    // Queue notification for assigned user
    const { data: ncrDetails } = await supabase
      .from('ncrs')
      .select('assigned_to, ncr_number, title')
      .eq('id', params.id)
      .single();

    if (ncrDetails?.assigned_to && ncrDetails.assigned_to !== user.id) {
      await supabase.rpc('queue_notification', {
        p_type: 'ncr_comment',
        p_entity_type: 'ncr',
        p_entity_id: params.id,
        p_recipient_id: ncrDetails.assigned_to,
        p_subject: `New comment on NCR ${ncrDetails.ncr_number}`,
        p_body: `A new comment has been added to NCR "${ncrDetails.title}"`,
        p_priority: 'normal',
      });
    }

    return NextResponse.json({
      message: 'Comment added successfully',
      comment,
    });
  } catch (error) {
    console.error('Error creating comment:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}
