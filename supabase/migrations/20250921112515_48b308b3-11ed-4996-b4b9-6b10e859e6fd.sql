-- Add missing foreign key constraint for invoice.teacher_id -> profiles.user_id
ALTER TABLE public.invoice 
ADD CONSTRAINT invoice_teacher_id_fkey 
FOREIGN KEY (teacher_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Add missing foreign key constraint for invoice.campus_id -> campus.id  
ALTER TABLE public.invoice 
ADD CONSTRAINT invoice_campus_id_fkey 
FOREIGN KEY (campus_id) REFERENCES public.campus(id) ON DELETE RESTRICT;