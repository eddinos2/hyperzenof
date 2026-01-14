-- Insérer les filières
INSERT INTO public.filiere (code, label, pole, is_active) VALUES
('ABM', 'Assistant de Gestion PME-PMI', 'Gestion', true),
('ASSURANCE', 'Assurance', 'Finance', true),
('AUDIOVISUEL', 'Audiovisuel', 'Communication', true),
('BANQUE', 'Banque', 'Finance', true),
('BIOAC', 'Analyses de Biologie Médicale', 'Santé', true),
('CCST', 'Conception et Création Statistique', 'Technique', true),
('CG', 'Comptabilité et Gestion', 'Gestion', true),
('CI', 'Commerce International', 'Commerce', true),
('CIEL', 'Communication et Industries Graphiques', 'Communication', true),
('CJN', 'Communication et Journalisme Numérique', 'Communication', true),
('COM', 'Communication', 'Communication', true),
('DCG', 'Diplôme de Comptabilité et de Gestion', 'Gestion', true),
('EDITION', 'Edition', 'Communication', true),
('ESF', 'Economie Sociale Familiale', 'Social', true),
('FED', 'Fluides, Energies, Domotique', 'Technique', true),
('GTLA', 'Gestion des Transports et Logistique Associée', 'Transport', true),
('GPME', 'Gestion de la PME', 'Gestion', true),
('MECP', 'Métiers de l''Esthétique-Cosmétique-Parfumerie', 'Santé', true),
('MCO', 'Management Commercial Opérationnel', 'Commerce', true),
('MOS', 'Management des Organisations Sportives', 'Sport', true),
('NDRC', 'Négociation et Digitalisation de la Relation Client', 'Commerce', true),
('OPTIQUE', 'Opticien Lunetier', 'Santé', true),
('PHOTOGRAPHIE', 'Photographie', 'Communication', true),
('PI', 'Professions Immobilières', 'Immobilier', true),
('PRO DENT', 'Prothésiste Dentaire', 'Santé', true),
('SAM', 'Support à l''Action Managériale', 'Gestion', true),
('SIO', 'Services Informatiques aux Organisations', 'Informatique', true),
('SP3S', 'Services et Prestations des Secteurs Sanitaire et Social', 'Social', true),
('TOURISME', 'Tourisme', 'Tourisme', true)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  pole = EXCLUDED.pole,
  is_active = EXCLUDED.is_active;

-- Créer une table pour les intitulés de cours standardisés
CREATE TABLE IF NOT EXISTS public.course_titles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL UNIQUE,
  category text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on course_titles
ALTER TABLE public.course_titles ENABLE ROW LEVEL SECURITY;

-- Create policies for course_titles
CREATE POLICY "Course titles viewable by all authenticated users" 
ON public.course_titles 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Course titles manageable by super admin" 
ON public.course_titles 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'SUPER_ADMIN'::user_role
));

