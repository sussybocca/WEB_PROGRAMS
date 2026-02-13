import { supabaseAdmin, getUser } from '../lib/supabase.js';
import { compileProgramBot, compileNetworkBots } from '../lib/compiler.js';
import { scanProgram } from '../lib/scanner.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getUser(req);

    const { title, description, language, sourceCode } = req.body;

    if (!title || !language || !sourceCode) {
      return res.status(400).json({ error: 'Missing required fields: title, language, sourceCode' });
    }

    if (!['program_bot', 'network_bots'].includes(language)) {
      return res.status(400).json({ error: 'Invalid language. Must be "program_bot" or "network_bots"' });
    }

    // COMPILE the source code into Program Binary format
    let binaryBuffer;
    try {
      if (language === 'program_bot') {
        binaryBuffer = compileProgramBot(sourceCode);
      } else {
        binaryBuffer = compileNetworkBots(sourceCode);
      }
    } catch (compileError) {
      return res.status(400).json({ 
        error: 'Compilation failed', 
        details: compileError.message 
      });
    }

    // Generate unique filename
    const programId = crypto.randomUUID();
    const filePath = `programs/${user.id}/${programId}.pbot`;

    // Upload compiled binary directly to Supabase Storage
    const { error: uploadError } = await supabaseAdmin
      .storage
      .from('programs')
      .upload(filePath, binaryBuffer, {
        contentType: 'application/octet-stream',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Insert program metadata into database
    const { data: program, error: insertError } = await supabaseAdmin
      .from('programs')
      .insert({
        id: programId,
        user_id: user.id,
        title,
        description: description || '',
        language,
        storage_path: filePath,
        is_public: false,
        scan_status: 'pending',
        downloads: 0,
        file_size: binaryBuffer.length
      })
      .select()
      .single();

    if (insertError) {
      // Rollback: delete the uploaded file
      await supabaseAdmin.storage.from('programs').remove([filePath]);
      throw insertError;
    }

    // Trigger security scan asynchronously (don't await)
    scanProgram(programId, binaryBuffer).catch(err => {
      console.error('Background scan failed:', err);
    });

    // Return success with program info
    return res.status(201).json({
      id: program.id,
      title: program.title,
      language: program.language,
      file_size: program.file_size,
      created_at: program.created_at,
      scan_status: program.scan_status
    });

  } catch (err) {
    console.error('Publisher error:', err);
    return res.status(500).json({ error: err.message });
  }
}
