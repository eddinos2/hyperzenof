-- Créer une table pour les demandes de création d'utilisateurs
CREATE TABLE public.user_creation_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  campus_id UUID NOT NULL REFERENCES public.campus(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'ENSEIGNANT',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  justification TEXT,
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_creation_requests ENABLE ROW LEVEL SECURITY;

-- Politique pour que les directeurs voient leurs propres demandes
CREATE POLICY "Directors can view their requests"
ON public.user_creation_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM get_current_user_role_and_campus() user_info
    WHERE user_info.role = 'DIRECTEUR_CAMPUS'
    AND requested_by = auth.uid()
  )
);

-- Politique pour que les directeurs créent des demandes pour leur campus
CREATE POLICY "Directors can create requests for their campus"
ON public.user_creation_requests
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM get_current_user_role_and_campus() user_info
    WHERE user_info.role = 'DIRECTEUR_CAMPUS'
    AND user_info.campus_id = campus_id
    AND requested_by = auth.uid()
  )
);

-- Politique pour que les super admins voient et gèrent toutes les demandes
CREATE POLICY "Super admins can manage all requests"
ON public.user_creation_requests
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM get_current_user_role_and_campus() user_info
    WHERE user_info.role = 'SUPER_ADMIN'
  )
);

-- Trigger pour updated_at
CREATE TRIGGER update_user_creation_requests_updated_at
BEFORE UPDATE ON public.user_creation_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();