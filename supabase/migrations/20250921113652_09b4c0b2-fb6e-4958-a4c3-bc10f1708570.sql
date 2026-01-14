-- Fix the remaining recursive policy for super admins
DROP POLICY IF EXISTS "Super admins full access" ON public.profiles;

-- Create a function to check super admin status without recursion
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'SUPER_ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create super admin policy using the function (will be applied after users exist)
CREATE POLICY "Super admin access" ON public.profiles
  FOR ALL USING (public.is_super_admin());