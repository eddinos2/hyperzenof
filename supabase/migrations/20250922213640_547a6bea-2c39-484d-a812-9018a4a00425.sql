-- Enable realtime for seasonal themes table
ALTER TABLE public.seasonal_themes REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.seasonal_themes;