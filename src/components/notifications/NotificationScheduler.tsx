import { useEffect } from 'react';
import { useNotificationReminders } from '@/hooks/useNotificationReminders';

export function NotificationScheduler() {
  const { 
    checkMissingRIB, 
    remindMonthlyInvoiceSubmission, 
    sendMonthlyReport, 
    checkOverdueInvoices 
  } = useNotificationReminders();

  useEffect(() => {
    // Vérifications au démarrage de l'application
    const runInitialChecks = async () => {
      const today = new Date();
      const dayOfMonth = today.getDate();
      
      // Vérifier les RIB manquants (une fois par semaine)
      if (today.getDay() === 1) { // Lundi
        await checkMissingRIB();
      }
      
      // Rappel soumission factures (25-28 du mois)
      if (dayOfMonth >= 25 && dayOfMonth <= 28) {
        await remindMonthlyInvoiceSubmission();
      }
      
      // Rapport mensuel (1er du mois)
      if (dayOfMonth === 1) {
        await sendMonthlyReport();
      }
      
      // Vérifier les factures en retard (tous les vendredis)
      if (today.getDay() === 5) { // Vendredi
        await checkOverdueInvoices();
      }
    };

    runInitialChecks();

    // Programmer les vérifications régulières
    const interval = setInterval(() => {
      runInitialChecks();
    }, 24 * 60 * 60 * 1000); // Une fois par jour

    return () => clearInterval(interval);
  }, [checkMissingRIB, remindMonthlyInvoiceSubmission, sendMonthlyReport, checkOverdueInvoices]);

  // Ce composant ne rend rien, il fonctionne en arrière-plan
  return null;
}