-- Créer le trigger pour empêcher la modification du RIB
CREATE TRIGGER prevent_rib_change_trigger
  BEFORE UPDATE ON teacher_profile
  FOR EACH ROW EXECUTE FUNCTION prevent_rib_change_on_pending_invoice();

-- Créer des fonctions pour la logique de prévalidation
CREATE OR REPLACE FUNCTION can_prevalidate_invoice_line(line_id UUID, director_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Un directeur peut prévalider une ligne seulement si :
  -- 1. Il est directeur de campus
  -- 2. La ligne appartient à son campus
  -- 3. La ligne n'est pas encore prévalidée
  RETURN EXISTS (
    SELECT 1 
    FROM invoice_line il
    JOIN profiles p ON p.user_id = director_user_id
    WHERE il.id = line_id
    AND p.role = 'DIRECTEUR_CAMPUS'
    AND p.campus_id = il.campus_id
    AND il.validation_status = 'pending'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fonction pour prévalider une ligne
CREATE OR REPLACE FUNCTION prevalidate_invoice_line(line_id UUID, director_user_id UUID, observation TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
  -- Vérifier si le directeur peut prévalider cette ligne
  IF NOT can_prevalidate_invoice_line(line_id, director_user_id) THEN
    RETURN FALSE;
  END IF;
  
  -- Prévalider la ligne
  UPDATE invoice_line 
  SET 
    validation_status = 'prevalidated',
    prevalidated_by = director_user_id,
    prevalidated_at = NOW(),
    observations = COALESCE(observation, observations)
  WHERE id = line_id;
  
  -- Vérifier si toutes les lignes de la facture sont prévalidées
  UPDATE invoice 
  SET status = 'prevalidated'
  WHERE id = (SELECT invoice_id FROM invoice_line WHERE id = line_id)
  AND NOT EXISTS (
    SELECT 1 FROM invoice_line 
    WHERE invoice_id = (SELECT invoice_id FROM invoice_line WHERE id = line_id)
    AND validation_status = 'pending'
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;