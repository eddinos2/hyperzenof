-- Corriger la fonction can_prevalidate_invoice_line pour vérifier le campus
CREATE OR REPLACE FUNCTION public.can_prevalidate_invoice_line(line_id uuid, director_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Un directeur peut prévalider une ligne seulement si :
  -- 1. Il est directeur de campus
  -- 2. La ligne appartient à son campus (pas celui d'un autre directeur)
  -- 3. La ligne n'est pas encore prévalidée
  RETURN EXISTS (
    SELECT 1 
    FROM invoice_line il
    JOIN profiles p ON p.user_id = director_user_id
    WHERE il.id = line_id
    AND p.role = 'DIRECTEUR_CAMPUS'
    AND p.campus_id = il.campus_id  -- RESTRICTION: même campus uniquement
    AND il.validation_status = 'pending'
  );
END;
$$;

-- Corriger la fonction prevalidate_invoice_line avec la même logique
CREATE OR REPLACE FUNCTION public.prevalidate_invoice_line(line_id uuid, director_user_id uuid, observation text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier si le directeur peut prévalider cette ligne (même campus uniquement)
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
$$;

-- Fonction helper pour obtenir le rôle et campus de l'utilisateur actuel (évite la récursion RLS)
CREATE OR REPLACE FUNCTION public.get_current_user_role_and_campus()
RETURNS TABLE(role user_role, campus_id uuid)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT p.role, p.campus_id 
  FROM public.profiles p 
  WHERE p.user_id = auth.uid();
$$;

-- Corriger la politique RLS pour invoice_line pour respecter les restrictions par campus
DROP POLICY IF EXISTS "Invoice lines follow invoice permissions" ON public.invoice_line;

CREATE POLICY "Invoice lines permissions by role and campus" 
ON public.invoice_line 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.invoice i
    WHERE i.id = invoice_line.invoice_id
    AND (
      -- L'enseignant propriétaire de la facture
      i.teacher_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.get_current_user_role_and_campus() user_info
        WHERE (
          -- Super Admin : accès total
          user_info.role = 'SUPER_ADMIN'
          OR 
          -- Comptable : accès total  
          user_info.role = 'COMPTABLE'
          OR
          -- Directeur Campus : seulement SON campus
          (user_info.role = 'DIRECTEUR_CAMPUS' AND user_info.campus_id = invoice_line.campus_id)
        )
      )
    )
  )
);