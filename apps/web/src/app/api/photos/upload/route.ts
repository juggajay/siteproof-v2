import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    const formData = await request.formData();
    const projectId = formData.get('project_id') as string;
    const itemId = formData.get('item_id') as string;
    const itemType = formData.get('item_type') as string;

    if (!projectId || !itemId || !itemType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Process uploaded files
    const uploadedUrls: string[] = [];
    const files = formData.getAll('photos') as File[];

    for (const file of files) {
      // Convert file to buffer
      const buffer = Buffer.from(await file.arrayBuffer());

      // Generate unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(7);
      const extension = file.name.split('.').pop();
      const fileName = `${projectId}/${itemType}/${itemId}/${timestamp}_${randomId}.${extension}`;

      // Upload to Supabase Storage
      const { error } = await supabase.storage.from('project-photos').upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

      if (error) {
        console.error('Upload error:', error);
        continue;
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('project-photos').getPublicUrl(fileName);

      uploadedUrls.push(publicUrl);

      // Save photo metadata to database
      await supabase.from('photos').insert({
        project_id: projectId,
        item_id: itemId,
        item_type: itemType,
        url: publicUrl,
        filename: file.name,
        size: file.size,
        mime_type: file.type,
        uploaded_by: user.id,
        created_at: new Date().toISOString(),
      });
    }

    // Update the related item with photo URLs
    if (itemType === 'itp') {
      // Update ITP instance with photos
      const { data: itpInstance } = await supabase
        .from('itp_instances')
        .select('photos')
        .eq('id', itemId)
        .single();

      const existingPhotos = itpInstance?.photos || [];
      await supabase
        .from('itp_instances')
        .update({
          photos: [...existingPhotos, ...uploadedUrls],
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId);
    } else if (itemType === 'ncr') {
      // Update NCR with photos
      const { data: ncr } = await supabase
        .from('ncrs')
        .select('evidence')
        .eq('id', itemId)
        .single();

      const existingEvidence = ncr?.evidence || [];
      await supabase
        .from('ncrs')
        .update({
          evidence: [...existingEvidence, ...uploadedUrls],
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId);
    }

    return NextResponse.json({
      success: true,
      urls: uploadedUrls,
      count: uploadedUrls.length,
    });
  } catch (error) {
    console.error('Photo upload error:', error);
    return NextResponse.json({ error: 'Failed to upload photos' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const photoUrl = searchParams.get('url');
    const itemId = searchParams.get('item_id');
    const itemType = searchParams.get('item_type');

    if (!photoUrl) {
      return NextResponse.json({ error: 'Photo URL required' }, { status: 400 });
    }

    // Extract file path from URL
    const urlParts = photoUrl.split('/');
    const fileName = urlParts.slice(-4).join('/'); // project_id/item_type/item_id/filename

    // Delete from storage
    const { error: deleteError } = await supabase.storage.from('project-photos').remove([fileName]);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 });
    }

    // Remove from database
    await supabase.from('photos').delete().eq('url', photoUrl);

    // Update the related item
    if (itemId && itemType) {
      if (itemType === 'itp') {
        const { data: itpInstance } = await supabase
          .from('itp_instances')
          .select('photos')
          .eq('id', itemId)
          .single();

        const updatedPhotos = (itpInstance?.photos || []).filter((p: string) => p !== photoUrl);

        await supabase
          .from('itp_instances')
          .update({
            photos: updatedPhotos,
            updated_at: new Date().toISOString(),
          })
          .eq('id', itemId);
      } else if (itemType === 'ncr') {
        const { data: ncr } = await supabase
          .from('ncrs')
          .select('evidence')
          .eq('id', itemId)
          .single();

        const updatedEvidence = (ncr?.evidence || []).filter((e: string) => e !== photoUrl);

        await supabase
          .from('ncrs')
          .update({
            evidence: updatedEvidence,
            updated_at: new Date().toISOString(),
          })
          .eq('id', itemId);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Photo deleted successfully',
    });
  } catch (error) {
    console.error('Photo delete error:', error);
    return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 });
  }
}
