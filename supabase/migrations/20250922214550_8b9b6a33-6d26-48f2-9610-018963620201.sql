-- Now update the approved requests to completed status
UPDATE public.user_creation_requests 
SET status = 'completed', 
    processed_at = NOW(),
    updated_at = NOW()
WHERE status = 'approved' 
AND EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.email = user_creation_requests.email
);