import React, { useEffect, useState } from 'react';
import { BrutalCard, BrutalCardContent, BrutalCardHeader, BrutalCardTitle } from '@/components/ui/brutal-card';
import { BrutalButton } from '@/components/ui/brutal-button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Building, 
  FileText, 
  CreditCard, 
  TrendingUp, 
  AlertTriangle,
  GraduationCap,
  Plus
} from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  totalCampus: number;
  totalInvoices: number;
  pendingInvoices: number;
  totalAmount: number;
  monthlyGrowth: number;
  validatedInvoices: number;
  paidInvoices: number;
  activeUsers: number;
}

export function SuperAdminDashboard() {
  const navigate = useNavigate();
  
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalCampus: 0,
    totalInvoices: 0,
    pendingInvoices: 0,
    totalAmount: 0,
    monthlyGrowth: 0,
    validatedInvoices: 0,
    paidInvoices: 0,
    activeUsers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Fetch users count
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Fetch campus count
      const { count: campusCount } = await supabase
        .from('campus')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Fetch invoices stats
      const { count: invoicesCount } = await supabase
        .from('invoice')
        .select('*', { count: 'exact', head: true });

      const { count: pendingCount } = await supabase
        .from('invoice')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { count: validatedCount } = await supabase
        .from('invoice')
        .select('*', { count: 'exact', head: true })
        .in('status', ['validated', 'paid']);

      const { count: paidCount } = await supabase
        .from('invoice')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'paid');

      // Fetch total amount
      const { data: amountData } = await supabase
        .from('invoice')
        .select('total_ttc')
        .eq('status', 'paid');

      const totalAmount = amountData?.reduce((sum, invoice) => sum + parseFloat(invoice.total_ttc?.toString() || '0'), 0) || 0;

      setStats({
        totalUsers: usersCount || 0,
        totalCampus: campusCount || 0,
        totalInvoices: invoicesCount || 0,
        pendingInvoices: pendingCount || 0,
        totalAmount,
        monthlyGrowth: 0,
        validatedInvoices: validatedCount || 0,
        paidInvoices: paidCount || 0,
        activeUsers: usersCount || 0
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Utilisateurs Actifs',
      value: stats.totalUsers.toString(),
      icon: Users,
      color: 'bg-brand-aurlom',
      change: '+5 ce mois',
    },
    {
      title: 'Campus Actifs',
      value: stats.totalCampus.toString(),
      icon: Building,
      color: 'bg-brand-education',
      change: 'Stable',
    },
    {
      title: 'Total Factures',
      value: stats.totalInvoices.toString(),
      icon: FileText,
      color: 'bg-brand-success',
      change: `+${Math.round(stats.monthlyGrowth)}%`,
    },
    {
      title: 'En Attente',
      value: stats.pendingInvoices.toString(),
      icon: AlertTriangle,
      color: 'bg-brand-warning',
      change: 'Action requise',
    },
    {
      title: 'Montant Total',
      value: `${stats.totalAmount.toLocaleString('fr-FR')} €`,
      icon: CreditCard,
      color: 'bg-brand-success',
      change: `+${stats.monthlyGrowth}%`,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Chargement du dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold">Dashboard Super Admin</h1>
          <p className="text-lg text-muted-foreground mt-2">
            Vue d'ensemble du système AURLOM BTS+
          </p>
        </div>
        {/* Actions rapides */}
        <div className="flex space-x-4">
          <BrutalButton 
            variant="success"
            onClick={() => navigate('/admin/users')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouvel Utilisateur
          </BrutalButton>
          <BrutalButton 
            variant="aurlom"
            onClick={() => navigate('/admin/campus')}
          >
            <GraduationCap className="h-4 w-4 mr-2" />
            Gestion Campus
          </BrutalButton>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <BrutalCard key={index} className="relative overflow-hidden">
              <BrutalCardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-lg ${card.color} text-white border-2 border-foreground shadow-brutal`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{card.value}</p>
                    <p className="text-sm text-muted-foreground">{card.change}</p>
                  </div>
                </div>
              </BrutalCardHeader>
              <BrutalCardContent>
                <p className="text-sm font-medium">{card.title}</p>
              </BrutalCardContent>
            </BrutalCard>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BrutalCard>
          <BrutalCardHeader>
            <BrutalCardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-brand-warning" />
              Actions Urgentes
            </BrutalCardTitle>
          </BrutalCardHeader>
          <BrutalCardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 border-2 border-border-light rounded-lg">
                <div>
                  <p className="font-medium">Factures en attente de prévalidation</p>
                  <p className="text-sm text-muted-foreground">{stats.pendingInvoices} factures</p>
                </div>
                <BrutalButton 
                  size="sm" 
                  variant="warning"
                  onClick={() => navigate('/admin/invoices-validation')}
                >
                  Voir
                </BrutalButton>
              </div>
              <div className="flex justify-between items-center p-3 border-2 border-border-light rounded-lg">
                <div>
                  <p className="font-medium">Gestion des utilisateurs</p>
                  <p className="text-sm text-muted-foreground">Approuver nouveaux comptes</p>
                </div>
                <BrutalButton 
                  size="sm" 
                  variant="success"
                  onClick={() => navigate('/admin/users')}
                >
                  Gérer
                </BrutalButton>
              </div>
            </div>
          </BrutalCardContent>
        </BrutalCard>

        <BrutalCard>
          <BrutalCardHeader>
            <BrutalCardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-brand-success" />
              Tendances du Mois
            </BrutalCardTitle>
          </BrutalCardHeader>
          <BrutalCardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm">
                  <span>Factures validées</span>
                  <span className="font-medium">{Math.round((stats.validatedInvoices / (stats.totalInvoices || 1)) * 100)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 mt-1">
                  <div className="bg-brand-success h-2 rounded-full" style={{ width: `${Math.round((stats.validatedInvoices / (stats.totalInvoices || 1)) * 100)}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm">
                  <span>Paiements effectués</span>
                  <span className="font-medium">{Math.round((stats.paidInvoices / (stats.totalInvoices || 1)) * 100)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 mt-1">
                  <div className="bg-brand-aurlom h-2 rounded-full" style={{ width: `${Math.round((stats.paidInvoices / (stats.totalInvoices || 1)) * 100)}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm">
                  <span>Utilisateurs actifs</span>
                  <span className="font-medium">{Math.round((stats.activeUsers / (stats.totalUsers || 1)) * 100)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 mt-1">
                  <div className="bg-brand-education h-2 rounded-full" style={{ width: `${Math.round((stats.activeUsers / (stats.totalUsers || 1)) * 100)}%` }}></div>
                </div>
              </div>
            </div>
          </BrutalCardContent>
        </BrutalCard>
      </div>
    </div>
  );
}