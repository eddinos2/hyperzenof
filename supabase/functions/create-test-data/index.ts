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
    const { action } = await req.json();

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

    if (action === 'create') {
      console.log('Creating test data...');

      // Get some teachers and campus
      const { data: teachers } = await supabaseAdmin
        .from('profiles')
        .select('user_id, first_name, last_name, email, campus_id')
        .eq('role', 'ENSEIGNANT')
        .eq('is_active', true)
        .limit(3);

      const { data: campuses } = await supabaseAdmin
        .from('campus')
        .select('id, name')
        .eq('is_active', true);

      const { data: filieres } = await supabaseAdmin
        .from('filiere')
        .select('id, label')
        .eq('is_active', true)
        .limit(3);

      if (!teachers || teachers.length === 0 || !campuses || !filieres) {
        return new Response(JSON.stringify({ 
          error: 'Pas assez de données de base (enseignants, campus, filières)' 
        }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Create test invoices for each teacher
      const testInvoices = [];
      let createdInvoices = 0;

      for (const teacher of teachers) {
        try {
          // Create invoice
          const { data: invoice, error: invoiceError } = await supabaseAdmin
            .from('invoice')
            .insert({
              teacher_id: teacher.user_id,
              campus_id: teacher.campus_id || campuses[0].id,
              month: 11,
              year: 2024,
              total_ht: 2400.00,
              total_ttc: 2880.00,
              status: 'pending',
              notes: 'Facture de test - À SUPPRIMER après tests'
            })
            .select()
            .single();

          if (invoiceError) {
            console.error('Error creating invoice:', invoiceError);
            continue;
          }

          // Create invoice lines
          const lines = [
            {
              invoice_id: invoice.id,
              date: '2024-11-05',
              start_time: '09:00',
              end_time: '12:00',
              hours_qty: 3,
              unit_price: 60.00,
              course_title: 'Développement Web Avancé',
              filiere_id: filieres[0].id,
              campus_id: teacher.campus_id || campuses[0].id,
              validation_status: 'pending'
            },
            {
              invoice_id: invoice.id,
              date: '2024-11-12',
              start_time: '14:00',
              end_time: '18:00',
              hours_qty: 4,
              unit_price: 65.00,
              course_title: 'Architecture Logicielle',
              filiere_id: filieres[1] ? filieres[1].id : filieres[0].id,
              campus_id: teacher.campus_id || campuses[0].id,
              validation_status: 'pending'
            },
            {
              invoice_id: invoice.id,
              date: '2024-11-19',
              start_time: '10:00',
              end_time: '16:00',
              hours_qty: 6,
              unit_price: 70.00,
              course_title: 'Projet Intégrateur',
              filiere_id: filieres[2] ? filieres[2].id : filieres[0].id,
              campus_id: teacher.campus_id || campuses[0].id,
              validation_status: 'pending'
            }
          ];

          const { error: linesError } = await supabaseAdmin
            .from('invoice_line')
            .insert(lines);

          if (linesError) {
            console.error('Error creating lines:', linesError);
            continue;
          }

          // Update teacher profile with fake RIB for testing
          await supabaseAdmin
            .from('teacher_profile')
            .upsert({
              user_id: teacher.user_id,
              rib_account_holder: `${teacher.first_name} ${teacher.last_name}`,
              rib_bank_name: 'Banque Test Aurlom',
              rib_iban: `FR76${Math.random().toString().slice(2, 25)}`,
              rib_bic: 'TESTFR2AXXX',
              specialities: ['Test', 'Formation'],
              hourly_rate_min: 50.00,
              hourly_rate_max: 75.00
            }, { onConflict: 'user_id' });

          testInvoices.push({
            teacher: `${teacher.first_name} ${teacher.last_name}`,
            email: teacher.email,
            invoice_id: invoice.id,
            total: 2880.00
          });

          createdInvoices++;
          console.log(`✓ Test invoice created for ${teacher.email}`);

        } catch (error: any) {
          console.error(`Error for teacher ${teacher.email}:`, error);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        message: `${createdInvoices} factures de test créées`,
        invoices: testInvoices
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });

    } else if (action === 'cleanup') {
      console.log('Cleaning up test data...');

      // Delete test invoices and related data
      const { data: testInvoices } = await supabaseAdmin
        .from('invoice')
        .select('id')
        .ilike('notes', '%test%');

      let deletedCount = 0;
      if (testInvoices && testInvoices.length > 0) {
        const invoiceIds = testInvoices.map(i => i.id);
        
        // Delete invoice lines first
        await supabaseAdmin
          .from('invoice_line')
          .delete()
          .in('invoice_id', invoiceIds);

        // Delete validation logs
        await supabaseAdmin
          .from('validation_log')
          .delete()
          .in('invoice_id', invoiceIds);

        // Delete payments
        await supabaseAdmin
          .from('payment')
          .delete()
          .in('invoice_id', invoiceIds);

        // Delete invoices
        const { error: deleteError } = await supabaseAdmin
          .from('invoice')
          .delete()
          .in('id', invoiceIds);

        if (!deleteError) {
          deletedCount = testInvoices.length;
        }
      }

      // Reset RIB test data
      await supabaseAdmin
        .from('teacher_profile')
        .update({
          rib_iban: null,
          rib_bic: null,
          rib_account_holder: null,
          rib_bank_name: null
        })
        .ilike('rib_bank_name', '%test%');

      return new Response(JSON.stringify({
        success: true,
        message: `${deletedCount} factures de test supprimées`,
        cleaned: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ error: 'Action non reconnue' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (e: any) {
    console.error('create-test-data error:', e);
    return new Response(JSON.stringify({ 
      error: e.message || 'Erreur inconnue',
      details: e.toString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});