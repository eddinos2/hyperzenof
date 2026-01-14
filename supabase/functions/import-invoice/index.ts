import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvoiceLine {
  month: string;
  date: Date;
  start_time: string;
  end_time: string;
  campus: string;
  filiere: string;
  class: string;
  course_title: string;
  is_late: boolean;
  hours_qty: number;
  unit_price: number;
  total_price: number;
}

interface ImportInvoiceRequest {
  csvData: {
    lines: InvoiceLine[];
    totalAmount: number;
    totalLines: number;
  };
  filename: string;
  driveUrl?: string;
  invoiceMonth?: number;
  invoiceYear?: number;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('Import invoice function called');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Create client with user token for RLS
    const userSupabase = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    // Verify user
    const { data: { user }, error: userError } = await userSupabase.auth.getUser();
    if (userError || !user) {
      console.error('User verification failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const { csvData, filename, driveUrl, invoiceMonth, invoiceYear }: ImportInvoiceRequest = await req.json();
    
    console.log(`Processing invoice import for user ${user.id}, ${csvData.totalLines} lines, period: ${invoiceMonth}/${invoiceYear}`);

    // 1. Create import record
    const { data: importRecord, error: importError } = await userSupabase
      .from('invoice_import')
      .insert({
        teacher_id: user.id,
        filename,
        drive_url: driveUrl || null,
        total_lines: csvData.totalLines,
        status: 'processing'
      })
      .select()
      .single();

    if (importError) {
      console.error('Failed to create import record:', importError);
      throw new Error(`Failed to create import record: ${importError.message}`);
    }

    try {
      // Récupérer les campus, filières et cours pour le mapping
      const { data: campuses } = await supabase
        .from('campus')
        .select('id, name')
        .eq('is_active', true);

      const { data: filieres } = await supabase
        .from('filiere')
        .select('id, code')
        .eq('is_active', true);

      if (!campuses || campuses.length === 0) {
        throw new Error('Aucun campus trouvé dans la base de données');
      }
      if (!filieres || filieres.length === 0) {
        throw new Error('Aucune filière trouvée dans la base de données');
      }

      // Normalize campus names for mapping
      const normalizeCampusName = (name: string): string => {
        return name.toUpperCase()
          .replace(/[ÀÁÂÃÄÅàáâãäå]/g, 'A')
          .replace(/[ÈÉÊËèéêë]/g, 'E')
          .replace(/[ÌÍÎÏìíîï]/g, 'I')
          .replace(/[ÒÓÔÕÖòóôõö]/g, 'O')
          .replace(/[ÙÚÛÜùúûü]/g, 'U')
          .replace(/[Çç]/g, 'C')
          .trim();
      };

      // Create campus mapping with normalized names
      const campusMap: Record<string, string> = {};
      campuses.forEach(campus => {
        const normalizedName = normalizeCampusName(campus.name);
        campusMap[normalizedName] = campus.id;
        
        // Direct mapping for all AURLOM campuses
        campusMap[campus.name.toUpperCase()] = campus.id;
        
        // Handle variations and accents for campus names
        if (campus.name === 'SAINT-SÉBASTIEN') {
          campusMap['SAINT-SEBASTIEN'] = campus.id;
          campusMap['ST-SEBASTIEN'] = campus.id;
          campusMap['ST-SÉBASTIEN'] = campus.id;
        }
      });

      // Create filiere mapping with code variations
      const filiereMap: Record<string, string> = {};
      const unknownFilieres = new Set<string>();
      
      filieres.forEach(filiere => {
        const code = filiere.code.toUpperCase();
        filiereMap[code] = filiere.id;
        
        // Map common variations
        if (code === 'SIO') {
          filiereMap['SLAM'] = filiere.id;
          filiereMap['SISR'] = filiere.id;
        }
        if (code === 'MOS') {
          filiereMap['MANAGEMENT OPERATIONNEL SECURITE'] = filiere.id;
        }
        if (code === 'MCO') {
          filiereMap['MANAGEMENT COMMERCIAL OPERATIONNEL'] = filiere.id;
        }
      });

      // Special mapping for unknown filieres in the CSV
      const filiereCodeMappings: Record<string, string> = {
        'CIEL': 'SIO', // Map CIEL to SIO as fallback
      };

      // 3. Get main campus for the invoice (most frequent campus in the data)
      const campusFrequency: Record<string, number> = {};
      csvData.lines.forEach(line => {
        const normalizedCampusName = normalizeCampusName(line.campus);
        campusFrequency[normalizedCampusName] = (campusFrequency[normalizedCampusName] || 0) + 1;
      });

      const mostFrequentCampusName = Object.keys(campusFrequency).reduce((a, b) => 
        campusFrequency[a] > campusFrequency[b] ? a : b
      );
      let mainCampusId = campusMap[mostFrequentCampusName];
      
      // If not found, try to find any AURLOM campus as fallback
      if (!mainCampusId) {
        console.log(`Trying to map campus: ${mostFrequentCampusName}`);
        // Use any available campus as fallback
        mainCampusId = Object.values(campusMap)[0];
      }
      
      if (!mainCampusId) {
        throw new Error(`Campus inconnu: ${mostFrequentCampusName}. Campuses disponibles: ${Object.keys(campusMap).join(', ')}`);
      }

      // 4. Determine invoice period
      const month = invoiceMonth || new Date().getMonth() + 1;
      const year = invoiceYear || new Date().getFullYear();
      
      // 5. Check for existing invoice this month for this teacher and campus
      let invoiceId: string;
      
      const { data: existingInvoice } = await userSupabase
        .from('invoice')
        .select('id')
        .eq('teacher_id', user.id)
        .eq('month', month)
        .eq('year', year)
        .eq('campus_id', mainCampusId)
        .maybeSingle();

      if (existingInvoice) {
        invoiceId = existingInvoice.id;
        console.log(`Using existing invoice: ${invoiceId}`);
      } else {
        const { data: newInvoice, error: invoiceError } = await userSupabase
          .from('invoice')
          .insert({
            teacher_id: user.id,
            campus_id: mainCampusId,
            month,
            year,
            status: 'pending',
            total_ttc: csvData.totalAmount,
            drive_pdf_url: driveUrl || null,
            original_filename: filename
          })
          .select('id')
          .single();
        
        if (invoiceError) {
          console.error('Invoice creation error:', invoiceError);
          throw new Error(`Failed to create invoice: ${invoiceError.message}`);
        }
        
        invoiceId = newInvoice.id;
        console.log(`Created new invoice: ${invoiceId}`);
      }

      // 6. Process and insert invoice lines
      const validLines: any[] = [];
      const errors: string[] = [];

      for (let i = 0; i < csvData.lines.length; i++) {
        const line = csvData.lines[i];
        
        // Ignorer les lignes vides ou incomplètes
        if (!line || !line.date || !line.campus || !line.filiere || !line.course_title || 
            line.date.trim() === '' || line.campus.trim() === '' || 
            line.filiere.trim() === '' || line.course_title.trim() === '') {
          console.log(`Ligne ${i + 1} ignorée (vide ou incomplète)`);
          continue;
        }
        
        try {
          // Map campus with fallback for variations
          const lineCampusName = normalizeCampusName(line.campus);
          let lineCampusId = campusMap[lineCampusName] || campusMap[line.campus.toUpperCase()];
          
          // Handle accent variations for Saint-Sébastien
          if (!lineCampusId && line.campus.toLowerCase().includes('saint')) {
            lineCampusId = campusMap['SAINT-SÉBASTIEN'] || campusMap['SAINT-SEBASTIEN'];
          }
          
          if (!lineCampusId) {
            errors.push(`Ligne ${i + 1}: Campus inconnu "${line.campus}". Campus disponibles: ${Object.keys(campusMap).join(', ')}`);
            continue;
          }

          // Map filiere with fallbacks
          let filiereCode = line.filiere.toUpperCase();
          let filiereId = filiereMap[filiereCode];
          
          // If not found, try mapped alternatives
          if (!filiereId && filiereCodeMappings[filiereCode]) {
            const mappedCode = filiereCodeMappings[filiereCode];
            filiereId = filiereMap[mappedCode];
            console.log(`Mapped filiere ${filiereCode} to ${mappedCode}`);
          }
          
          // If still not found, use a default filiere (first available)
          if (!filiereId && filieres && filieres.length > 0) {
            filiereId = filieres[0].id;
            unknownFilieres.add(filiereCode);
            console.warn(`Using default filiere for unknown code: ${filiereCode}`);
          }
          
          if (!filiereId) {
            errors.push(`Ligne ${i + 1}: Filière inconnue "${line.filiere}"`);
            continue;
          }

          validLines.push({
            invoice_id: invoiceId,
            date: new Date(line.date).toISOString().split('T')[0],
            start_time: line.start_time,
            end_time: line.end_time,
            hours_qty: line.hours_qty,
            unit_price: line.unit_price,
            filiere_id: filiereId,
            campus_id: lineCampusId,
            course_title: line.course_title,
            is_late: line.is_late
          });
        } catch (lineError: any) {
          errors.push(`Ligne ${i + 1}: ${lineError.message}`);
        }
      }

      if (validLines.length === 0) {
        throw new Error(`Aucune ligne valide trouvée. Erreurs: ${errors.join(', ')}`);
      }

      // Insert valid lines
      const { error: linesError } = await userSupabase
        .from('invoice_line')
        .insert(validLines);

      if (linesError) {
        console.error('Invoice lines insertion error:', linesError);
        throw new Error(`Failed to insert invoice lines: ${linesError.message}`);
      }

      // 7. Update import status
      await userSupabase
        .from('invoice_import')
        .update({
          status: 'completed',
          processed_lines: validLines.length,
          error_message: errors.length > 0 ? errors.join('; ') : null
        })
        .eq('id', importRecord.id);

      console.log(`Invoice import completed: ${validLines.length} lines processed, ${errors.length} errors`);

      return new Response(
        JSON.stringify({
          success: true,
          invoiceId,
          processedLines: validLines.length,
          totalLines: csvData.totalLines,
          errors: errors.length > 0 ? errors : null,
          unknownFilieres: unknownFilieres.size > 0 ? Array.from(unknownFilieres) : null,
          totalAmount: csvData.totalAmount
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );

    } catch (processingError: any) {
      console.error('Processing error:', processingError);
      
      // Update import status with error
      await userSupabase
        .from('invoice_import')
        .update({
          status: 'failed',
          error_message: processingError.message
        })
        .eq('id', importRecord.id);

      throw processingError;
    }

  } catch (error: any) {
    console.error('Import invoice function error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);