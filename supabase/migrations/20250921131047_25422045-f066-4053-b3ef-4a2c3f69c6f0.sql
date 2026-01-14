-- Phase 1: Fix database foreign keys and relations

-- Add missing foreign key constraints for invoice table
ALTER TABLE public.invoice 
ADD CONSTRAINT invoice_teacher_id_fkey 
FOREIGN KEY (teacher_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

ALTER TABLE public.invoice 
ADD CONSTRAINT invoice_campus_id_fkey 
FOREIGN KEY (campus_id) REFERENCES public.campus(id) ON DELETE CASCADE;

-- Add missing foreign key constraints for invoice_line table  
ALTER TABLE public.invoice_line 
ADD CONSTRAINT invoice_line_invoice_id_fkey 
FOREIGN KEY (invoice_id) REFERENCES public.invoice(id) ON DELETE CASCADE;

ALTER TABLE public.invoice_line 
ADD CONSTRAINT invoice_line_campus_id_fkey 
FOREIGN KEY (campus_id) REFERENCES public.campus(id) ON DELETE CASCADE;

ALTER TABLE public.invoice_line 
ADD CONSTRAINT invoice_line_filiere_id_fkey 
FOREIGN KEY (filiere_id) REFERENCES public.filiere(id) ON DELETE CASCADE;

ALTER TABLE public.invoice_line 
ADD CONSTRAINT invoice_line_class_id_fkey 
FOREIGN KEY (class_id) REFERENCES public.class(id) ON DELETE SET NULL;

ALTER TABLE public.invoice_line 
ADD CONSTRAINT invoice_line_prevalidated_by_fkey 
FOREIGN KEY (prevalidated_by) REFERENCES public.profiles(user_id) ON DELETE SET NULL;

-- Add missing foreign key constraints for other tables
ALTER TABLE public.validation_log 
ADD CONSTRAINT validation_log_invoice_id_fkey 
FOREIGN KEY (invoice_id) REFERENCES public.invoice(id) ON DELETE CASCADE;

ALTER TABLE public.validation_log 
ADD CONSTRAINT validation_log_actor_id_fkey 
FOREIGN KEY (actor_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

ALTER TABLE public.payment 
ADD CONSTRAINT payment_invoice_id_fkey 
FOREIGN KEY (invoice_id) REFERENCES public.invoice(id) ON DELETE CASCADE;

ALTER TABLE public.invoice_import 
ADD CONSTRAINT invoice_import_teacher_id_fkey 
FOREIGN KEY (teacher_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

ALTER TABLE public.teacher_import 
ADD CONSTRAINT teacher_import_imported_by_fkey 
FOREIGN KEY (imported_by) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Create missing campus directors for each campus
DO $$
DECLARE
    campus_rec RECORD;
    director_email TEXT;
    new_user_id UUID;
BEGIN
    FOR campus_rec IN SELECT id, name FROM public.campus WHERE is_active = true
    LOOP
        -- Generate email: {campus}@aurlom.com (normalize campus name)
        director_email := LOWER(REPLACE(REPLACE(campus_rec.name, 'ù', 'u'), ' ', '')) || '@aurlom.com';
        
        -- Check if director already exists for this campus
        IF NOT EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE role = 'DIRECTEUR_CAMPUS' AND campus_id = campus_rec.id
        ) THEN
            -- Generate a new UUID for the user
            new_user_id := gen_random_uuid();
            
            -- Insert profile directly (simulating what would happen with auth trigger)
            INSERT INTO public.profiles (
                user_id,
                email,
                first_name,
                last_name,
                role,
                campus_id,
                is_active
            ) VALUES (
                new_user_id,
                director_email,
                'Directeur',
                campus_rec.name,
                'DIRECTEUR_CAMPUS',
                campus_rec.id,
                true
            );
            
            RAISE NOTICE 'Created director for campus %: %', campus_rec.name, director_email;
        END IF;
    END LOOP;
END $$;