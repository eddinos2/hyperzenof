-- Corriger le campus_id manquant pour Pierre Martin (directeur Roquette)
UPDATE profiles 
SET campus_id = '5dc13554-edc3-487e-9e36-1f64dfcb33df' 
WHERE email = 'directeur.roquette@aurlom.com';

-- Créer une fonction pour prévalider en masse les lignes d'un campus
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
  
  -- Vérifier si toutes les lignes de la facture sont maintenant prévalidées
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