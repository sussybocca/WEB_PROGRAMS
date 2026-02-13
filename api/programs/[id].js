import { supabaseAdmin, getUser } from '../../../lib/supabase.js';

export default async function handler(req, res) {
  const { method } = req;
  const { id } = req.query;

  try {
    // Public GET: anyone can view public programs
    if (method === 'GET') {
      const { data: program, error } = await supabaseAdmin
        .from('programs')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !program) {
        return res.status(404).json({ error: 'Program not found' });
      }

      // If not public, require authentication and ownership
      if (!program.is_public) {
        try {
          const user = await getUser(req);
          if (user.id !== program.user_id) {
            return res.status(403).json({ error: 'Forbidden' });
          }
        } catch (authErr) {
          return res.status(401).json({ error: 'Authentication required' });
        }
      }

      // Generate a signed URL for downloading the file (content)
      const { data: signedUrl, error: signedUrlError } = await supabaseAdmin
        .storage
        .from('programs')
        .createSignedUrl(program.storage_path, 3600); // 1 hour

      if (signedUrlError) throw signedUrlError;

      return res.status(200).json({
        ...program,
        downloadUrl: signedUrl.signedUrl
      });
    }

    // For PUT and DELETE, require authentication and ownership
    const user = await getUser(req);

    const { data: program, error: fetchError } = await supabaseAdmin
      .from('programs')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    if (program.user_id !== user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (method === 'PUT') {
      const { title, description, is_public } = req.body;

      const updates = {};
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (is_public !== undefined) updates.is_public = is_public;

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('programs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      return res.status(200).json(updated);
    }

    if (method === 'DELETE') {
      // Delete from storage first
      const { error: deleteStorageError } = await supabaseAdmin
        .storage
        .from('programs')
        .remove([program.storage_path]);

      if (deleteStorageError) {
        console.error('Storage delete error:', deleteStorageError);
        // Continue anyway – we'll attempt to delete DB record.
      }

      const { error: deleteDbError } = await supabaseAdmin
        .from('programs')
        .delete()
        .eq('id', id);

      if (deleteDbError) throw deleteDbError;

      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error('Program [id] error:', err);
    return res.status(500).json({ error: err.message });
  }
}
