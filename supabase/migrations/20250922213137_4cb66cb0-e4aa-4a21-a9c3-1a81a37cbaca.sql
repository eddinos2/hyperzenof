-- Create seasonal themes settings table
CREATE TABLE public.seasonal_themes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  theme_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  start_date date,
  end_date date,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.seasonal_themes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Super admins can manage seasonal themes" 
ON public.seasonal_themes 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() 
  AND role = 'SUPER_ADMIN'
));

CREATE POLICY "All authenticated users can view active themes" 
ON public.seasonal_themes 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Add trigger for updated_at
CREATE TRIGGER update_seasonal_themes_updated_at
BEFORE UPDATE ON public.seasonal_themes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default themes
INSERT INTO public.seasonal_themes (theme_name, is_active, created_by) VALUES 
('default', true, (SELECT user_id FROM profiles WHERE role = 'SUPER_ADMIN' LIMIT 1)),
('halloween', false, (SELECT user_id FROM profiles WHERE role = 'SUPER_ADMIN' LIMIT 1)),
('christmas', false, (SELECT user_id FROM profiles WHERE role = 'SUPER_ADMIN' LIMIT 1)),
('newyear', false, (SELECT user_id FROM profiles WHERE role = 'SUPER_ADMIN' LIMIT 1)),
('valentine', false, (SELECT user_id FROM profiles WHERE role = 'SUPER_ADMIN' LIMIT 1)),
('spring', false, (SELECT user_id FROM profiles WHERE role = 'SUPER_ADMIN' LIMIT 1)),
('summer', false, (SELECT user_id FROM profiles WHERE role = 'SUPER_ADMIN' LIMIT 1));