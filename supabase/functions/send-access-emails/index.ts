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
    const { access_info } = await req.json();

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

    if (!Array.isArray(access_info) || access_info.length === 0) {
      return new Response(JSON.stringify({ error: 'access_info requis' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log(`Envoi d'emails d'accès à ${access_info.length} utilisateurs`);

    let successCount = 0;
    const errors: string[] = [];

    // Note: This is a basic implementation
    // In a real scenario, you would integrate with an email service like SendGrid, AWS SES, etc.
    // For now, we'll create notifications in the database
    
    for (const userInfo of access_info) {
      try {
        // Get user_id from profile
        const { data: userProfile, error: userErr } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('email', userInfo.email)
          .maybeSingle();

        if (userErr || !userProfile) {
          errors.push(`Utilisateur non trouvé: ${userInfo.email}`);
          continue;
        }

        // Create notification with access information
        const { error: notifErr } = await supabase
          .from('notifications')
          .insert({
            user_id: userProfile.user_id,
            type: 'info',
            title: 'Nouvelles informations de connexion',
            message: `Bonjour ${userInfo.first_name},\n\nVos informations de connexion ont été réinitialisées :\n\nEmail : ${userInfo.email}\nMot de passe temporaire : ${userInfo.temporary_password}\nURL de connexion : ${userInfo.login_url}\n\nVeuillez vous connecter et changer votre mot de passe.\n\nCordialement,\nL'équipe Aurlom`
          });

        if (notifErr) {
          errors.push(`${userInfo.email}: ${notifErr.message}`);
          continue;
        }

        // TODO: Implement actual email sending here
        // For now, we simulate success
        console.log(`✓ Notification créée pour ${userInfo.email}`);
        successCount++;

      } catch (e: any) {
        console.error(`Erreur pour ${userInfo.email}:`, e);
        errors.push(`${userInfo.email}: ${e.message}`);
      }
    }

    console.log(`Envoi terminé: ${successCount}/${access_info.length} succès`);

    return new Response(JSON.stringify({
      success: true,
      success_count: successCount,
      total_count: access_info.length,
      message: `${successCount} notifications créées. Les utilisateurs peuvent consulter leurs informations de connexion dans leurs notifications.`,
      errors: errors.length > 0 ? errors : null,
      note: "Les informations de connexion ont été ajoutées aux notifications des utilisateurs. L'envoi d'emails nécessite la configuration d'un service d'email."
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (e: any) {
    console.error('send-access-emails error:', e);
    return new Response(JSON.stringify({ 
      error: e.message || 'Erreur inconnue',
      details: e.toString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});