import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const recaptchaSecret = Deno.env.get('RECAPTCHA_SECRET_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, recaptchaToken } = await req.json();
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || '';

    console.log('Login attempt for:', email, 'from IP:', clientIP);

    // Créer client Supabase avec service role
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Vérifier reCAPTCHA
    const recaptchaResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${recaptchaSecret}&response=${recaptchaToken}&remoteip=${clientIP}`,
    });

    const recaptchaData = await recaptchaResponse.json();
    
    if (!recaptchaData.success) {
      console.error('reCAPTCHA failed:', recaptchaData);
      
      // Log l'échec
      await supabase.rpc('log_login_attempt', {
        attempt_ip: clientIP,
        attempt_email: email,
        attempt_success: false,
        attempt_user_agent: userAgent
      });

      return new Response(
        JSON.stringify({ 
          error: 'Vérification reCAPTCHA échouée', 
          blocked: false 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 2. Vérifier si l'IP/email est bloqué
    const { data: isBlocked } = await supabase.rpc('is_login_blocked', {
      check_ip: clientIP,
      check_email: email
    });

    if (isBlocked) {
      console.log('Login blocked for:', email, 'IP:', clientIP);
      
      return new Response(
        JSON.stringify({ 
          error: 'Trop de tentatives échouées. Compte temporairement bloqué.', 
          blocked: true 
        }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 3. Tenter la connexion
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // 4. Logger la tentative
    await supabase.rpc('log_login_attempt', {
      attempt_ip: clientIP,
      attempt_email: email,
      attempt_success: !authError,
      attempt_user_agent: userAgent
    });

    if (authError) {
      console.error('Auth error:', authError);
      
      return new Response(
        JSON.stringify({ 
          error: authError.message,
          blocked: false 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Login successful for:', email);

    return new Response(
      JSON.stringify({ 
        success: true,
        session: authData.session,
        user: authData.user
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in verify-login function:', error);
    
    return new Response(
      JSON.stringify({ error: 'Erreur serveur interne' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});