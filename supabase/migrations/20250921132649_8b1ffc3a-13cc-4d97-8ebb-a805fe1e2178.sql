-- Ajouter la foreign key manquante vers profiles 
ALTER TABLE public.temp_access_credentials 
ADD CONSTRAINT fk_temp_credentials_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;