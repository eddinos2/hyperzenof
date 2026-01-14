-- Mettre à jour toutes les références vers les campus puis supprimer les doublons
-- D'abord créer une table de mapping
CREATE TEMP TABLE campus_mapping AS
SELECT old_c.id as old_id, new_c.id as new_id
FROM campus old_c 
JOIN campus new_c ON UPPER(old_c.name) = new_c.name
WHERE old_c.name IN ('Boulogne', 'Douai', 'Jaurès', 'Nice', 'Parmentier', 'Picpus', 'Roquette', 'Saint-Sébastien', 'Sentier')
AND new_c.name IN ('BOULOGNE', 'DOUAI', 'JAURÈS', 'NICE', 'PARMENTIER', 'PICPUS', 'ROQUETTE', 'SAINT-SÉBASTIEN', 'SENTIER');

-- Mettre à jour toutes les tables qui référencent campus
UPDATE profiles 
SET campus_id = cm.new_id
FROM campus_mapping cm
WHERE profiles.campus_id = cm.old_id;

UPDATE class 
SET campus_id = cm.new_id
FROM campus_mapping cm
WHERE class.campus_id = cm.old_id;

UPDATE invoice 
SET campus_id = cm.new_id
FROM campus_mapping cm
WHERE invoice.campus_id = cm.old_id;

UPDATE invoice_line 
SET campus_id = cm.new_id
FROM campus_mapping cm
WHERE invoice_line.campus_id = cm.old_id;

UPDATE user_creation_requests 
SET campus_id = cm.new_id
FROM campus_mapping cm
WHERE user_creation_requests.campus_id = cm.old_id;

-- Maintenant supprimer les doublons
DELETE FROM campus WHERE name IN ('Boulogne', 'Douai', 'Jaurès', 'Nice', 'Parmentier', 'Picpus', 'Roquette', 'Saint-Sébastien', 'Sentier');