import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteInvoiceRequest {
  invoiceId: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('Delete invoice function called');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization token
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Token d\'autorisation manquant' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify JWT and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: user, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user.user) {
      return new Response(JSON.stringify({ error: 'Token invalide' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if user is SUPER_ADMIN
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.user.id)
      .single();

    if (profileError || profile.role !== 'SUPER_ADMIN') {
      return new Response(JSON.stringify({ error: 'Accès non autorisé. Seuls les Super Admins peuvent supprimer des factures.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { invoiceId }: DeleteInvoiceRequest = await req.json();
    
    console.log(`Deleting invoice ${invoiceId} by super admin ${user.user.id}`);

    // Delete invoice lines first
    const { error: linesError } = await supabase
      .from('invoice_line')
      .delete()
      .eq('invoice_id', invoiceId);

    if (linesError) {
      console.error('Error deleting invoice lines:', linesError);
      throw new Error(`Failed to delete invoice lines: ${linesError.message}`);
    }

    // Delete the invoice
    const { error: invoiceError } = await supabase
      .from('invoice')
      .delete()
      .eq('id', invoiceId);

    if (invoiceError) {
      console.error('Error deleting invoice:', invoiceError);
      throw new Error(`Failed to delete invoice: ${invoiceError.message}`);
    }

    console.log(`Invoice ${invoiceId} deleted successfully`);

    return new Response(
      JSON.stringify({ message: 'Facture supprimée avec succès', invoiceId }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Delete invoice error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erreur lors de la suppression de la facture', 
        details: error.message 
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
};

serve(handler);