-- Update RLS so directors can view invoices that contain lines from their campus
ALTER POLICY "Campus directors can view invoices in their campus"
ON public.invoice
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.role = 'DIRECTEUR_CAMPUS'::user_role
      AND (
        p.campus_id = invoice.campus_id
        OR EXISTS (
          SELECT 1 FROM public.invoice_line il
          WHERE il.invoice_id = invoice.id
            AND il.campus_id = p.campus_id
        )
      )
  )
);
