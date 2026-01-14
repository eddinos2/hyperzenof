-- Créer une table pour stocker temporairement les mots de passe d'accès
CREATE TABLE public.temp_access_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  temp_password TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  exported_at TIMESTAMP WITH TIME ZONE NULL,
  is_password_changed BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.temp_access_credentials ENABLE ROW LEVEL SECURITY;

-- Policy pour les super admins seulement
CREATE POLICY "Super admins can manage temp credentials" 
ON public.temp_access_credentials 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() 
  AND role = 'SUPER_ADMIN'
));

-- Index pour optimiser les requêtes
CREATE INDEX idx_temp_credentials_user_id ON public.temp_access_credentials(user_id);
CREATE INDEX idx_temp_credentials_created_by ON public.temp_access_credentials(created_by);