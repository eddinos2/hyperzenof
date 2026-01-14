-- Ajouter le campus NICE qui manque dans la liste
INSERT INTO public.campus (name, address) 
VALUES ('Nice', '123 Promenade des Anglais, 06000 Nice');

-- Ajouter filières pour Nice
INSERT INTO public.campus_filiere (campus_id, filiere_id) 
SELECT c.id, f.id FROM public.campus c, public.filiere f 
WHERE c.name = 'Nice' AND f.code IN ('COM', 'MCO', 'NDRC', 'CG', 'SAM', 'PI');

-- Ajouter téléphone aux profils
ALTER TABLE public.profiles ADD COLUMN phone TEXT;

-- Créer table pour l'import massif des professeurs
CREATE TABLE public.teacher_import (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  imported_by UUID NOT NULL REFERENCES auth.users(id),
  total_teachers INTEGER NOT NULL DEFAULT 0,
  processed_teachers INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, error
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS pour teacher_import
ALTER TABLE public.teacher_import ENABLE ROW LEVEL SECURITY;

-- Policies pour teacher_import
CREATE POLICY "Super admins can manage teacher imports" ON public.teacher_import
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  );

-- Ajouter colonnes manquantes pour suivi complet
ALTER TABLE public.profiles ADD COLUMN is_new_teacher BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN hire_date DATE;
ALTER TABLE public.profiles ADD COLUMN notes TEXT;