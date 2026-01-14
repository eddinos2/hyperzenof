-- Permettre aux directeurs de campus de voir les profils des enseignants de leur campus
CREATE POLICY "Directors can view teacher profiles in their campus"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles director_profile
    WHERE director_profile.user_id = auth.uid()
    AND director_profile.role = 'DIRECTEUR_CAMPUS'
    AND director_profile.campus_id = profiles.campus_id
    AND profiles.role = 'ENSEIGNANT'
  )
);