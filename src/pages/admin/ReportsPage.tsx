import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { BrutalCard, BrutalCardContent, BrutalCardHeader, BrutalCardTitle } from '@/components/ui/brutal-card';
import { BrutalButton } from '@/components/ui/brutal-button';
import { CatLoader } from '@/components/ui/cat-loader';
import { formatInvoicePeriod } from '@/utils/dateUtils';
import { 
  FileText, 
  Download, 
  Calendar, 
  Building,
  Users,
  TrendingUp,
  BarChart
} from 'lucide-react';
import { toast } from 'sonner';

export default function ReportsPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>({});

  useEffect(() => {
    if (profile && ['SUPER_ADMIN', 'COMPTABLE'].includes(profile.role)) {
      fetchReportData();
    }
  }, [profile]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      // Récupérer les données pour les rapports
      const { data: invoicesData } = await supabase
        .from('invoice')
        .select('*');
      
      const { data: paymentsData } = await supabase
        .from('payment')
        .select('*');

      setReportData({
        invoices: invoicesData || [],
        payments: paymentsData || []
      });
    } catch (error) {
      console.error('Erreur lors du chargement des données de rapport:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const generateMonthlyReport = async () => {
    try {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      const monthlyInvoices = reportData.invoices?.filter((inv: any) => 
        inv.month === currentMonth && inv.year === currentYear
      ) || [];

      const csvContent = [
        'Type,Montant,Status,Enseignant,Campus',
        ...monthlyInvoices.map((inv: any) => 
          `Facture,${inv.total_ttc},${inv.status},${inv.teacher_id},${inv.campus_id}`
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rapport-mensuel-${formatInvoicePeriod(currentMonth, currentYear)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Rapport mensuel généré avec succès');
    } catch (error) {
      console.error('Erreur génération rapport:', error);
      toast.error('Erreur lors de la génération du rapport');
    }
  };

  const generateAnnualReport = async () => {
    try {
      const currentYear = new Date().getFullYear();
      
      const annualInvoices = reportData.invoices?.filter((inv: any) => 
        inv.year === currentYear
      ) || [];

      const csvContent = [
        'Mois,Nombre_Factures,Montant_Total,Factures_Payees',
        ...Array.from({length: 12}, (_, i) => {
          const month = i + 1;
          const monthInvoices = annualInvoices.filter((inv: any) => inv.month === month);
          const totalAmount = monthInvoices.reduce((sum: number, inv: any) => sum + parseFloat(inv.total_ttc || '0'), 0);
          const paidCount = monthInvoices.filter((inv: any) => inv.status === 'paid').length;
          
          return `${formatInvoicePeriod(month, currentYear)},${monthInvoices.length},${totalAmount.toFixed(2)},${paidCount}`;
        })
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rapport-annuel-${currentYear}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Rapport annuel généré avec succès');
    } catch (error) {
      console.error('Erreur génération rapport:', error);
      toast.error('Erreur lors de la génération du rapport');
    }
  };

  if (!profile || !['SUPER_ADMIN', 'COMPTABLE'].includes(profile.role)) {
    return (
      <div className="container-brutal py-8">
        <BrutalCard>
          <BrutalCardContent className="p-8 text-center">
            <h2 className="text-xl font-bold mb-4">Accès refusé</h2>
            <p>Vous n'avez pas les permissions pour accéder à cette page.</p>
          </BrutalCardContent>
        </BrutalCard>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container-brutal py-8">
        <div className="flex items-center justify-center h-64">
          <CatLoader message="Chargement des données de rapport..." size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="container-brutal py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold">Rapports</h1>
            <p className="text-lg text-muted-foreground mt-2">
              Génération de rapports financiers et statistiques
            </p>
          </div>
        </div>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <BrutalCard>
            <BrutalCardContent className="p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg lg:text-2xl font-bold">{reportData.invoices?.length || 0}</p>
                  <p className="text-xs lg:text-sm text-muted-foreground">Total Factures</p>
                </div>
                <FileText className="h-6 w-6 lg:h-8 lg:w-8 text-brand-aurlom" />
              </div>
            </BrutalCardContent>
          </BrutalCard>

          <BrutalCard>
            <BrutalCardContent className="p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg lg:text-2xl font-bold">{reportData.payments?.length || 0}</p>
                  <p className="text-xs lg:text-sm text-muted-foreground">Total Paiements</p>
                </div>
                <TrendingUp className="h-6 w-6 lg:h-8 lg:w-8 text-brand-success" />
              </div>
            </BrutalCardContent>
          </BrutalCard>

          <BrutalCard>
            <BrutalCardContent className="p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg lg:text-2xl font-bold">
                    {reportData.invoices?.reduce((sum: number, inv: any) => 
                      sum + parseFloat(inv.total_ttc || '0'), 0).toLocaleString('fr-FR') || '0'} €
                  </p>
                  <p className="text-xs lg:text-sm text-muted-foreground">CA Total</p>
                </div>
                <BarChart className="h-6 w-6 lg:h-8 lg:w-8 text-brand-education" />
              </div>
            </BrutalCardContent>
          </BrutalCard>

          <BrutalCard>
            <BrutalCardContent className="p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg lg:text-2xl font-bold">
                    {new Date().getFullYear()}
                  </p>
                  <p className="text-xs lg:text-sm text-muted-foreground">Année Courante</p>
                </div>
                <Calendar className="h-6 w-6 lg:h-8 lg:w-8 text-muted-foreground" />
              </div>
            </BrutalCardContent>
          </BrutalCard>
        </div>

        {/* Actions de génération de rapports */}
        <BrutalCard>
          <BrutalCardHeader>
            <BrutalCardTitle>Génération de Rapports</BrutalCardTitle>
          </BrutalCardHeader>
          <BrutalCardContent className="p-4 lg:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Rapport Mensuel</h3>
                <p className="text-muted-foreground">
                  Génère un rapport détaillé pour le mois en cours avec toutes les factures et paiements.
                </p>
                <BrutalButton 
                  onClick={generateMonthlyReport}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger Rapport Mensuel
                </BrutalButton>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Rapport Annuel</h3>
                <p className="text-muted-foreground">
                  Génère un rapport complet pour l'année en cours avec analyse par mois.
                </p>
                <BrutalButton 
                  onClick={generateAnnualReport}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger Rapport Annuel
                </BrutalButton>
              </div>
            </div>
          </BrutalCardContent>
        </BrutalCard>
      </div>
    </div>
  );
}