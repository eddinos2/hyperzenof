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
      return new Response(JSON.stringify({ error: 'Forbidden - Super Admin required' }), { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log('Creating real users for Aurlom system...');

    // Get active campuses to create directors
    const { data: campuses } = await supabaseAdmin
      .from('campus')
      .select('id, name')
      .eq('is_active', true);

    console.log('Found campuses:', campuses?.map(c => c.name));

    const usersToCreate = [
      // Test teacher
      {
        email: 'sam@aurlom.com',
        password: 'Sam2024!',
        first_name: 'Sam',
        last_name: 'Enseignant',
        role: 'ENSEIGNANT' as any,
        campus_id: campuses?.[0]?.id || null,
      },
      // Campus directors (only create if missing)
      ...(campuses || []).map((campus: any) => ({
        email: `${campus.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@aurlom.com`,
        password: 'DirecteurAurlom2024!',
        first_name: 'Directeur',
        last_name: campus.name,
        role: 'DIRECTEUR_CAMPUS' as any,
        campus_id: campus.id,
      })),
    ];

    let created = 0;
    const createdUsers: any[] = [];
    const errors: string[] = [];

    for (const user of usersToCreate) {
      try {
        console.log(`Processing user: ${user.email} (${user.role})`);

        // Check if user already exists
        const { data: existingProfile } = await supabaseAdmin
          .from('profiles')
          .select('id, email')
          .eq('email', user.email)
          .maybeSingle();

        if (existingProfile) {
          console.log(`User ${user.email} already exists, skipping`);
          continue;
        }

        // Create auth user using admin API
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
          user_metadata: {
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role
          }
        });

        if (authError) {
          console.error(`Auth creation error for ${user.email}:`, authError);
          errors.push(`${user.email}: ${authError.message}`);
          continue;
        }

        console.log(`✓ Auth user created: ${user.email}`);

        // Save temporary password for access management export
        await supabaseAdmin.from('temp_access_credentials').insert({
          user_id: authUser.user.id,
          email: user.email,
          temp_password: user.password,
          created_by: authData.user.id
        });

        // Update profile created by trigger
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role,
            campus_id: user.campus_id || null
          })
          .eq('user_id', authUser.user.id);

        if (profileError) {
          console.error(`Profile creation error for ${user.email}:`, profileError);
          errors.push(`${user.email}: ${profileError.message}`);
          // Try to cleanup auth user
          await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
          continue;
        }

        console.log(`✓ Profile created: ${user.email}`);

        // If it's a teacher, create teacher profile with banking info
        if (user.role === 'ENSEIGNANT') {
          const { error: teacherError } = await supabaseAdmin
            .from('teacher_profile')
            .insert({
              user_id: authUser.user.id,
              specialities: ['Informatique', 'Réseaux'],
              hourly_rate_min: 50.00,
              hourly_rate_max: 75.00,
              rib_account_holder: `${user.first_name} ${user.last_name}`,
              rib_bank_name: 'Banque de Test Aurlom',
              rib_iban: 'FR7630001007941234567890185',
              rib_bic: 'BDFEFRPPXXX'
            });

          if (teacherError) {
            console.warn(`Teacher profile creation error for ${user.email} (non-critical):`, teacherError);
          } else {
            console.log(`✓ Teacher profile created: ${user.email}`);
          }
        }

        created++;
        createdUsers.push({
          email: user.email,
          role: user.role,
          campus: user.campus_id ? campuses?.find((c: any) => c.id === user.campus_id)?.name : null
        });

      } catch (error: any) {
        console.error(`Error creating user ${user.email}:`, error);
        errors.push(`${user.email}: ${error.message}`);
      }
    }

    console.log(`Users creation completed: ${created}/${usersToCreate.length} success`);

    return new Response(JSON.stringify({
      success: true,
      created,
      total: usersToCreate.length,
      createdUsers,
      errors
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (e: any) {
    console.error('create-real-users error:', e);
    return new Response(JSON.stringify({ 
      success: false,
      error: e.message || 'Unknown error',
      details: e.toString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});