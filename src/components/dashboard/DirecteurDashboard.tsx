import React, { useEffect, useState } from 'react';
import { BrutalCard, BrutalCardContent, BrutalCardHeader, BrutalCardTitle } from '@/components/ui/brutal-card';
import { BrutalButton } from '@/components/ui/brutal-button';
import { CatLoader } from '@/components/ui/cat-loader';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { 
  Users, 
  FileText, 
  CheckCircle, 
  Clock,
  Building,
  GraduationCap,
  TrendingUp
} from 'lucide-react';

export function DirecteurDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    totalTeachers: 0,
    pendingInvoices: 0,
    totalClasses: 0,
    monthlyAmount: 0,
  });
  const [pendingInvoices, setPendingInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.campus_id) {
      fetchDashboardData();
    }
  }, [profile?.campus_id]);

  const fetchDashboardData = async () => {
    if (!profile?.campus_id) return;

    try {
      // Enseignants de ce campus
      const { count: teachersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('campus_id', profile.campus_id)
        .eq('role', 'ENSEIGNANT')
        .eq('is_active', true);

      // Pour les factures, utiliser la même logique que InvoicesManagement
      // Trouver les factures qui contiennent des lignes de ce campus
      const { data: invoiceIds } = await supabase
        .from('invoice_line')
        .select('invoice_id')
        .eq('campus_id', profile.campus_id);

      const uniqueInvoiceIds = invoiceIds ? [...new Set(invoiceIds.map(item => item.invoice_id))] : [];

      let pendingCount = 0;
      let monthlyAmount = 0;
      let invoicesData: any[] = [];

      if (uniqueInvoiceIds.length > 0) {
        // Factures en attente de prévalidation
        const { count } = await supabase
          .from('invoice')
          .select('*', { count: 'exact', head: true })
          .in('id', uniqueInvoiceIds)
          .eq('status', 'pending');
        
        pendingCount = count || 0;

        // Montant mensuel
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        
        const { data: monthlyData } = await supabase
          .from('invoice')
          .select('total_ttc')
          .in('id', uniqueInvoiceIds)
          .eq('month', currentMonth)
          .eq('year', currentYear);

        monthlyAmount = monthlyData?.reduce((sum, invoice) => sum + parseFloat(invoice.total_ttc?.toString() || '0'), 0) || 0;

        // Factures en attente détaillées - récupérer les données teacher séparément
        const { data: pendingInvoicesData } = await supabase
          .from('invoice')
          .select(`
            id, 
            month, 
            year, 
            status, 
            total_ttc, 
            created_at, 
            teacher_id,
            invoice_line (
              id,
              hours_qty,
              validation_status,
              campus_id
            )
          `)
          .in('id', uniqueInvoiceIds)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(5);

        if (pendingInvoicesData && pendingInvoicesData.length > 0) {
          // Récupérer les informations des enseignants
          const teacherIds = pendingInvoicesData.map(inv => inv.teacher_id);
          const { data: teachersData } = await supabase
            .from('profiles')
            .select('user_id, first_name, last_name, email')
            .in('user_id', teacherIds);

          // Mapper les données avec calculs par campus du directeur
          invoicesData = pendingInvoicesData.map(invoice => {
            const campusLines = invoice.invoice_line?.filter(line => line.campus_id === profile.campus_id) || [];
            const totalHours = campusLines.reduce((sum, line) => sum + parseFloat(line.hours_qty?.toString() || '0'), 0);
            const prevalidatedLines = campusLines.filter(line => line.validation_status === 'prevalidated').length;
            const pendingLines = campusLines.filter(line => line.validation_status === 'pending').length;
            
            return {
              ...invoice,
              profiles: teachersData?.find(teacher => teacher.user_id === invoice.teacher_id),
              campus_lines_count: campusLines.length,
              campus_total_hours: totalHours,
              campus_prevalidated_lines: prevalidatedLines,
              campus_pending_lines: pendingLines,
              all_campus_lines_prevalidated: pendingLines === 0 && campusLines.length > 0
            };
          });
        }
      }

      // Classes du campus
      const { count: classesCount } = await supabase
        .from('class')
        .select('*', { count: 'exact', head: true })
        .eq('campus_id', profile.campus_id)
        .eq('is_active', true);

      setStats({
        totalTeachers: teachersCount || 0,
        pendingInvoices: pendingCount,
        totalClasses: classesCount || 0,
        monthlyAmount,
      });

      setPendingInvoices(invoicesData);
    } catch (error) {
      console.error('Error fetching directeur dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevalidateInvoice = async (invoiceId: string) => {
    try {
      // Utiliser la fonction de prévalidation en masse qui respecte les campus
      const { data, error } = await supabase.rpc('bulk_prevalidate_invoice_lines', {
        invoice_id_param: invoiceId,
        director_user_id: profile?.user_id
      });

      if (error) throw error;

      const result = data as { success: boolean; lines_processed?: number; lines_total?: number; error?: string };

      if (result.success) {
        // Log the validation
        await supabase
          .from('validation_log')
          .insert({
            invoice_id: invoiceId,
            actor_id: profile?.user_id,
            role: 'DIRECTEUR_CAMPUS',
            action: 'bulk_prevalidate_lines',
            previous_status: 'pending',
            new_status: 'prevalidated',
            comment: `Dashboard: ${result.lines_processed} lignes prévalidées`
          });

        fetchDashboardData(); // Refresh data
      } else {
        console.error('Prevalidation failed:', result.error);
      }
    } catch (error) {
      console.error('Error prevalidating invoice:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <CatLoader message="Chargement..." size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold">Dashboard Directeur</h1>
          <p className="text-lg text-muted-foreground mt-2">
            Gestion de votre campus
          </p>
        </div>
        <div className="flex space-x-4">
          <BrutalButton variant="education">
            <Users className="h-4 w-4 mr-2" />
            Enseignants
          </BrutalButton>
          <BrutalButton variant="aurlom">
            <GraduationCap className="h-4 w-4 mr-2" />
            Classes
          </BrutalButton>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <BrutalCard>
          <BrutalCardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-lg bg-brand-education text-white border-2 border-foreground shadow-brutal">
                <Users className="h-6 w-6" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{stats.totalTeachers}</p>
                <p className="text-sm text-muted-foreground">Enseignants</p>
              </div>
            </div>
          </BrutalCardHeader>
        </BrutalCard>

        <BrutalCard>
          <BrutalCardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-lg bg-brand-warning text-white border-2 border-foreground shadow-brutal">
                <Clock className="h-6 w-6" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{stats.pendingInvoices}</p>
                <p className="text-sm text-muted-foreground">À prévalider</p>
              </div>
            </div>
          </BrutalCardHeader>
        </BrutalCard>

        <BrutalCard>
          <BrutalCardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-lg bg-brand-aurlom text-white border-2 border-foreground shadow-brutal">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{stats.totalClasses}</p>
                <p className="text-sm text-muted-foreground">Classes</p>
              </div>
            </div>
          </BrutalCardHeader>
        </BrutalCard>

        <BrutalCard>
          <BrutalCardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-lg bg-brand-success text-white border-2 border-foreground shadow-brutal">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{stats.monthlyAmount.toLocaleString('fr-FR')} €</p>
                <p className="text-sm text-muted-foreground">Ce mois</p>
              </div>
            </div>
          </BrutalCardHeader>
        </BrutalCard>
      </div>

      {/* Pending Invoices */}
      <BrutalCard>
        <BrutalCardHeader>
          <BrutalCardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Factures en Attente de Prévalidation
          </BrutalCardTitle>
        </BrutalCardHeader>
        <BrutalCardContent>
          <div className="space-y-4">
            {pendingInvoices.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Aucune facture en attente</p>
            ) : (
              pendingInvoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-4 border-2 border-border-light rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-lg text-white border-2 border-foreground ${
                      invoice.all_campus_lines_prevalidated 
                        ? 'bg-brand-success' 
                        : 'bg-brand-warning'
                    }`}>
                      {invoice.all_campus_lines_prevalidated ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Clock className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="font-medium">
                          {invoice.profiles?.first_name} {invoice.profiles?.last_name}
                        </p>
                        <span className="text-xs bg-muted px-2 py-0.5 rounded">
                          {invoice.month}/{invoice.year}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {invoice.profiles?.email}
                      </p>
                      <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                        <span>📄 {invoice.campus_lines_count || 0} lignes (votre campus)</span>
                        <span>⏱️ {invoice.campus_total_hours || 0}h</span>
                        <span>📅 {new Date(invoice.created_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                      {invoice.campus_lines_count > 0 && (
                        <div className="flex items-center space-x-2 mt-1 text-xs">
                          <span className={`px-2 py-0.5 rounded ${
                            invoice.all_campus_lines_prevalidated 
                              ? 'bg-green-100 text-green-800 border border-green-600' 
                              : 'bg-orange-100 text-orange-800 border border-orange-600'
                          }`}>
                            Prévalidé: {invoice.campus_prevalidated_lines}/{invoice.campus_lines_count}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="font-mono font-bold text-lg">{parseFloat(invoice.total_ttc).toLocaleString('fr-FR')} €</p>
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border-2 ${
                        invoice.all_campus_lines_prevalidated
                          ? 'bg-green-100 text-green-800 border-green-600'
                          : 'bg-yellow-100 text-yellow-800 border-yellow-600'
                      }`}>
                        {invoice.all_campus_lines_prevalidated ? 'Prévalidé' : 'En attente'}
                      </span>
                    </div>
                    <BrutalButton 
                      size="sm" 
                      variant={invoice.all_campus_lines_prevalidated ? "outline" : "success"}
                      onClick={() => handlePrevalidateInvoice(invoice.id)}
                      disabled={invoice.all_campus_lines_prevalidated || invoice.campus_pending_lines === 0}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      {invoice.all_campus_lines_prevalidated ? 'Déjà prévalidé' : 'Prévalider'}
                    </BrutalButton>
                  </div>
                </div>
              ))
            )}
          </div>
        </BrutalCardContent>
      </BrutalCard>
    </div>
  );
}