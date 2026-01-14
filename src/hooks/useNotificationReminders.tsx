import { supabase } from '@/integrations/supabase/client';
import { useAutomaticNotifications } from './useAutomaticNotifications';

export function useNotificationReminders() {
  const { notifyTeacherMissingRIB, notifyUsersByRole } = useAutomaticNotifications();

  // Rappel RIB manquant pour les enseignants
  const checkMissingRIB = async () => {
    try {
      // D'abord récupérer tous les enseignants actifs
      const { data: teachers, error: teachersError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .eq('role', 'ENSEIGNANT')
        .eq('is_active', true);

      if (teachersError) throw teachersError;

      const teachersNeedingRIB = [];

      for (const teacher of teachers || []) {
        // Vérifier le profil enseignant de chacun
        const { data: teacherProfile } = await supabase
          .from('teacher_profile')
          .select('rib_iban')
          .eq('user_id', teacher.user_id)
          .maybeSingle();

        if (!teacherProfile?.rib_iban) {
          teachersNeedingRIB.push(teacher);
          await notifyTeacherMissingRIB(teacher.user_id);
        }
      }

      return teachersNeedingRIB.length;
    } catch (error) {
      console.error('Error checking missing RIB:', error);
      return 0;
    }
  };

  // Rappel soumission factures en fin de mois
  const remindMonthlyInvoiceSubmission = async () => {
    const today = new Date();
    const dayOfMonth = today.getDate();
    
    // Rappel les 25-28 du mois
    if (dayOfMonth >= 25 && dayOfMonth <= 28) {
      await notifyUsersByRole('ENSEIGNANT', {
        title: 'Rappel - Soumission de facture',
        message: 'N\'oubliez pas de soumettre votre facture avant la fin du mois.',
        type: 'warning'
      });
    }
  };

  // Rapport mensuel pour les comptables
  const sendMonthlyReport = async () => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    try {
      // Compter les factures du mois
      const { data: invoices, error } = await supabase
        .from('invoice')
        .select('status')
        .gte('created_at', firstDayOfMonth.toISOString());

      if (error) throw error;

      const stats = {
        total: invoices?.length || 0,
        validated: invoices?.filter(i => i.status === 'validated').length || 0,
        paid: invoices?.filter(i => i.status === 'paid').length || 0,
        pending: invoices?.filter(i => i.status === 'pending').length || 0
      };

      await notifyUsersByRole('COMPTABLE', {
        title: 'Rapport mensuel',
        message: `Ce mois: ${stats.total} factures (${stats.validated} validées, ${stats.paid} payées, ${stats.pending} en attente)`,
        type: 'info'
      });

      return stats;
    } catch (error) {
      console.error('Error generating monthly report:', error);
      return null;
    }
  };

  // Alerte pour les factures en retard
  const checkOverdueInvoices = async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
      const { data: overdueInvoices, error } = await supabase
        .from('invoice')
        .select(`
          id,
          month,
          year,
          created_at,
          profiles:teacher_id (
            first_name,
            last_name
          )
        `)
        .eq('status', 'pending')
        .lt('created_at', thirtyDaysAgo.toISOString());

      if (error) throw error;

      if (overdueInvoices && overdueInvoices.length > 0) {
        await notifyUsersByRole('SUPER_ADMIN', {
          title: 'Factures en retard',
          message: `${overdueInvoices.length} facture(s) en attente depuis plus de 30 jours nécessitent une attention.`,
          type: 'warning'
        });
      }

      return overdueInvoices?.length || 0;
    } catch (error) {
      console.error('Error checking overdue invoices:', error);
      return 0;
    }
  };

  return {
    checkMissingRIB,
    remindMonthlyInvoiceSubmission,
    sendMonthlyReport,
    checkOverdueInvoices
  };
}