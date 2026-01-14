-- First, check what statuses are allowed and add 'completed' if missing
ALTER TABLE public.user_creation_requests 
DROP CONSTRAINT IF EXISTS user_creation_requests_status_check;

ALTER TABLE public.user_creation_requests 
ADD CONSTRAINT user_creation_requests_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'completed'));