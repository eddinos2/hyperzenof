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
    const { teachers, filename } = await req.json();

    // Get invoking user and ensure SUPER_ADMIN using user client
    const { data: authData, error: authErr } = await supabaseUser.auth.getUser();
    if (authErr || !authData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const userId = authData.user.id;

    const { data: profile, error: profileErr } = await supabaseUser
      .from('profiles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileErr || !profile || profile.role !== 'SUPER_ADMIN') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Create import record using admin client
    const totalTeachers = Array.isArray(teachers) ? teachers.length : 0;
    const { data: importRec, error: importErr } = await supabaseAdmin
      .from('teacher_import')
      .insert({
        imported_by: userId,
        filename: filename || 'unknown.csv',
        total_teachers: totalTeachers,
        status: 'processing',
      })
      .select()
      .maybeSingle();

    if (importErr) throw importErr;

    // Build campus map using admin client
    const { data: campuses } = await supabaseAdmin.from('campus').select('id, name');
    const campusMap: Record<string, string> = {};
    (campuses || []).forEach((c: any) => {
      campusMap[c.name] = c.id;
      campusMap[c.name.toUpperCase()] = c.id;
      campusMap[c.name.toLowerCase()] = c.id;
    });

    // Helper to normalize campus (mirror client logic)
    const normalizeCampusName = (name: string) => {
      const normalizations: Record<string, string> = {
        'SAINT SEB': 'Saint-Sébastien',
        'SAINT-SEB': 'Saint-Sébastien',
        'SAINT SEBASTIEN': 'Saint-Sébastien',
        JAURES: 'Jaurès',
        ROQUETTE: 'Roquette',
        PICPUS: 'Picpus',
        SENTIER: 'Sentier',
        DOUAI: 'Douai',
        PARMENTIER: 'Parmentier',
        BOULOGNE: 'Boulogne',
        NICE: 'Nice',
        'JAURÈS': 'Jaurès',
      };
      const key = (name || '').toUpperCase().trim();
      return normalizations[key] || name;
    };

    let processed = 0;
    const errors: string[] = [];
    const unknownCampuses = new Set<string>();

    for (const t of teachers as any[]) {
      try {
        const email = (t.email || '').trim();
        if (!email) {
          errors.push(`${t.firstName} ${t.lastName}: email manquant`);
          continue;
        }

        // Skip if profile already exists using admin client
        const { data: existing } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('email', email)
          .maybeSingle();
        if (existing) {
          errors.push(`${email}: déjà existant`);
          continue;
        }

        // Create auth user using admin client
        const tempPassword = `aurlom${Math.random().toString(36).slice(2, 8)}`;
        const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { first_name: t.firstName, last_name: t.lastName },
        });
        if (createErr) {
          errors.push(`${email}: ${createErr.message}`);
          continue;
        }

        // Save temporary password for access management export
        await supabaseAdmin.from('temp_access_credentials').insert({
          user_id: created.user.id,
          email,
          temp_password: tempPassword,
          created_by: userId
        });

        const primaryCampus = t.primaryCampus ? normalizeCampusName(t.primaryCampus) : null;
        const campusId = primaryCampus ? (campusMap[primaryCampus] || campusMap[primaryCampus.toUpperCase()] || campusMap[primaryCampus.toLowerCase()]) : null;
        if (primaryCampus && !campusId) unknownCampuses.add(primaryCampus);

        // Update profile created by trigger using admin client 
        const { error: profErr } = await supabaseAdmin.from('profiles').update({
          email,
          first_name: t.firstName,
          last_name: t.lastName,
          phone: t.phone || null,
          role: 'ENSEIGNANT',
          campus_id: campusId,
          is_new_teacher: !!t.isNew,
          hire_date: t.isNew ? new Date().toISOString().split('T')[0] : null,
          notes: Array.isArray(t.campuses) && t.campuses.length > 1 ? `Campus multiples: ${t.campuses.join(', ')}` : null,
        }).eq('user_id', created.user.id);
        if (profErr) {
          errors.push(`${email}: ${profErr.message}`);
          continue;
        }

        // Insert teacher_profile using admin client
        await supabaseAdmin.from('teacher_profile').insert({
          user_id: created.user.id,
          specialities: [],
          hourly_rate_min: 50.0,
          hourly_rate_max: 75.0,
        });

        processed++;
      } catch (e: any) {
        errors.push(`${t.email || 'inconnu'}: ${e.message || 'erreur'}`);
      }
    }

    // Update import record using admin client
    if (importRec) {
      await supabaseAdmin
        .from('teacher_import')
        .update({
          status: 'completed',
          processed_teachers: processed,
          error_message: errors.length > 0 ? errors.slice(0, 10).join('; ') : null,
        })
        .eq('id', importRec.id);
    }

    const body = {
      success: true,
      totalTeachers,
      processedTeachers: processed,
      errors,
      unknownCampuses: Array.from(unknownCampuses),
    };

    return new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e: any) {
    console.error('bulk-import-teachers error', e);
    return new Response(JSON.stringify({ error: e.message || 'Erreur inconnue' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});