-- Ajouter une fonction pour créer une notification pour l'enseignant
CREATE OR REPLACE FUNCTION public.notify_teacher_rejection(
  teacher_user_id UUID,
  invoice_id_param UUID,
  rejection_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  invoice_info RECORD;
BEGIN
  -- Récupérer les informations de la facture
  SELECT month, year INTO invoice_info
  FROM invoice 
  WHERE id = invoice_id_param;
  
  -- Créer la notification pour l'enseignant
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    is_read
  ) VALUES (
    teacher_user_id,
    'warning',
    'Facture rejetée',
    format('Votre facture %s/%s a été rejetée. Motif: %s', 
           invoice_info.month, 
           invoice_info.year, 
           COALESCE(rejection_reason, 'Aucun motif spécifié')),
    false
  );
END;
$$;