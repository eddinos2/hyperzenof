-- Drop and recreate the function with correct parameter name
DROP FUNCTION IF EXISTS public.set_active_theme(text);

CREATE OR REPLACE FUNCTION public.set_active_theme(p_theme_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- First deactivate all themes
  UPDATE public.seasonal_themes 
  SET is_active = false 
  WHERE is_active = true;
  
  -- Then activate the specified theme
  UPDATE public.seasonal_themes 
  SET is_active = true, updated_at = now()
  WHERE seasonal_themes.theme_name = p_theme_name;
END;
$$;