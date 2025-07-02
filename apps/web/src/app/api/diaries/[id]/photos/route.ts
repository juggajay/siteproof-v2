import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateFile, generateUniqueFileName } from '@/lib/file-upload/validation';
import { createActivityLog } from '@/lib/activity-logger';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const diaryId = params.id;
    const formData = await request.formData();
    const files = formData.getAll('photos') as File[];
    const captions = formData.getAll('captions') as string[];
    const timestamps = formData.getAll('timestamps') as string[];

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Get the diary to check permissions
    const { data: diary, error: diaryError } = await supabase
      .from('daily_diaries')
      .select(
        `
        *,
        project:projects(id, organization_id)
      `
      )
      .eq('id', diaryId)
      .single();

    if (diaryError || !diary) {
      return NextResponse.json({ error: 'Diary not found' }, { status: 404 });
    }

    // Check if user has permission
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', diary.project.organization_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Don't allow editing approved diaries unless admin
    if (diary.status === 'approved' && membership.role !== 'admin' && membership.role !== 'owner') {
      return NextResponse.json({ error: 'Cannot modify approved diary' }, { status: 403 });
    }

    const uploadedPhotos = [];
    const errors = [];

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const caption = captions[i] || '';
      const timestamp = timestamps[i] || new Date().toISOString();

      // Validate file
      const validation = validateFile(file, { category: 'image' });
      if (!validation.valid) {
        errors.push({
          file: file.name,
          error: validation.error,
        });
        continue;
      }

      // Generate unique filename
      const fileName = generateUniqueFileName(file.name);
      const filePath = `diary-photos/${diary.project_id}/${diaryId}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('project-attachments')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        errors.push({
          file: file.name,
          error: 'Failed to upload file',
        });
        continue;
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('project-attachments').getPublicUrl(filePath);

      uploadedPhotos.push({
        id: crypto.randomUUID(),
        url: publicUrl,
        filename: file.name,
        size: file.size,
        mime_type: file.type,
        caption,
        timestamp,
        uploaded_by: user.id,
        uploaded_at: new Date().toISOString(),
      });
    }

    if (uploadedPhotos.length === 0) {
      return NextResponse.json(
        { error: 'No files were uploaded successfully', errors },
        { status: 400 }
      );
    }

    // Update diary with new photos
    const currentPhotos = diary.photos || [];
    const updatedPhotos = [...currentPhotos, ...uploadedPhotos];

    const { error: updateError } = await supabase
      .from('daily_diaries')
      .update({
        photos: updatedPhotos,
        updated_at: new Date().toISOString(),
      })
      .eq('id', diaryId);

    if (updateError) {
      // Try to clean up uploaded files
      for (const photo of uploadedPhotos) {
        const filePath = photo.url.split('/').slice(-3).join('/');
        await supabase.storage.from('project-attachments').remove([filePath]);
      }

      throw updateError;
    }

    // Create activity log
    await createActivityLog(user.id, 'diary.photos.upload', {
      diary_id: diaryId,
      diary_number: diary.diary_number,
      project_id: diary.project_id,
      photos_count: uploadedPhotos.length,
    });

    return NextResponse.json({
      message: `${uploadedPhotos.length} photos uploaded successfully`,
      photos: uploadedPhotos,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error uploading diary photos:', error);
    return NextResponse.json({ error: 'Failed to upload photos' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const diaryId = params.id;
    const { photoIds } = await request.json();

    if (!Array.isArray(photoIds) || photoIds.length === 0) {
      return NextResponse.json({ error: 'No photo IDs provided' }, { status: 400 });
    }

    // Get the diary to check permissions
    const { data: diary, error: diaryError } = await supabase
      .from('daily_diaries')
      .select(
        `
        *,
        project:projects(id, organization_id)
      `
      )
      .eq('id', diaryId)
      .single();

    if (diaryError || !diary) {
      return NextResponse.json({ error: 'Diary not found' }, { status: 404 });
    }

    // Check if user has permission
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', diary.project.organization_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Don't allow editing approved diaries unless admin
    if (diary.status === 'approved' && membership.role !== 'admin' && membership.role !== 'owner') {
      return NextResponse.json({ error: 'Cannot modify approved diary' }, { status: 403 });
    }

    const currentPhotos = diary.photos || [];
    const photosToDelete = currentPhotos.filter((photo: any) => photoIds.includes(photo.id));
    const remainingPhotos = currentPhotos.filter((photo: any) => !photoIds.includes(photo.id));

    // Delete files from storage
    const filesToDelete = photosToDelete.map((photo: any) => {
      const urlParts = photo.url.split('/');
      return urlParts.slice(-3).join('/');
    });

    if (filesToDelete.length > 0) {
      const { error: deleteError } = await supabase.storage
        .from('project-attachments')
        .remove(filesToDelete);

      if (deleteError) {
        console.error('Error deleting files:', deleteError);
      }
    }

    // Update diary
    const { error: updateError } = await supabase
      .from('daily_diaries')
      .update({
        photos: remainingPhotos,
        updated_at: new Date().toISOString(),
      })
      .eq('id', diaryId);

    if (updateError) {
      throw updateError;
    }

    // Create activity log
    await createActivityLog(user.id, 'diary.photos.delete', {
      diary_id: diaryId,
      diary_number: diary.diary_number,
      project_id: diary.project_id,
      photos_deleted: photosToDelete.length,
    });

    return NextResponse.json({
      message: `${photosToDelete.length} photos deleted successfully`,
      deletedCount: photosToDelete.length,
    });
  } catch (error) {
    console.error('Error deleting diary photos:', error);
    return NextResponse.json({ error: 'Failed to delete photos' }, { status: 500 });
  }
}
