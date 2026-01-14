-- Créer des directeurs de campus pour chaque campus
-- Roquette : directeur.roquette@aurlom.com (existe déjà)
-- Créer les autres directeurs

-- Ajouter une colonne observations sur les factures et lignes de factures
ALTER TABLE invoice ADD COLUMN observations TEXT;
ALTER TABLE invoice_line ADD COLUMN observations TEXT;
ALTER TABLE invoice_line ADD COLUMN prevalidated_by UUID REFERENCES profiles(user_id);
ALTER TABLE invoice_line ADD COLUMN prevalidated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE invoice_line ADD COLUMN validation_status TEXT DEFAULT 'pending' CHECK (validation_status IN ('pending', 'prevalidated', 'validated', 'rejected'));

-- Ajouter une contrainte pour empêcher la modification du RIB quand une facture est en attente
CREATE OR REPLACE FUNCTION prevent_rib_change_on_pending_invoice()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifier si l'utilisateur a des factures en attente (pending ou prevalidated)
  IF EXISTS (
    SELECT 1 FROM invoice 
    WHERE teacher_id = NEW.user_id 
    AND status IN ('pending', 'prevalidated')
  ) THEN
    -- Si on essaie de modifier le RIB
    IF OLD.rib_iban IS DISTINCT FROM NEW.rib_iban 
       OR OLD.rib_bic IS DISTINCT FROM NEW.rib_bic 
       OR OLD.rib_account_holder IS DISTINCT FROM NEW.rib_account_holder 
       OR OLD.rib_bank_name IS DISTINCT FROM NEW.rib_bank_name THEN
      RAISE EXCEPTION 'Impossible de modifier les informations bancaires tant qu''une facture est en attente de validation';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;