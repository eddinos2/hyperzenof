import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  try {
    const nowIso = new Date().toISOString();

    // Fetch unassigned rows (assigned_user_id is null) to reconcile
    const { data: items, error: fetchError } = await supabase
      .from("teacher_assignment_data")
      .select("id,email,campus_names")
      .is("assigned_user_id", null)
      .limit(2000);

    if (fetchError) throw fetchError;

    let processed = 0;
    let matched = 0;
    let unmatched = 0;
    let campusUpdated = 0;

    // Helper to clean email
    const cleanEmail = (e?: string | null) => (e || "").trim().toLowerCase();

    for (const item of items || []) {
      processed++;
      const email = cleanEmail(item.email);
      if (!email) {
        unmatched++;
        await supabase
          .from("teacher_assignment_data")
          .update({
            is_processed: true,
            processed_at: nowIso,
            error_message: "Email manquant",
          })
          .eq("id", item.id);
        continue;
      }

      // Try to find profile by email (case-insensitive)
      const { data: profiles, error: profErr } = await supabase
        .from("profiles")
        .select("user_id,email,campus_id")
        .ilike("email", email);

      if (profErr) throw profErr;

      if (!profiles || profiles.length === 0) {
        unmatched++;
        await supabase
          .from("teacher_assignment_data")
          .update({
            is_processed: true,
            processed_at: nowIso,
            error_message: "Aucun profil trouvé pour cet email",
          })
          .eq("id", item.id);
        continue;
      }

      const profile = profiles[0];

      // Update assignment
      const { error: updErr } = await supabase
        .from("teacher_assignment_data")
        .update({
          assigned_user_id: profile.user_id,
          is_processed: true,
          processed_at: nowIso,
          error_message: null,
        })
        .eq("id", item.id);

      if (updErr) throw updErr;
      matched++;

      // Optional campus mapping: set profile.campus_id if empty and campus names provided
      const campusNamesRaw = (item.campus_names || "").trim();
      if (!profile.campus_id && campusNamesRaw) {
        const firstCampusName = campusNamesRaw.split(/[,;/|]+/)[0].trim();
        if (firstCampusName) {
          const { data: campusList, error: campusErr } = await supabase
            .from("campus")
            .select("id,name")
            .ilike("name", firstCampusName)
            .limit(2);

          if (campusErr) throw campusErr;

          if (campusList && campusList.length === 1) {
            const campusId = campusList[0].id as string;
            const { error: profUpdateErr } = await supabase
              .from("profiles")
              .update({ campus_id: campusId })
              .eq("user_id", profile.user_id);

            if (!profUpdateErr) campusUpdated++;
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ processed, matched, unmatched, campusUpdated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("assign-teachers error", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});