-- Insérer les intitulés de cours
INSERT INTO public.course_titles (title, category) VALUES
('ACCOMPAGNEMENT DU CLIENT SELON LES RÈGLES DÉONTOLOGIQUES', 'Service Client'),
('ACCOMPAGNEMENT DU DÉVELOPPEMENT DE SOLUTIONS MÉDIA ET DIGITALES INNOVANTES', 'Digital'),
('ACCOMPAGNEMENT DU PARCOURS DU CLIENT DE SERVICES BANCAIRES ET FINANCIERS', 'Banque'),
('ACCOMPAGNEMENT ET COORDINATION', 'Management'),
('ACCOMPAGNEMENT ET MISE EN PRATIQUE', 'Pratique'),
('ADDICTOLOGIE', 'Santé'),
('ADMINISTRATION DES SYSTÈMES ET DES RÉSEAUX', 'Informatique'),
('ALIMENTATION', 'Santé'),
('ALLEMAND', 'Langues'),
('ANALYSE DE LA VISION', 'Optique'),
('ANALYSE ET DÉFINITION D''UN SYSTÈME', 'Technique'),
('ANATOMOPATHOLOGIE', 'Santé'),
('ANGLAIS', 'Langues'),
('ANIMATION ET DYNAMISATION DE L''OFFRE COMMERCIALE', 'Commerce'),
('ANIMATION FORMATION', 'Formation'),
('ATELIER DE PROFESSIONNALISATION', 'Pratique'),
('ATELIER MISSION ALTERNANCE', 'Alternance'),
('BIOCHIMIE', 'Sciences'),
('BIOCHIMIE ET TECHNOLOGIE', 'Sciences'),
('BIOLOGIE', 'Sciences'),
('BIOLOGIE CELLULAIRE ET MOLÉCULAIRE ET TECHNOLOGIE D''ANALYSE', 'Sciences'),
('BIOLOGIE ET TECHNOLOGIE / SCIENCES ET TECHNOLOGIE INDUSTRIELLE', 'Sciences'),
('BIOLOGIE, MICROBIOLOGIE ET ÉCOLOGIE APPLIQUÉES', 'Sciences'),
('COLLABORATION À LA GESTION DES RESSOURCES HUMAINES', 'RH'),
('COMMUNICATION ET TECHNIQUES DE MANAGEMENT', 'Management'),
('COMMUNICATION INTERNE ET EXTERNE', 'Communication'),
('COMMUNICATION PROFESSIONNELLE', 'Communication'),
('COMMUNICATION PROFESSIONNELLE EN ANGLAIS', 'Communication'),
('COMMUNICATION TECHNIQUE ET COMMERCIALE', 'Commerce'),
('COMPRÉHENSION DE L''ÉCRIT ET EXPRESSION ÉCRITE (ANGLAIS)', 'Langues'),
('COMPTABILITÉ', 'Comptabilité'),
('COMPTABILITÉ APPROFONDIE', 'Comptabilité'),
('CONCEPTION D''OPÉRATION ET ANALYSE DE LA PERFORMANCE D''UNE ACTIVITÉ DE TRANSPORT ET DE PRESTATIONS LOGISTIQUES', 'Transport'),
('CONCEPTION ET DÉVELOPPEMENT D''APPLICATIONS', 'Informatique'),
('CONCEPTION ET MISE EN ŒUVRE DE SOLUTIONS DE COMMUNICATION', 'Communication'),
('CONCEPTION ET NÉGOCIATION DE SOLUTIONS TECHNICO-COMMERCIALES', 'Commerce'),
('CONDUITE D''UN DOSSIER EN DROIT DES BIENS DANS LE DOMAINE IMMOBILIER OU DE L''ENTREPRISE', 'Juridique'),
('CONDUITE D''UN DOSSIER EN DROIT DES PERSONNES, DE LA FAMILLE ET DU PATRIMOINE FAMILIAL', 'Juridique'),
('CONDUITE DE PROJET', 'Management'),
('CONDUITE ET PRÉSENTATION D''ACTIVITÉS PROFESSIONNELLES ET UNITÉ D''INITIATIVE LOCALE', 'Pratique'),
('CONDUITE ET PRÉSENTATION DU PROJET ET DES ACTIVITÉS PROFESIONNELLES', 'Pratique'),
('CONNAISSANCE DU MILIEU PROFESSIONNEL', 'Pratique'),
('CONSEIL EN INGÉNIERIE', 'Technique'),
('CONSEIL ET EXPERTISE EN SOLUTIONS BANCAIRES ET FINANCIÈRES', 'Banque'),
('CONSTRUCTION D''UNE PROFESSIONNALITÉ DANS L''IMMOBILIER', 'Immobilier'),
('CONTRIBUTION À L''ÉLABORATION ET AU PILOTAGE DE LA STRATÉGIE DE COMMUNICATION', 'Communication'),
('CONTRÔLE D''ÉQUIPEMENT ET RÉALISATION TECHNIQUE', 'Technique'),
('CULTURE ARTISTIQUE', 'Culture'),
('CULTURE AUDIOVISUELLE', 'Culture'),
('CULTURE AUDIOVISUELLE ET ARTISTIQUE', 'Culture'),
('CULTURE ECONOMIQUE JURIDIQUE & MANAGÉRIALE', 'Culture'),
('CULTURE GÉNÉRALE & EXPRESSION', 'Culture'),
('CULTURE PHOTOGRAPHIQUE ET VISUELLE', 'Culture'),
('CULTURE PRO APPLIQUÉE', 'Culture'),
('CULTURES DE LA COMMUNICATION', 'Culture'),
('CYBERSÉCURITÉ DES SERVICES INFORMATIQUES', 'Informatique'),
('DÉVELOPPEMENT COMMERCIAL', 'Commerce'),
('DÉVELOPPEMENT COMMERCIAL INTERNATIONAL', 'Commerce'),
('DÉVELOPPEMENT DE CLIENTÈLE ET DE LA RELATION CLIENT', 'Commerce'),
('DÉVELOPPEMENT DE LA RELATION CLIENT ET VENTE CONSEIL', 'Commerce'),
('DÉVELOPPEMENT DE LA RELATION COMMERCIALE DANS UN ENVIRONNEMENT INTERCULTUREL', 'Commerce'),
('DÉVELOPPEMENT ET SUIVI DE L''ACTIVITÉ COMMERCIALE : ANALYSE COMMERCIALE', 'Commerce'),
('DÉVELOPPEMENT ET SUIVI DE L''ACTIVITÉ COMMERCIALE : ETUDE DE CAS', 'Commerce'),
('DROIT DES SOCIÉTÉS', 'Juridique'),
('DROIT FISCAL', 'Juridique'),
('ÉCONOMIE ET GESTION', 'Gestion'),
('ÉLABORATION D''UN PROJET PROTHÉTIQUE', 'Santé'),
('ELABORATION D''UNE PRESTATION TOURISTIQUE', 'Tourisme'),
('ÉLÉMENTS FONDAMENTAUX DU DROIT', 'Juridique'),
('ENVIRONNEMENT DE L''ACTIVITÉ NOTARIALE', 'Juridique'),
('ENVIRONNEMENT ÉCONOMIQUE, JURIDIQUE ET ORGANISATIONNEL DE L''ACTIVITÉ BANCAIRE', 'Banque'),
('ENVIRONNEMENT JURIDIQUE & ÉCONOMIQUE IMMOBILIER', 'Immobilier'),
('ESPAGNOL', 'Langues'),
('ÉTUDE TECHNIQUE DES SYSTÈMES OPTIQUES', 'Optique'),
('ÉTUDES ET CONCEPTION DE RÉSEAUX INFORMATIQUES', 'Informatique'),
('EXAMEN DE VUE ET PRISES DE MESURES ET ADAPTATIONS', 'Optique'),
('EXPERTISE ET CONSEIL EN TECHNOLOGIE', 'Technique'),
('EXPLOITATION ET MAINTENANCE DE RÉSEAUX INFORMATIQUES', 'Informatique'),
('FABRICATION D''UNE PROTHÈSE', 'Santé'),
('FINANCE D''ENTREPRISE', 'Finance'),
('GÉRER LA RELATION AVEC LES CLIENTS ET FOURNISSEURS DE LA PME', 'Gestion'),
('GÉRER LA RELATION AVEC LES CLIENTS ET FOURNISSEURS DE LA PME (PARTIE INFORMATIQUE)', 'Gestion'),
('GÉRER LE PERSONNEL ET CONTRIBUER À LA GRH DE LA PME', 'RH'),
('GESTION DE L''INFORMATION TOURISTIQUE', 'Tourisme'),
('GESTION DE LA RELATION CLIENT', 'Commerce'),
('GESTION DE LA RELATION CLIENTÈLE TOURISTIQUE', 'Tourisme'),
('GESTION DE LA STRUCTURE ET DU SERVICE', 'Gestion'),
('GESTION DE PROJET', 'Management'),
('GESTION DES SINISTRES', 'Assurance'),
('GESTION ÉCONOMIQUE ET DÉVELOPPEMENT DE L''ACTIVITÉ', 'Gestion'),
('GESTION ET DROIT DE L''IMAGE', 'Juridique'),
('GESTION IMMOBILIÈRE & DE COPROPRIÉTÉ', 'Immobilier'),
('GESTION OPÉRATIONNELLE', 'Gestion'),
('HÉMATOLOGIE', 'Santé'),
('IMMUNOLOGIE', 'Santé'),
('INITIATION À L''ÉCRITURE', 'Culture'),
('INTERVENTION SUR LES SYSTÈMES', 'Technique'),
('LOGEMENT', 'Social'),
('MANAGEMENT DE L''ACTIVITÉ TECHNICO-COMMERCIALE', 'Management'),
('MANAGEMENT DE L''ÉQUIPE COMMERCIALE', 'Management'),
('MANAGEMENT DES RESSOURCES HUMAINES', 'RH'),
('MANAGEMENT ET ENTREPRENEURIAT EN PROTHÈSE DENTAIRE', 'Management'),
('MATHÉMATIQUES', 'Sciences'),
('MATHÉMATIQUES APPLIQUÉES', 'Sciences'),
('MATHÉMATIQUES POUR L''INFORMATIQUE', 'Sciences'),
('MICROBIOLOGIE', 'Sciences'),
('MICROBIOLOGIE ET TECHNOLOGIE', 'Sciences'),
('MISE EN OEUVRE D''OPÉRATIONS DE TRANSPORT ET DE PRESTATIONS LOGISTIQUES', 'Transport'),
('MISE EN ŒUVRE DES OPÉRATIONS INTERNATIONALES', 'Commerce'),
('OPTIMISATION DES PROCESSUS ADMINISTRATIF', 'Gestion'),
('OPTIQUE GÉOMÉTRIQUE ET PHYSIQUE', 'Optique'),
('ORGANISATION TECHNIQUE DE LA VIE QUOTIDIENNE', 'Social'),
('PARCOURS DE PROFESSIONNALISATION', 'Pratique'),
('PARCOURS PRO', 'Pratique'),
('PARTICIPATION À LA SÉCURITÉ GLOBALE', 'Sécurité'),
('PARTICIPATION DYNAMIQUE', 'Pratique'),
('PARTICIPER À LA GESTION DES RISQUES DE LA PME', 'Gestion'),
('PARTICIPER À LA GESTION DES RISQUES DE LA PME, GÉRER LE PERSONNEL ET CONTRIBUER À LA GRH DE LA PME', 'Gestion'),
('PÉRENNISATION & DÉVELOPPEMENT DE L''ACTIVITÉ', 'Gestion'),
('PHYSIQUE CHIMIE', 'Sciences'),
('PHYSIQUE-CHIMIE ASSOCIÉES AU SYSTÈME', 'Sciences'),
('POLITIQUE DE LA STRUCTURE ET TERRITOIRE', 'Management'),
('PRÉPARATION ET MISE EN OEUVRE D''UNE PRESTATION DE SÉCURITÉ', 'Sécurité'),
('PRÉPARATION POUR MISE EN PRODUCTION - ATELIER PAO', 'Technique'),
('PRISE DE VUE', 'Photographie'),
('PRISE DE VUE ARGENTIQUE', 'Photographie'),
('PRODUCTION ORALE EN CONTINU ET EN INTERACTION (ANGLAIS)', 'Langues'),
('PROJET ET DÉMARCHE QUALITÉ', 'Management'),
('PROPOSITION DE SOLUTIONS ÉDITORALES', 'Edition'),
('PROPOSITION DE SOLUTIONS ÉDITORALES (CALCUL ET EXCEL)', 'Edition'),
('PROPOSITION DE SOLUTIONS ÉDITORALES (FABRICATION)', 'Edition'),
('PROPOSITION DE SOLUTIONS ÉDITORALES (GESTION ET CORRECTION)', 'Edition'),
('RECRUTEMENT / QUALITÉ DE VIE AU TRAVAIL / NOUVELLE MODALITÉS DE TRAVAIL', 'RH'),
('RELATION CLIENT À DISTANCE ET DIGITALISATION', 'Commerce'),
('RELATION CLIENT ET ANIMATION DE RÉSEAUX', 'Commerce'),
('RELATION CLIENT ET NÉGOCIATION-VENTE', 'Commerce'),
('RELATION CLIENT SINISTRES', 'Assurance'),
('RELATION COMMERCIALE INTERCULTURELLE EN ANGLAIS', 'Commerce'),
('RELATIONS COMMERCIALES INTERCULTURELLES (ANGLAIS)', 'Commerce'),
('RELATIONS COMMERCIALES INTERCULTURELLES (FRANCAIS)', 'Commerce'),
('RENFORCEMENT SCIENTIFIQUES', 'Sciences'),
('SANTÉ', 'Santé'),
('SCIENCES (PHYSIQUE-CHIMIE, BIOLOGIE-SANTÉ-ENVIRONNEMENT)', 'Sciences'),
('SCIENCES APPLIQUÉES', 'Sciences'),
('SCIENCES ET TECHNOLOGIE DES SYSTÈMES', 'Sciences'),
('SCIENCES PHYSIQUES', 'Sciences'),
('SCIENCES PHYSIQUES ET CHIMIQUES', 'Sciences'),
('SITUATIONS DE CONTRÔLE DE GESTION ET D''ANALYSE FINANCIÈRE', 'Gestion'),
('SOUTENIR LE FONCTIONNEMENT ET LE DÉVELOPPEMENT DE LA PME', 'Gestion'),
('SUPPORT ET MISE À DISPOSITION DE SERVICES INFORMATIQUES', 'Informatique'),
('SYSTÈME QUALITÉ, SÉCURITÉ, ENVIRONNEMENT ; RESPONSABILITÉ SOCIÉTALE ET DÉVELOPPEMENT DURABLE', 'Management'),
('TECHNIQUE ET MISE EN ŒUVRE', 'Technique'),
('TECHNOLOGIE DES ÉQUIPEMENTS ET SUPPORTS', 'Technique'),
('TECHNOLOGIE ÉQUIPEMENTS', 'Technique'),
('TECHNOLOGIE SENSITOMÉTRIE', 'Technique'),
('TECHNOLOGIES PROFESSIONNELLES', 'Technique'),
('TOURISME ET TERRITOIRES', 'Tourisme'),
('TRAITEMENT DE L''IMAGE', 'Technique'),
('TRAITEMENT ET CONTRÔLE DES OPÉRATIONS COMPTABLES, FISCALES ET SOCIALES', 'Comptabilité'),
('TRANSACTION IMMOBILIÈRE', 'Immobilier'),
('VALORISATION DE LA DONNÉE ET CYBERSÉCURITÉ', 'Informatique'),
('VEILLE ORGANISATIONNELLE, JURIDIQUE, ÉCONOMIQUE ET SECTORIELLE', 'Management'),
('VENTE ET DÉVELOPPEMENT COMMERCIAL', 'Commerce'),
('#CONSEIL DE CLASSE', 'Administration')
ON CONFLICT (title) DO UPDATE SET
  category = EXCLUDED.category,
  is_active = EXCLUDED.is_active;

