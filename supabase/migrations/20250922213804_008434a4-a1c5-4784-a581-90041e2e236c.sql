-- Create a function to atomically set active theme
CREATE OR REPLACE FUNCTION public.set_active_theme(theme_name text)
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
  WHERE theme_name = set_active_theme.theme_name;
END;
$$;