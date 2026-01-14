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

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const supabaseUser = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: req.headers.get('Authorization')! } },
  });

  try {
    // Verify admin access
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
      return new Response(JSON.stringify({ error: 'Super Admin required' }), { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log('Generating temporary passwords for existing users...');

    // Get all profiles that don't have temp credentials yet
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('user_id, email, first_name, last_name')
      .eq('is_active', true);

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'Aucun profil actif trouvé' 
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Check which ones already have temp credentials
    const { data: existingCreds } = await supabaseAdmin
      .from('temp_access_credentials')
      .select('user_id');

    const existingUserIds = new Set(existingCreds?.map(c => c.user_id) || []);
    const profilesToProcess = profiles.filter(p => !existingUserIds.has(p.user_id));

    console.log(`Processing ${profilesToProcess.length} profiles without temp credentials`);

    let processed = 0;
    const errors: string[] = [];
    const createdPasswords: any[] = [];

    for (const profile of profilesToProcess) {
      try {
        // Generate new temporary password
        const tempPassword = `aurlom${Math.random().toString(36).slice(2, 8)}`;

        // Update auth user password
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          profile.user_id,
          { password: tempPassword }
        );

        if (updateError) {
          console.error(`Password update error for ${profile.email}:`, updateError);
          errors.push(`${profile.email}: ${updateError.message}`);
          continue;
        }

        // Save temporary password
        const { error: credError } = await supabaseAdmin
          .from('temp_access_credentials')
          .insert({
            user_id: profile.user_id,
            email: profile.email,
            temp_password: tempPassword,
            created_by: authData.user.id
          });

        if (credError) {
          console.error(`Credential save error for ${profile.email}:`, credError);
          errors.push(`${profile.email}: ${credError.message}`);
          continue;
        }

        createdPasswords.push({
          email: profile.email,
          name: `${profile.first_name} ${profile.last_name}`,
          temp_password: tempPassword
        });

        processed++;
        console.log(`✓ Temporary password created for ${profile.email}`);

      } catch (error: any) {
        console.error(`Error processing ${profile.email}:`, error);
        errors.push(`${profile.email}: ${error.message}`);
      }
    }

    console.log(`Password generation completed: ${processed}/${profilesToProcess.length} success`);

    return new Response(JSON.stringify({
      success: true,
      processed,
      total: profilesToProcess.length,
      alreadyExisting: profiles.length - profilesToProcess.length,
      createdPasswords,
      errors
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (e: any) {
    console.error('generate-temp-passwords error:', e);
    return new Response(JSON.stringify({ 
      error: e.message || 'Erreur inconnue',
      details: e.toString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});