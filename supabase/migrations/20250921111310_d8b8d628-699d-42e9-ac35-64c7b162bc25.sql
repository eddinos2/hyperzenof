-- Ajouter les informations bancaires (RIB) au profil enseignant
ALTER TABLE public.teacher_profile ADD COLUMN rib_iban TEXT;
ALTER TABLE public.teacher_profile ADD COLUMN rib_bic TEXT;
ALTER TABLE public.teacher_profile ADD COLUMN rib_bank_name TEXT;
ALTER TABLE public.teacher_profile ADD COLUMN rib_account_holder TEXT;

-- Ajouter le lien Drive de la facture PDF originale à la table invoice
ALTER TABLE public.invoice ADD COLUMN drive_pdf_url TEXT;
ALTER TABLE public.invoice ADD COLUMN original_filename TEXT;

-- Créer une table pour l'import en batch de factures CSV
CREATE TABLE public.invoice_import (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES auth.users(id),
  filename TEXT NOT NULL,
  drive_url TEXT,
  import_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_lines INTEGER NOT NULL DEFAULT 0,
  processed_lines INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, error
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS sur la nouvelle table
ALTER TABLE public.invoice_import ENABLE ROW LEVEL SECURITY;

-- Politique RLS pour invoice_import
CREATE POLICY "Teachers can manage their own imports" ON public.invoice_import
  FOR ALL USING (teacher_id = auth.uid());

CREATE POLICY "Campus directors can view imports in their campus" ON public.invoice_import
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p1
      JOIN public.profiles p2 ON p2.user_id = invoice_import.teacher_id
      WHERE p1.user_id = auth.uid() 
      AND p1.role = 'DIRECTEUR_CAMPUS' 
      AND p1.campus_id = p2.campus_id
    )
  );

CREATE POLICY "Comptables and super admins can view all imports" ON public.invoice_import
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('SUPER_ADMIN', 'COMPTABLE')
    )
  );

-- Ajouter des index pour les performances
CREATE INDEX idx_teacher_profile_rib ON public.teacher_profile(rib_iban) WHERE rib_iban IS NOT NULL;
CREATE INDEX idx_invoice_drive_url ON public.invoice(drive_pdf_url) WHERE drive_pdf_url IS NOT NULL;
CREATE INDEX idx_invoice_import_teacher_status ON public.invoice_import(teacher_id, status);
CREATE INDEX idx_invoice_import_date ON public.invoice_import(import_date);