-- Supprimer la politique problématique qui cause la récursion infinie
DROP POLICY IF EXISTS "Directors can view teacher profiles in their campus" ON public.profiles;

-- Créer une politique plus simple qui permet aux directeurs de voir les profils sans récursion
CREATE POLICY "Directors can view profiles in their campus"
ON public.profiles
FOR SELECT
USING (
  -- L'utilisateur peut voir son propre profil
  user_id = auth.uid()
  OR
  -- Super admin peut tout voir
  EXISTS (
    SELECT 1 FROM get_current_user_role_and_campus() user_info
    WHERE user_info.role = 'SUPER_ADMIN'
  )
  OR
  -- Directeur campus peut voir les profils de son campus
  EXISTS (
    SELECT 1 FROM get_current_user_role_and_campus() user_info
    WHERE user_info.role = 'DIRECTEUR_CAMPUS'
    AND user_info.campus_id = profiles.campus_id
  )
  OR
  -- Comptable peut voir tous les profils
  EXISTS (
    SELECT 1 FROM get_current_user_role_and_campus() user_info
    WHERE user_info.role = 'COMPTABLE'
  )
);