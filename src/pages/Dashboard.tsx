import { AdvancedNotificationCenter } from '@/components/notifications/AdvancedNotificationCenter';
import { SystemHealthMonitorFixed } from '@/components/admin/SystemHealthMonitorFixed';
import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { SuperAdminDashboard } from '@/components/dashboard/SuperAdminDashboard';
import { ComptableDashboard } from '@/components/dashboard/ComptableDashboard';
import { DirecteurDashboard } from '@/components/dashboard/DirecteurDashboard';
import { EnseignantDashboard } from '@/components/dashboard/EnseignantDashboard';
import { CatLoader } from '@/components/ui/cat-loader';

export default function Dashboard() {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <CatLoader message="Chargement du dashboard..." size="lg" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">Erreur: Profil utilisateur non trouvé</div>
      </div>
    );
  }

  const dashboards = {
    SUPER_ADMIN: <SuperAdminDashboard />,
    COMPTABLE: <ComptableDashboard />,
    DIRECTEUR_CAMPUS: <DirecteurDashboard />,
    ENSEIGNANT: <EnseignantDashboard />,
  };

  return (
    <div className="container-brutal py-8">
      {/* Notification Center & System Health for Super Admin */}
      {profile.role === 'SUPER_ADMIN' && (
        <div className="mb-6 flex justify-between items-start">
          <SystemHealthMonitorFixed />
          <AdvancedNotificationCenter />
        </div>
      )}
      
      {dashboards[profile.role]}
    </div>
  );
}