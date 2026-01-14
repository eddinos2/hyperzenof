-- Corriger la logique de statut des factures
-- Une facture ne doit être prévalidée que si TOUTES ses lignes le sont

-- Remettre les factures incorrectement marquées comme prévalidées en "pending"
UPDATE invoice 
SET status = 'pending'
WHERE status = 'prevalidated'
AND EXISTS (
  SELECT 1 FROM invoice_line 
  WHERE invoice_id = invoice.id 
  AND validation_status = 'pending'
);

-- Corriger la fonction prevalidate_invoice_line pour bien vérifier toutes les lignes
CREATE OR REPLACE FUNCTION public.prevalidate_invoice_line(line_id uuid, director_user_id uuid, observation text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  invoice_id_var uuid;
BEGIN
  -- Vérifier si le directeur peut prévalider cette ligne (même campus uniquement)
  IF NOT can_prevalidate_invoice_line(line_id, director_user_id) THEN
    RETURN FALSE;
  END IF;
  
  -- Récupérer l'invoice_id avant la mise à jour
  SELECT invoice_id INTO invoice_id_var FROM invoice_line WHERE id = line_id;
  
  -- Prévalider la ligne
  UPDATE invoice_line 
  SET 
    validation_status = 'prevalidated',
    prevalidated_by = director_user_id,
    prevalidated_at = NOW(),
    observations = COALESCE(observation, observations)
  WHERE id = line_id;
  
  -- Vérifier si TOUTES les lignes de la facture sont maintenant prévalidées
  -- (aucune ligne en pending)
  UPDATE invoice 
  SET status = 'prevalidated'
  WHERE id = invoice_id_var
  AND NOT EXISTS (
    SELECT 1 FROM invoice_line 
    WHERE invoice_id = invoice_id_var
    AND validation_status = 'pending'
  );
  
  RETURN TRUE;
END;
$function$;

-- Corriger aussi la fonction bulk_prevalidate_invoice_lines
CREATE OR REPLACE FUNCTION public.bulk_prevalidate_invoice_lines(invoice_id_param uuid, director_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  lines_processed integer := 0;
  lines_total integer := 0;
  director_campus_id uuid;
BEGIN
  -- Récupérer le campus du directeur
  SELECT campus_id INTO director_campus_id 
  FROM profiles 
  WHERE user_id = director_user_id AND role = 'DIRECTEUR_CAMPUS';
  
  IF director_campus_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Campus non trouvé pour ce directeur');
  END IF;
  
  -- Compter le nombre total de lignes du campus en attente
  SELECT COUNT(*) INTO lines_total
  FROM invoice_line 
  WHERE invoice_id = invoice_id_param 
  AND campus_id = director_campus_id 
  AND validation_status = 'pending';
  
  IF lines_total = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Aucune ligne en attente pour ce campus');
  END IF;
  
  -- Prévalider toutes les lignes du campus en attente
  UPDATE invoice_line 
  SET 
    validation_status = 'prevalidated',
    prevalidated_by = director_user_id,
    prevalidated_at = NOW()
  WHERE invoice_id = invoice_id_param 
  AND campus_id = director_campus_id 
  AND validation_status = 'pending';
  
  GET DIAGNOSTICS lines_processed = ROW_COUNT;
  
  -- Vérifier si TOUTES les lignes de la facture sont maintenant prévalidées
  -- Mettre à jour le statut seulement s'il n'y a plus aucune ligne en pending
  UPDATE invoice 
  SET status = 'prevalidated'
  WHERE id = invoice_id_param
  AND NOT EXISTS (
    SELECT 1 FROM invoice_line 
    WHERE invoice_id = invoice_id_param
    AND validation_status = 'pending'
  );
  
  RETURN jsonb_build_object(
    'success', true, 
    'lines_processed', lines_processed,
    'lines_total', lines_total
  );
END;
$$;