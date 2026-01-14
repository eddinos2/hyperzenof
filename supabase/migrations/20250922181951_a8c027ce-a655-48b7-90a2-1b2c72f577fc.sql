-- Système de logging avancé pour tracer toutes les actions utilisateur
CREATE TABLE public.user_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  browser_info JSONB,
  device_info JSONB,
  location_info JSONB,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  duration_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT
);

-- Index pour performance
CREATE INDEX idx_user_activity_log_user_id ON public.user_activity_log(user_id);
CREATE INDEX idx_user_activity_log_timestamp ON public.user_activity_log(timestamp);
CREATE INDEX idx_user_activity_log_action ON public.user_activity_log(action);
CREATE INDEX idx_user_activity_log_entity ON public.user_activity_log(entity_type, entity_id);

-- RLS pour sécuriser les logs
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

-- Policy pour voir ses propres logs
CREATE POLICY "Users can view their own activity logs" 
ON public.user_activity_log 
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy pour Super Admin voir tous les logs
CREATE POLICY "Super admin can view all activity logs" 
ON public.user_activity_log 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() 
  AND role = 'SUPER_ADMIN'
));

-- Policy pour insérer des logs (tous les utilisateurs authentifiés)
CREATE POLICY "Authenticated users can insert activity logs" 
ON public.user_activity_log 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Fonction pour enregistrer automatiquement l'activité
CREATE OR REPLACE FUNCTION public.log_user_activity(
  action_param TEXT,
  entity_type_param TEXT DEFAULT NULL,
  entity_id_param UUID DEFAULT NULL,
  details_param JSONB DEFAULT NULL,
  ip_address_param INET DEFAULT NULL,
  user_agent_param TEXT DEFAULT NULL,
  browser_info_param JSONB DEFAULT NULL,
  device_info_param JSONB DEFAULT NULL,
  duration_ms_param INTEGER DEFAULT NULL,
  success_param BOOLEAN DEFAULT true,
  error_message_param TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  log_id UUID;
  current_user_id UUID;
BEGIN
  -- Récupérer l'utilisateur actuel
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Insérer le log
  INSERT INTO public.user_activity_log (
    user_id,
    action,
    entity_type,
    entity_id,
    details,
    ip_address,
    user_agent,
    browser_info,
    device_info,
    duration_ms,
    success,
    error_message
  ) VALUES (
    current_user_id,
    action_param,
    entity_type_param,
    entity_id_param,
    details_param,
    ip_address_param,
    user_agent_param,
    browser_info_param,
    device_info_param,
    duration_ms_param,
    success_param,
    error_message_param
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$function$;

-- Table pour assigner les enseignants automatiquement
CREATE TABLE public.teacher_assignment_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  campus_names TEXT, -- Campus séparés par virgules
  is_processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  assigned_user_id UUID,
  error_message TEXT
);

-- RLS pour la table d'assignation
ALTER TABLE public.teacher_assignment_data ENABLE ROW LEVEL SECURITY;

-- Policy pour Super Admin uniquement
CREATE POLICY "Super admin can manage teacher assignment data" 
ON public.teacher_assignment_data 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() 
  AND role = 'SUPER_ADMIN'
));

-- Ajouter la colonne phone au profil utilisateur si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'phone' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN phone TEXT;
  END IF;
END $$;