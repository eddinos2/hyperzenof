import React, { useEffect, useState } from 'react';
import { BrutalCard, BrutalCardContent, BrutalCardHeader, BrutalCardTitle } from '@/components/ui/brutal-card';
import { BrutalButton } from '@/components/ui/brutal-button';
import { CatLoader } from '@/components/ui/cat-loader';
import { supabase } from '@/integrations/supabase/client';
import { 
  FileCheck, 
  CreditCard, 
  TrendingUp, 
  AlertCircle,
  Download,
  CheckCircle,
  Clock
} from 'lucide-react';

export function ComptableDashboard() {
  const [stats, setStats] = useState({
    toValidate: 0,
    toPay: 0,
    totalAmount: 0,
    monthlyTotal: 0,
  });
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Factures à valider
      const { count: toValidateCount } = await supabase
        .from('invoice')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'prevalidated');

      // Factures à payer
      const { count: toPayCount } = await supabase
        .from('invoice')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'validated');

      // Montant total payé
      const { data: paidData } = await supabase
        .from('invoice')
        .select('total_ttc')
        .eq('status', 'paid');

      const totalAmount = paidData?.reduce((sum, invoice) => sum + parseFloat(invoice.total_ttc?.toString() || '0'), 0) || 0;

      // Montant du mois
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      const { data: monthlyData } = await supabase
        .from('invoice')
        .select('total_ttc')
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .in('status', ['validated', 'paid']);

      const monthlyTotal = monthlyData?.reduce((sum, invoice) => sum + parseFloat(invoice.total_ttc?.toString() || '0'), 0) || 0;

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
          profiles!invoice_teacher_id_fkey (first_name, last_name),
          campus (name)
        `)
        .in('status', ['prevalidated', 'validated'])
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        toValidate: toValidateCount || 0,
        toPay: toPayCount || 0,
        totalAmount,
        monthlyTotal,
      });

      setRecentInvoices(invoicesData || []);
    } catch (error) {
      console.error('Error fetching comptable dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleValidateInvoice = async (invoiceId: string) => {
    try {
      const { error } = await supabase
        .from('invoice')
        .update({ status: 'validated' })
        .eq('id', invoiceId);

      if (!error) {
        fetchDashboardData(); // Refresh data
      }
    } catch (error) {
      console.error('Error validating invoice:', error);
    }
  };

  const handlePayInvoice = async (invoiceId: string, amount: number) => {
    try {
      // Update invoice status
      const { error: invoiceError } = await supabase
        .from('invoice')
        .update({ status: 'paid' })
        .eq('id', invoiceId);

      // Create payment record
      const { error: paymentError } = await supabase
        .from('payment')
        .insert({
          invoice_id: invoiceId,
          amount_ttc: amount,
          method: 'virement',
        });

      if (!invoiceError && !paymentError) {
        fetchDashboardData(); // Refresh data
      }
    } catch (error) {
      console.error('Error processing payment:', error);
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
          <h1 className="text-4xl font-bold">Dashboard Comptable</h1>
          <p className="text-lg text-muted-foreground mt-2">
            Gestion financière et validation des factures
          </p>
        </div>
        <div className="flex space-x-4">
          <BrutalButton variant="success">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </BrutalButton>
          <BrutalButton variant="aurlom">
            <FileCheck className="h-4 w-4 mr-2" />
            Rapports
          </BrutalButton>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <BrutalCard>
          <BrutalCardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-lg bg-brand-warning text-white border-2 border-foreground shadow-brutal">
                <FileCheck className="h-6 w-6" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{stats.toValidate}</p>
                <p className="text-sm text-muted-foreground">À valider</p>
              </div>
            </div>
          </BrutalCardHeader>
        </BrutalCard>

        <BrutalCard>
          <BrutalCardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-lg bg-brand-aurlom text-white border-2 border-foreground shadow-brutal">
                <CreditCard className="h-6 w-6" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{stats.toPay}</p>
                <p className="text-sm text-muted-foreground">À payer</p>
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
                <p className="text-2xl font-bold">{stats.totalAmount.toLocaleString('fr-FR')} €</p>
                <p className="text-sm text-muted-foreground">Total payé</p>
              </div>
            </div>
          </BrutalCardHeader>
        </BrutalCard>

        <BrutalCard>
          <BrutalCardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-lg bg-brand-education text-white border-2 border-foreground shadow-brutal">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{stats.monthlyTotal.toLocaleString('fr-FR')} €</p>
                <p className="text-sm text-muted-foreground">Ce mois</p>
              </div>
            </div>
          </BrutalCardHeader>
        </BrutalCard>
      </div>

      {/* Recent Invoices */}
      <BrutalCard>
        <BrutalCardHeader>
          <BrutalCardTitle>Factures en Attente d'Action</BrutalCardTitle>
        </BrutalCardHeader>
        <BrutalCardContent>
          <div className="space-y-4">
            {recentInvoices.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Aucune facture en attente</p>
            ) : (
              recentInvoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-4 border-2 border-border-light rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-lg border-2 border-foreground ${
                      invoice.status === 'prevalidated' ? 'bg-brand-warning' : 'bg-brand-aurlom'
                    } text-white`}>
                      {invoice.status === 'prevalidated' ? (
                        <Clock className="h-4 w-4" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {invoice.profiles?.first_name} {invoice.profiles?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {invoice.campus?.name} • {invoice.month}/{invoice.year}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="font-mono font-bold">{parseFloat(invoice.total_ttc).toLocaleString('fr-FR')} €</p>
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border-2 ${
                        invoice.status === 'prevalidated' 
                          ? 'bg-yellow-100 text-yellow-800 border-yellow-600'
                          : 'bg-brand-aurlom-light text-brand-aurlom border-brand-aurlom'
                      }`}>
                        {invoice.status === 'prevalidated' ? 'À valider' : 'À payer'}
                      </span>
                    </div>
                    {invoice.status === 'prevalidated' ? (
                      <BrutalButton 
                        size="sm" 
                        variant="success"
                        onClick={() => handleValidateInvoice(invoice.id)}
                      >
                        Valider
                      </BrutalButton>
                    ) : (
                      <BrutalButton 
                        size="sm" 
                        variant="aurlom"
                        onClick={() => handlePayInvoice(invoice.id, parseFloat(invoice.total_ttc))}
                      >
                        Payer
                      </BrutalButton>
                    )}
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