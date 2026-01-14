-- Corriger la récursion infinie dans les politiques RLS
-- Créer une fonction SECURITY DEFINER pour éviter la récursion

-- Function pour vérifier si un utilisateur peut voir une facture spécifique
CREATE OR REPLACE FUNCTION public.can_user_view_invoice(invoice_id_param uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role user_role;
  user_campus_id uuid;
  invoice_teacher_id uuid;
  invoice_campus_id uuid;
BEGIN
  -- Récupérer les infos utilisateur
  SELECT role, campus_id INTO user_role, user_campus_id
  FROM profiles 
  WHERE user_id = user_id_param;
  
  -- Récupérer les infos facture
  SELECT teacher_id, campus_id INTO invoice_teacher_id, invoice_campus_id
  FROM invoice 
  WHERE id = invoice_id_param;
  
  -- Super admin et comptable peuvent tout voir
  IF user_role IN ('SUPER_ADMIN', 'COMPTABLE') THEN
    RETURN TRUE;
  END IF;
  
  -- Enseignant peut voir ses propres factures
  IF user_role = 'ENSEIGNANT' AND invoice_teacher_id = user_id_param THEN
    RETURN TRUE;
  END IF;
  
  -- Directeur campus peut voir :
  -- 1. Les factures de son campus
  -- 2. Les factures qui contiennent des lignes de son campus
  IF user_role = 'DIRECTEUR_CAMPUS' AND user_campus_id IS NOT NULL THEN
    -- Facture du même campus
    IF invoice_campus_id = user_campus_id THEN
      RETURN TRUE;
    END IF;
    
    -- Facture contenant des lignes de son campus
    IF EXISTS (
      SELECT 1 FROM invoice_line il 
      WHERE il.invoice_id = invoice_id_param 
      AND il.campus_id = user_campus_id
    ) THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Remplacer les politiques problématiques par des plus simples

-- Supprimer les anciennes politiques problématiques
DROP POLICY IF EXISTS "Campus directors can view invoices in their campus" ON public.invoice;
DROP POLICY IF EXISTS "Campus directors can update invoices in their campus" ON public.invoice;

-- Nouvelle politique simplifiée pour les directeurs
CREATE POLICY "Directors can view allowed invoices"
ON public.invoice
FOR SELECT
USING (
  CASE 
    WHEN auth.uid() IS NULL THEN FALSE
    ELSE can_user_view_invoice(id, auth.uid())
  END
);

CREATE POLICY "Directors can update allowed invoices"
ON public.invoice
FOR UPDATE
USING (
  CASE 
    WHEN auth.uid() IS NULL THEN FALSE
    ELSE can_user_view_invoice(id, auth.uid())
  END
);