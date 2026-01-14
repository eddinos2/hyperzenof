-- Créer table pour tracker les tentatives de connexion
CREATE TABLE public.login_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address INET NOT NULL,
  email TEXT,
  attempt_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  success BOOLEAN NOT NULL DEFAULT false,
  user_agent TEXT,
  blocked_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour les recherches par IP et email
CREATE INDEX idx_login_attempts_ip ON public.login_attempts(ip_address);
CREATE INDEX idx_login_attempts_email ON public.login_attempts(email);
CREATE INDEX idx_login_attempts_time ON public.login_attempts(attempt_time);

-- Fonction pour vérifier si une IP/email est bloquée
CREATE OR REPLACE FUNCTION public.is_login_blocked(
  check_ip INET, 
  check_email TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  failed_attempts INTEGER;
  last_attempt TIMESTAMP WITH TIME ZONE;
  block_until TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Compter les échecs des 15 dernières minutes
  SELECT COUNT(*), MAX(attempt_time), MAX(blocked_until)
  INTO failed_attempts, last_attempt, block_until
  FROM public.login_attempts
  WHERE ip_address = check_ip
    AND (check_email IS NULL OR email = check_email)
    AND success = false
    AND attempt_time > NOW() - INTERVAL '15 minutes';
  
  -- Si bloqué explicitement
  IF block_until IS NOT NULL AND block_until > NOW() THEN
    RETURN TRUE;
  END IF;
  
  -- Si 5+ échecs en 15 minutes
  IF failed_attempts >= 5 THEN
    -- Bloquer pour 15 minutes à partir du dernier échec
    INSERT INTO public.login_attempts (
      ip_address, email, attempt_time, success, blocked_until
    ) VALUES (
      check_ip, check_email, NOW(), false, NOW() + INTERVAL '15 minutes'
    );
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Fonction pour enregistrer une tentative
CREATE OR REPLACE FUNCTION public.log_login_attempt(
  attempt_ip INET,
  attempt_email TEXT,
  attempt_success BOOLEAN,
  attempt_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  attempt_id UUID;
BEGIN
  INSERT INTO public.login_attempts (
    ip_address, email, success, user_agent
  ) VALUES (
    attempt_ip, attempt_email, attempt_success, attempt_user_agent
  ) RETURNING id INTO attempt_id;
  
  RETURN attempt_id;
END;
$$;