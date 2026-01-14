// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Create client with service role for admin operations
  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Create client with user token for authorization checks
  const supabaseUser = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: req.headers.get('Authorization')! } },
  });

  try {
    const { user_ids } = await req.json();

    // Verify admin access using user client
    const { data: authData, error: authErr } = await supabaseUser.auth.getUser();
    if (authErr || !authData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const { data: profile, error: profileErr } = await supabaseUser
      .from('profiles')
      .select('role')
      .eq('user_id', authData.user.id)
      .maybeSingle();

    if (profileErr || !profile || profile.role !== 'SUPER_ADMIN') {
      return new Response(JSON.stringify({ error: 'Seuls les super admins peuvent supprimer des utilisateurs' }), { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log(`Suppression de ${user_ids.length} utilisateurs...`);

    let deleted = 0;
    const errors: string[] = [];

    for (const userId of user_ids) {
      try {
        // Ne pas permettre l'auto-suppression
        if (userId === authData.user.id) {
          errors.push('Impossible de se supprimer soi-même');
          continue;
        }

        // Supprimer l'utilisateur de auth.users (cascade vers profiles)
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        
        if (deleteError) {
          console.error(`Erreur suppression ${userId}:`, deleteError);
          errors.push(`${userId}: ${deleteError.message}`);
          continue;
        }

        console.log(`✓ Utilisateur supprimé: ${userId}`);
        deleted++;

      } catch (error: any) {
        console.error(`Erreur suppression ${userId}:`, error);
        errors.push(`${userId}: ${error.message}`);
      }
    }

    console.log(`Suppression terminée: ${deleted}/${user_ids.length} succès`);

    return new Response(JSON.stringify({
      success: true,
      deleted,
      total: user_ids.length,
      errors
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (e: any) {
    console.error('delete-users error:', e);
    return new Response(JSON.stringify({ 
      error: e.message || 'Erreur inconnue',
      details: e.toString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});