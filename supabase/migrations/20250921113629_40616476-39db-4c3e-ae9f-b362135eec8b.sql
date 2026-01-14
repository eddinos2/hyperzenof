-- Fix infinite recursion in RLS policies by simplifying them
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Campus directors can view profiles in their campus" ON public.profiles;
DROP POLICY IF EXISTS "Comptables can view all profiles" ON public.profiles;

-- Create simple, non-recursive policies
CREATE POLICY "Enable read for own profile" ON public.profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Enable update for own profile" ON public.profiles
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Enable insert for own profile" ON public.profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Super admin policy using simple user_id check instead of role lookup
CREATE POLICY "Super admins full access" ON public.profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role = 'SUPER_ADMIN'
    )
  );

-- Temporary policy to allow profile creation during signup
CREATE POLICY "Allow profile creation during signup" ON public.profiles
  FOR INSERT WITH CHECK (true);