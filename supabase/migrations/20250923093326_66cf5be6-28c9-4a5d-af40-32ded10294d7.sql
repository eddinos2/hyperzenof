-- Supprimer toutes les factures et données associées
-- Cette action va nettoyer complètement la base de données des factures tout en préservant les utilisateurs et la configuration

-- 1. Supprimer d'abord les paiements (référencent les factures)
DELETE FROM public.payment;

-- 2. Supprimer les lignes de facture (référencent les factures)
DELETE FROM public.invoice_line;

-- 3. Supprimer les factures
DELETE FROM public.invoice;

-- 4. Supprimer les imports de factures
DELETE FROM public.invoice_import;

-- 5. Supprimer les logs de validation
DELETE FROM public.validation_log;

-- 6. Supprimer les notifications liées aux factures (optionnel)
DELETE FROM public.notifications WHERE type IN ('warning', 'error', 'success') AND message LIKE '%facture%';

-- Remettre les compteurs à zéro si nécessaire (les UUID sont générés automatiquement)
-- Note: Les profils utilisateurs, campus, filières, classes sont préservés