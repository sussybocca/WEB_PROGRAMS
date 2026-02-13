import { supabaseAdmin, getUser } from '../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getUser(req);

    const { email, user_metadata } = user;
    const name = user_metadata?.full_name || user_metadata?.name || email.split('@')[0];
    const avatar_url = user_metadata?.avatar_url || user_metadata?.picture;

    const { data, error } = await supabaseAdmin
      .from('google_logged_in_users')
      .upsert({
        id: user.id,
        email,
        name,
        avatar_url,
        last_sign_in: new Date().toISOString()
      }, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json(data);
  } catch (err) {
    console.error('Auth error:', err);
    return res.status(401).json({ error: err.message });
  }
}