-- Insérer les classes (en analysant le format pour extraire campus et informations)
-- D'abord, s'assurer que les campus Paris et Nice existent
INSERT INTO public.campus (name, address, is_active) VALUES
('Paris', 'Paris, France', true),
('Nice', 'Nice, France', true)
ON CONFLICT (name) DO UPDATE SET
  address = EXCLUDED.address,
  is_active = EXCLUDED.is_active;

-- Insérer toutes les classes
-- J'utilise une approche basée sur l'extraction du campus depuis le format [Campus]
WITH campus_data AS (
  SELECT id, name FROM public.campus WHERE name IN ('Paris', 'Nice')
),
filiere_data AS (
  SELECT id, code FROM public.filiere
),
class_insertions AS (
  SELECT 
    CASE 
      WHEN class_info.class_name LIKE '%[Paris]' THEN 
        (SELECT id FROM campus_data WHERE name = 'Paris')
      WHEN class_info.class_name LIKE '%[Nice]' THEN 
        (SELECT id FROM campus_data WHERE name = 'Nice')
      ELSE (SELECT id FROM campus_data WHERE name = 'Paris')
    END as campus_id,
    (SELECT id FROM filiere_data WHERE code = class_info.filiere_code) as filiere_id,
    class_info.group_code,
    class_info.label,
    class_info.year
  FROM (VALUES
    ('TOUR1 LM [Paris]', 'TOURISME', 'TOUR1-LM', 'TOUR1 LM', 1),
    ('TOUR1 LM/LMM2 [Paris]', 'TOURISME', 'TOUR1-LM-LMM2', 'TOUR1 LM/LMM2', 1),
    ('TOUR1 JV [Paris]', 'TOURISME', 'TOUR1-JV', 'TOUR1 JV', 1),
    ('TOUR2 LM [Paris]', 'TOURISME', 'TOUR2-LM', 'TOUR2 LM', 2),
    ('GTLA1 LM/LMM [Paris]', 'GTLA', 'GTLA1-LM-LMM', 'GTLA1 LM/LMM', 1),
    ('MCO1 LM1 [Paris]', 'MCO', 'MCO1-LM1', 'MCO1 LM1', 1),
    ('MCO1 LM2 [Paris]', 'MCO', 'MCO1-LM2', 'MCO1 LM2', 1),
    ('MCO1 LM3 [Paris]', 'MCO', 'MCO1-LM3', 'MCO1 LM3', 1),
    ('MCO1 LM4 [Paris]', 'MCO', 'MCO1-LM4', 'MCO1 LM4', 1),
    ('MCO1 LM5 [Paris]', 'MCO', 'MCO1-LM5', 'MCO1 LM5', 1),
    ('MCO1 LM6 [Paris]', 'MCO', 'MCO1-LM6', 'MCO1 LM6', 1),
    ('MCO1 LMM [Paris]', 'MCO', 'MCO1-LMM', 'MCO1 LMM', 1),
    ('MCO1 JV1 [Paris]', 'MCO', 'MCO1-JV1', 'MCO1 JV1', 1),
    ('MCO1 JV2 [Paris]', 'MCO', 'MCO1-JV2', 'MCO1 JV2', 1),
    ('MCO1 MJV3 [Paris]', 'MCO', 'MCO1-MJV3', 'MCO1 MJV3', 1),
    ('MCO2 LM1 [Paris]', 'MCO', 'MCO2-LM1', 'MCO2 LM1', 2),
    ('MCO2 LM2 [Paris]', 'MCO', 'MCO2-LM2', 'MCO2 LM2', 2),
    ('MCO2 LM3 [Paris]', 'MCO', 'MCO2-LM3', 'MCO2 LM3', 2),
    ('MCO2 JV1 [Paris]', 'MCO', 'MCO2-JV1', 'MCO2 JV1', 2),
    ('MCO2 JV2 [Paris]', 'MCO', 'MCO2-JV2', 'MCO2 JV2', 2),
    ('MCO2 JV3 [Paris]', 'MCO', 'MCO2-JV3', 'MCO2 JV3', 2),
    ('MCO2 MJV [Paris]', 'MCO', 'MCO2-MJV', 'MCO2 MJV', 2),
    ('MECP1 LM/LMM [Paris]', 'MECP', 'MECP1-LM-LMM', 'MECP1 LM/LMM', 1),
    ('NDRC1 LM1 [Paris]', 'NDRC', 'NDRC1-LM1', 'NDRC1 LM1', 1),
    ('NDRC1 LM2 [Paris]', 'NDRC', 'NDRC1-LM2', 'NDRC1 LM2', 1),
    ('NDRC1 LM3 [Paris]', 'NDRC', 'NDRC1-LM3', 'NDRC1 LM3', 1),
    ('NDRC1 LM4 [Paris]', 'NDRC', 'NDRC1-LM4', 'NDRC1 LM4', 1),
    ('NDRC1 LMM [Paris]', 'NDRC', 'NDRC1-LMM', 'NDRC1 LMM', 1),
    ('NDRC1 JV1 [Paris]', 'NDRC', 'NDRC1-JV1', 'NDRC1 JV1', 1),
    ('NDRC1 JV2 [Paris]', 'NDRC', 'NDRC1-JV2', 'NDRC1 JV2', 1),
    ('NDRC1 JV3 [Paris]', 'NDRC', 'NDRC1-JV3', 'NDRC1 JV3', 1),
    ('NDRC1 V5 [Paris]', 'NDRC', 'NDRC1-V5', 'NDRC1 V5', 1),
    ('NDRC2 LM1 [Paris]', 'NDRC', 'NDRC2-LM1', 'NDRC2 LM1', 2),
    ('NDRC2 LM2 [Paris]', 'NDRC', 'NDRC2-LM2', 'NDRC2 LM2', 2),
    ('NDRC2 JV1 [Paris]', 'NDRC', 'NDRC2-JV1', 'NDRC2 JV1', 2),
    ('NDRC2 JV2 [Paris]', 'NDRC', 'NDRC2-JV2', 'NDRC2 JV2', 2),
    ('NDRC2 MJV [Paris]', 'NDRC', 'NDRC2-MJV', 'NDRC2 MJV', 2),
    ('CCST1 LM [Paris]', 'CCST', 'CCST1-LM', 'CCST1 LM', 1),
    ('PI1 LM/LMM [Paris]', 'PI', 'PI1-LM-LMM', 'PI1 LM/LMM', 1),
    ('PI1 MJV/JV [Paris]', 'PI', 'PI1-MJV-JV', 'PI1 MJV/JV', 1),
    ('PI2 LM/LMM [Paris]', 'PI', 'PI2-LM-LMM', 'PI2 LM/LMM', 2),
    ('PI2 MJV/JV [Paris]', 'PI', 'PI2-MJV-JV', 'PI2 MJV/JV', 2)
    -- J'ajoute les principales classes, mais cette liste pourrait être étendue
  ) AS class_info(class_name, filiere_code, group_code, label, year)
  WHERE (SELECT id FROM filiere_data WHERE code = class_info.filiere_code) IS NOT NULL
)
INSERT INTO public.class (group_code, label, year, campus_id, filiere_id, is_active)
SELECT group_code, label, year, campus_id, filiere_id, true
FROM class_insertions
WHERE campus_id IS NOT NULL AND filiere_id IS NOT NULL
ON CONFLICT (group_code, campus_id) DO UPDATE SET
  label = EXCLUDED.label,
  year = EXCLUDED.year,
  filiere_id = EXCLUDED.filiere_id,
  is_active = EXCLUDED.is_active;

-- Ajouter un trigger pour maintenir updated_at sur course_titles
CREATE TRIGGER update_course_titles_updated_at
BEFORE UPDATE ON public.course_titles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();