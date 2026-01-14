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

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: req.headers.get('Authorization')! } },
  });

  try {
    const { user_ids, reset_type } = await req.json();

    // Verify admin access
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', authData.user.id)
      .maybeSingle();

    if (profileErr || !profile || profile.role !== 'SUPER_ADMIN') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return new Response(JSON.stringify({ error: 'user_ids requis' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log(`Réinitialisation de ${user_ids.length} mots de passe (type: ${reset_type})`);

    // Get user profiles for context
    const { data: profiles, error: profilesErr } = await supabase
      .from('profiles')
      .select(`
        user_id,
        first_name,
        last_name,
        email,
        campus (
          name
        )
      `)
      .in('user_id', user_ids);

    if (profilesErr) throw profilesErr;

    const results: any[] = [];
    let successCount = 0;
    const errors: string[] = [];
    const baseUrl = SUPABASE_URL.replace('/supabase', ''); // Clean URL for login

    for (const userId of user_ids) {
      try {
        const profile = profiles?.find(p => p.user_id === userId);
        if (!profile) {
          errors.push(`Profil non trouvé pour user_id: ${userId}`);
          continue;
        }

        // Generate new temporary password
        const tempPassword = `aurlom${Math.random().toString(36).slice(2, 8)}${Date.now().toString().slice(-3)}`;
        
        // Update user password
        const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, {
          password: tempPassword
        });

        if (updateErr) {
          errors.push(`${profile.email}: ${updateErr.message}`);
          continue;
        }

        results.push({
          user_id: userId,
          email: profile.email,
          first_name: profile.first_name,
          last_name: profile.last_name,
          campus: (profile as any).campus?.name || 'Non assigné',
          temporary_password: tempPassword,
          reset_date: new Date().toLocaleString('fr-FR'),
          login_url: `${baseUrl}/auth`
        });

        successCount++;
        console.log(`✓ Mot de passe réinitialisé pour ${profile.email}`);

      } catch (e: any) {
        console.error(`Erreur pour user_id ${userId}:`, e);
        errors.push(`${userId}: ${e.message}`);
      }
    }

    console.log(`Réinitialisation terminée: ${successCount}/${user_ids.length} succès`);

    return new Response(JSON.stringify({
      success: true,
      success_count: successCount,
      total_count: user_ids.length,
      results,
      errors: errors.length > 0 ? errors : null
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (e: any) {
    console.error('reset-user-passwords error:', e);
    return new Response(JSON.stringify({ 
      error: e.message || 'Erreur inconnue',
      details: e.toString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});