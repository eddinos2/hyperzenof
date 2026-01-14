import React, { useEffect, useState } from 'react';
import { BrutalCard, BrutalCardContent, BrutalCardHeader, BrutalCardTitle } from '@/components/ui/brutal-card';
import { BrutalButton } from '@/components/ui/brutal-button';
import { CatLoader } from '@/components/ui/cat-loader';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { 
  FileText, 
  Plus, 
  Clock, 
  CheckCircle, 
  CreditCard,
  Calendar,
  TrendingUp,
  Eye
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function EnseignantDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalInvoices: 0,
    pendingInvoices: 0,
    paidAmount: 0,
    monthlyHours: 0,
  });
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      // Total factures
      const { count: totalCount } = await supabase
        .from('invoice')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', user.id);

      // Factures en attente
      const { count: pendingCount } = await supabase
        .from('invoice')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', user.id)
        .in('status', ['pending', 'prevalidated']);

      // Montant payé
      const { data: paidData } = await supabase
        .from('invoice')
        .select('total_ttc')
        .eq('teacher_id', user.id)
        .eq('status', 'paid');

      const paidAmount = paidData?.reduce((sum, invoice) => sum + parseFloat(invoice.total_ttc?.toString() || '0'), 0) || 0;

      // Heures du mois
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      const { data: monthlyData } = await supabase
        .from('invoice_line')
        .select('hours_qty, invoice!inner(*)')
        .eq('invoice.teacher_id', user.id)
        .eq('invoice.month', currentMonth)
        .eq('invoice.year', currentYear);

      const monthlyHours = monthlyData?.reduce((sum, line) => sum + parseFloat(line.hours_qty?.toString() || '0'), 0) || 0;

      // Factures récentes
      const { data: invoicesData } = await supabase
        .from('invoice')
        .select(`
          id,
          month,
          year,
          status,
          total_ttc,
          created_at,
          campus (name)
        `)
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        totalInvoices: totalCount || 0,
        pendingInvoices: pendingCount || 0,
        paidAmount,
        monthlyHours,
      });

      setRecentInvoices(invoicesData || []);
    } catch (error) {
      console.error('Error fetching enseignant dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-600';
      case 'prevalidated': return 'bg-brand-aurlom-light text-brand-aurlom border-brand-aurlom';
      case 'validated': return 'bg-green-100 text-green-800 border-green-600';
      case 'paid': return 'bg-emerald-100 text-emerald-800 border-emerald-600';
      default: return 'bg-gray-100 text-gray-800 border-gray-600';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'prevalidated': return 'Prévalidée';
      case 'validated': return 'Validée';
      case 'paid': return 'Payée';
      default: return status;
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
          <h1 className="text-4xl font-bold">Mon Dashboard</h1>
          <p className="text-lg text-muted-foreground mt-2">
            Gestion de vos factures et activités
          </p>
        </div>
        <div className="flex space-x-4">
          <Link to="/create-invoice">
            <BrutalButton variant="success">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle Facture
            </BrutalButton>
          </Link>
          <Link to="/my-invoices">
            <BrutalButton variant="aurlom">
              <FileText className="h-4 w-4 mr-2" />
              Mes Factures
            </BrutalButton>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <BrutalCard>
          <BrutalCardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-lg bg-brand-aurlom text-white border-2 border-foreground shadow-brutal">
                <FileText className="h-6 w-6" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{stats.totalInvoices}</p>
                <p className="text-sm text-muted-foreground">Total factures</p>
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
                <p className="text-sm text-muted-foreground">En cours</p>
              </div>
            </div>
          </BrutalCardHeader>
        </BrutalCard>

        <BrutalCard>
          <BrutalCardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-lg bg-brand-success text-white border-2 border-foreground shadow-brutal">
                <CreditCard className="h-6 w-6" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{stats.paidAmount.toLocaleString('fr-FR')} €</p>
                <p className="text-sm text-muted-foreground">Total payé</p>
              </div>
            </div>
          </BrutalCardHeader>
        </BrutalCard>

        <BrutalCard>
          <BrutalCardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-lg bg-brand-education text-white border-2 border-foreground shadow-brutal">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{stats.monthlyHours.toFixed(1)}h</p>
                <p className="text-sm text-muted-foreground">Ce mois</p>
              </div>
            </div>
          </BrutalCardHeader>
        </BrutalCard>
      </div>

      {/* Recent Invoices */}
      <BrutalCard>
        <BrutalCardHeader>
          <BrutalCardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Mes Dernières Factures
          </BrutalCardTitle>
        </BrutalCardHeader>
        <BrutalCardContent>
          <div className="space-y-4">
            {recentInvoices.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">Aucune facture créée</p>
                <Link to="/create-invoice">
                  <BrutalButton variant="success">
                    <Plus className="h-4 w-4 mr-2" />
                    Créer ma première facture
                  </BrutalButton>
                </Link>
              </div>
            ) : (
              recentInvoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-4 border-2 border-border-light rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-lg border-2 border-foreground text-white ${
                      invoice.status === 'paid' ? 'bg-brand-success' :
                      invoice.status === 'validated' ? 'bg-brand-aurlom' :
                      invoice.status === 'prevalidated' ? 'bg-brand-education' : 'bg-brand-warning'
                    }`}>
                      {invoice.status === 'paid' ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Clock className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        Facture {invoice.month}/{invoice.year}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {invoice.campus?.name} • {new Date(invoice.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="font-mono font-bold">{parseFloat(invoice.total_ttc).toLocaleString('fr-FR')} €</p>
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border-2 ${getStatusColor(invoice.status)}`}>
                        {getStatusLabel(invoice.status)}
                      </span>
                    </div>
                    <Link to="/my-invoices">
                      <BrutalButton size="sm" variant="outline">
                        <Eye className="h-4 w-4" />
                      </BrutalButton>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </BrutalCardContent>
      </BrutalCard>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BrutalCard>
          <BrutalCardHeader>
            <BrutalCardTitle>Actions Rapides</BrutalCardTitle>
          </BrutalCardHeader>
          <BrutalCardContent>
            <div className="space-y-3">
              <Link to="/create-invoice" className="block">
                <div className="flex items-center justify-between p-3 border-2 border-border-light rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <Plus className="h-5 w-5 text-brand-success" />
                    <span className="font-medium">Créer une nouvelle facture</span>
                  </div>
                  <BrutalButton size="sm" variant="success">Créer</BrutalButton>
                </div>
              </Link>
              
              <Link to="/my-invoices" className="block">
                <div className="flex items-center justify-between p-3 border-2 border-border-light rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-brand-aurlom" />
                    <span className="font-medium">Voir toutes mes factures</span>
                  </div>
                  <BrutalButton size="sm" variant="outline">Voir</BrutalButton>
                </div>
              </Link>

              <Link to="/teacher-profile" className="block">
                <div className="flex items-center justify-between p-3 border-2 border-border-light rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-brand-education" />
                    <span className="font-medium">Mettre à jour mon profil</span>
                  </div>
                  <BrutalButton size="sm" variant="outline">Éditer</BrutalButton>
                </div>
              </Link>
            </div>
          </BrutalCardContent>
        </BrutalCard>

        <BrutalCard>
          <BrutalCardHeader>
            <BrutalCardTitle>Conseils & Astuces</BrutalCardTitle>
          </BrutalCardHeader>
          <BrutalCardContent>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="p-3 border-2 border-border-light rounded-lg">
                <p className="font-medium text-foreground">💡 Saisissez vos factures régulièrement</p>
                <p>Créez vos factures dès la fin du mois pour un traitement plus rapide.</p>
              </div>
              
              <div className="p-3 border-2 border-border-light rounded-lg">
                <p className="font-medium text-foreground">⏰ Respectez les délais</p>
                <p>Les factures doivent être saisies avant le 5 du mois suivant.</p>
              </div>
              
              <div className="p-3 border-2 border-border-light rounded-lg">
                <p className="font-medium text-foreground">✅ Vérifiez vos informations</p>
                <p>Contrôlez les heures et les tarifs avant de soumettre votre facture.</p>
              </div>
            </div>
          </BrutalCardContent>
        </BrutalCard>
      </div>
    </div>
  );
}