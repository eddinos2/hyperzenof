-- Ajouter tous les campus AURLOM réels
INSERT INTO public.campus (name, address, is_active) VALUES
('BOULOGNE', 'Boulogne, France', true),
('DOUAI', 'Douai, France', true),
('JAURÈS', 'Paris Jaurès, France', true),
('NICE', 'Nice, France', true),
('PARMENTIER', 'Paris Parmentier, France', true),
('PICPUS', 'Paris Picpus, France', true),
('ROQUETTE', 'Paris Roquette, France', true),
('SAINT-SÉBASTIEN', 'Paris Saint-Sébastien, France', true),
('SENTIER', 'Paris Sentier, France', true)
ON CONFLICT (name) DO UPDATE SET
  address = EXCLUDED.address,
  is_active = EXCLUDED.is_active;

-- Supprimer l'ancien campus "Paris" générique s'il existe
DELETE FROM public.campus WHERE name = 'Paris' AND name NOT IN ('JAURÈS', 'PARMENTIER', 'PICPUS', 'ROQUETTE', 'SAINT-SÉBASTIEN', 'SENTIER');