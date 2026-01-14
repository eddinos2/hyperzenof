import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NotificationData {
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export function useAutomaticNotifications() {
  
  const createNotification = async (data: NotificationData) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert(data);

      if (error) {
        console.error('Error creating notification:', error);
      }
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  // Notifications pour les enseignants
  const notifyTeacherInvoiceValidated = async (teacherId: string, month: number, year: number) => {
    await createNotification({
      user_id: teacherId,
      title: 'Facture validée',
      message: `Votre facture ${month}/${year} a été validée et est prête pour le paiement.`,
      type: 'success'
    });
  };

  const notifyTeacherInvoiceRejected = async (teacherId: string, month: number, year: number, reason?: string) => {
    await createNotification({
      user_id: teacherId,
      title: 'Facture rejetée',
      message: `Votre facture ${month}/${year} a été rejetée. ${reason ? `Motif: ${reason}` : 'Veuillez vérifier les détails.'}`,
      type: 'error'
    });
  };

  const notifyTeacherPaymentReceived = async (teacherId: string, amount: number, month: number, year: number) => {
    await createNotification({
      user_id: teacherId,
      title: 'Paiement reçu',
      message: `Votre paiement de ${amount.toFixed(2)}€ pour la facture ${month}/${year} a été traité.`,
      type: 'success'
    });
  };

  const notifyTeacherMissingRIB = async (teacherId: string) => {
    await createNotification({
      user_id: teacherId,
      title: 'RIB manquant',
      message: 'Veuillez compléter vos informations bancaires pour recevoir vos paiements.',
      type: 'warning'
    });
  };

  // Notifications pour les directeurs de campus
  const notifyDirectorNewInvoice = async (directorId: string, teacherName: string, month: number, year: number) => {
    await createNotification({
      user_id: directorId,
      title: 'Nouvelle facture à prévalider',
      message: `${teacherName} a soumis sa facture ${month}/${year} pour prévalidation.`,
      type: 'info'
    });
  };

  const notifyDirectorInvoicePrevalidated = async (directorId: string, teacherName: string, month: number, year: number) => {
    await createNotification({
      user_id: directorId,
      title: 'Facture prévalidée',
      message: `La facture ${month}/${year} de ${teacherName} a été prévalidée avec succès.`,
      type: 'success'
    });
  };

  const notifyDirectorNewTeacher = async (directorId: string, teacherName: string, campusName: string) => {
    await createNotification({
      user_id: directorId,
      title: 'Nouvel enseignant assigné',
      message: `${teacherName} a été assigné au campus ${campusName}.`,
      type: 'info'
    });
  };

  // Notifications pour les comptables
  const notifyAccountantInvoicePrevalidated = async (accountantId: string, teacherName: string, month: number, year: number) => {
    await createNotification({
      user_id: accountantId,
      title: 'Facture prévalidée',
      message: `La facture ${month}/${year} de ${teacherName} est prête pour validation finale.`,
      type: 'info'
    });
  };

  const notifyAccountantNewPayment = async (accountantId: string, amount: number, reference: string) => {
    await createNotification({
      user_id: accountantId,
      title: 'Nouveau paiement enregistré',
      message: `Paiement de ${amount.toFixed(2)}€ enregistré (Réf: ${reference}).`,
      type: 'success'
    });
  };

  // Notifications pour les super admins
  const notifySuperAdminUserRequest = async (superAdminId: string, requesterName: string, newUserName: string) => {
    await createNotification({
      user_id: superAdminId,
      title: 'Nouvelle demande utilisateur',
      message: `${requesterName} demande la création d'un compte pour ${newUserName}.`,
      type: 'info'
    });
  };

  const notifySuperAdminSystemAlert = async (superAdminId: string, alertType: string, details: string) => {
    await createNotification({
      user_id: superAdminId,
      title: `Alerte système: ${alertType}`,
      message: details,
      type: 'warning'
    });
  };

  // Fonction utilitaire pour notifier tous les utilisateurs d'un rôle spécifique
  const notifyUsersByRole = async (role: 'SUPER_ADMIN' | 'COMPTABLE' | 'DIRECTEUR_CAMPUS' | 'ENSEIGNANT', notification: Omit<NotificationData, 'user_id'>) => {
    try {
      const { data: users, error } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('role', role)
        .eq('is_active', true);

      if (error) throw error;

      const notifications = users?.map(user => ({
        ...notification,
        user_id: user.user_id
      })) || [];

      if (notifications.length > 0) {
        await supabase
          .from('notifications')
          .insert(notifications);
      }
    } catch (error) {
      console.error(`Error notifying users with role ${role}:`, error);
    }
  };

  // Fonction utilitaire pour notifier tous les directeurs d'un campus
  const notifyDirectorsByCampus = async (campusId: string, notification: Omit<NotificationData, 'user_id'>) => {
    try {
      const { data: directors, error } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('role', 'DIRECTEUR_CAMPUS')
        .eq('campus_id', campusId)
        .eq('is_active', true);

      if (error) throw error;

      const notifications = directors?.map(director => ({
        ...notification,
        user_id: director.user_id
      })) || [];

      if (notifications.length > 0) {
        await supabase
          .from('notifications')
          .insert(notifications);
      }
    } catch (error) {
      console.error(`Error notifying directors for campus ${campusId}:`, error);
    }
  };

  return {
    // Notifications individuelles
    notifyTeacherInvoiceValidated,
    notifyTeacherInvoiceRejected,
    notifyTeacherPaymentReceived,
    notifyTeacherMissingRIB,
    notifyDirectorNewInvoice,
    notifyDirectorInvoicePrevalidated,
    notifyDirectorNewTeacher,
    notifyAccountantInvoicePrevalidated,
    notifyAccountantNewPayment,
    notifySuperAdminUserRequest,
    notifySuperAdminSystemAlert,
    
    // Notifications groupées
    notifyUsersByRole,
    notifyDirectorsByCampus,
    
    // Fonction générique
    createNotification
  };
}