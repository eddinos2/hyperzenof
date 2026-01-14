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
  const supabaseUser = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
  });

  try {
    // Helper function to generate random password
    function generateRandomPassword(): string {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%';
      let password = '';
      for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return password;
    }

    const { 
      first_name, 
      last_name, 
      email, 
      phone, 
      role, 
      campus_id, 
      password 
    } = await req.json();

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
      return new Response(JSON.stringify({ error: 'Seuls les super admins peuvent créer des utilisateurs' }), { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Generate random password if not provided
    const userPassword = password || generateRandomPassword();

    // Validate required fields
    if (!first_name || !last_name || !email || !role) {
      return new Response(JSON.stringify({ 
        error: 'Champs obligatoires manquants: prénom, nom, email, rôle' 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log(`Création utilisateur: ${email} (${role})`);

    // Check if user already exists
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, user_id')
      .eq('email', email)
      .maybeSingle();

    if (existingProfile) {
      console.log(`✓ Utilisateur ${email} existe déjà, demande clôturée`);
      return new Response(JSON.stringify({ 
        success: true,
        alreadyExists: true,
        userId: existingProfile.user_id,
        message: 'Utilisateur déjà existant - demande clôturée'
      }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Create auth user
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: userPassword,
      email_confirm: true,
      user_metadata: {
        first_name,
        last_name,
        role
      }
    });

    if (authError) {
      console.error('Erreur création auth user:', authError);
      return new Response(JSON.stringify({ 
        error: `Erreur création utilisateur: ${authError.message}` 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Save temporary password for access management export
    await supabaseAdmin.from('temp_access_credentials').insert({
      user_id: authUser.user.id,
      email,
      temp_password: userPassword,
      created_by: authData.user.id
    });

    // Create or update profile (upsert)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        user_id: authUser.user.id,
        email,
        first_name,
        last_name,
        phone: phone || null,
        role: role as any,
        campus_id: campus_id || null
      }, {
        onConflict: 'user_id'
      });

    if (profileError) {
      console.error('Erreur création profil:', profileError);
      // Try to cleanup auth user if profile creation failed
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return new Response(JSON.stringify({ 
        error: `Erreur création profil: ${profileError.message}` 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // If it's a teacher, create or update teacher profile
    if (role === 'ENSEIGNANT') {
      const { error: teacherError } = await supabaseAdmin
        .from('teacher_profile')
        .upsert({
          user_id: authUser.user.id,
          specialities: [],
          hourly_rate_min: 50.00,
          hourly_rate_max: 75.00
        }, {
          onConflict: 'user_id'
        });

      if (teacherError) {
        console.warn('Erreur création profil enseignant (non critique):', teacherError);
        // Don't fail the whole operation for teacher profile
      }
    }

    console.log(`✓ Utilisateur créé avec succès: ${email}`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Utilisateur créé avec succès',
      user: {
        id: authUser.user.id,
        email,
        first_name,
        last_name,
        role
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (e: any) {
    console.error('create-user error:', e);
    return new Response(JSON.stringify({ 
      error: e.message || 'Erreur inconnue',
      details: e.toString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});