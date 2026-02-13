import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

/**
 * Extracts the authenticated user from the request.
 * Expects `Authorization: Bearer <token>` header.
 * Returns the user object or throws an error.
 */
export async function getUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) throw new Error('Missing authorization header');

  const token = authHeader.split(' ')[1];
  if (!token) throw new Error('Invalid authorization header format');

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) throw new Error('Invalid or expired token');

  return user;
}
