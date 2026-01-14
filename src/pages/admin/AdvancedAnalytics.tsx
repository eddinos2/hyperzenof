import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { BrutalCard, BrutalCardHeader, BrutalCardTitle, BrutalCardContent } from '@/components/ui/brutal-card';
import { BrutalButton } from '@/components/ui/brutal-button';
import { BrutalInput } from '@/components/ui/brutal-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Calendar, DollarSign, Users, Clock,
  FileText, Download, Filter, RefreshCw, Building, GraduationCap
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

interface AnalyticsData {
  invoices_by_month: Array<{
    month: string;
    count: number;
    total_amount: number;
    total_hours: number;
  }>;
  invoices_by_status: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  invoices_by_year: Array<{
    year: number;
    count: number;
    total_amount: number;
    avg_hours: number;
  }>;
  payments_trend: Array<{
    month: string;
    amount: number;
  }>;
  top_teachers: Array<{
    name: string;
    invoices_count: number;
    total_amount: number;
    total_hours: number;
    hourly_rate: number;
  }>;
  campus_performance: Array<{
    campus_name: string;
    invoices_count: number;
    teachers_count: number;
    avg_amount: number;
    total_hours: number;
    avg_hourly_rate: number;
  }>;
  filiere_performance: Array<{
    filiere_name: string;
    pole: string;
    invoices_count: number;
    total_amount: number;
    total_hours: number;
    avg_hourly_rate: number;
  }>;
  kpis: {
    total_invoices: number;
    total_amount: number;
    total_hours: number;
    avg_hourly_rate: number;
    completion_rate: number;
    monthly_growth: number;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function AdvancedAnalytics() {
  const { profile } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: format(subMonths(new Date(), 11), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [selectedCampus, setSelectedCampus] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedFiliere, setSelectedFiliere] = useState<string>('all');
  const [campuses, setCampuses] = useState<Array<{id: string, name: string}>>([]);
  const [filieres, setFilieres] = useState<Array<{id: string, label: string, pole: string}>>([]);
  const [years, setYears] = useState<number[]>([]);

  useEffect(() => {
    if (profile?.role === 'SUPER_ADMIN' || profile?.role === 'COMPTABLE') {
      fetchCampuses();
      fetchFilieres();
      fetchYears();
      fetchAnalytics();
    }
  }, [profile, dateRange, selectedCampus, selectedYear, selectedFiliere]);

  const fetchCampuses = async () => {
    try {
      const { data } = await supabase
        .from('campus')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      
      setCampuses(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des campus:', error);
    }
  };

  const fetchFilieres = async () => {
    try {
      const { data } = await supabase
        .from('filiere')
        .select('id, label, pole')
        .eq('is_active', true)
        .order('label');
      
      setFilieres(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des filières:', error);
    }
  };

  const fetchYears = async () => {
    try {
      const { data } = await supabase
        .from('invoice')
        .select('year')
        .order('year', { ascending: false });
      
      const uniqueYears = [...new Set((data || []).map(item => item.year))];
      setYears(uniqueYears);
    } catch (error) {
      console.error('Erreur lors du chargement des années:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Base query with date filter
      let baseQuery = supabase
        .from('invoice')
        .select('*')
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end);

      // Add filters
      if (selectedCampus !== 'all') {
        baseQuery = baseQuery.eq('campus_id', selectedCampus);
      }
      if (selectedYear !== 'all') {
        baseQuery = baseQuery.eq('year', parseInt(selectedYear));
      }

      const { data: invoices, error } = await baseQuery;
      if (error) throw error;

      // Get related data
      const [teachersData, campusData, filiereData] = await Promise.all([
        supabase.from('profiles').select('user_id, first_name, last_name, email'),
        supabase.from('campus').select('id, name, address'),
        supabase.from('filiere').select('id, label, pole')
      ]);

      // Create maps
      const teacherMap = (teachersData.data || []).reduce((acc: Record<string, any>, t: any) => {
        acc[t.user_id] = t;
        return acc;
      }, {});

      const campusMap = (campusData.data || []).reduce((acc: Record<string, any>, c: any) => {
        acc[c.id] = c;
        return acc;
      }, {});

      const filiereMap = (filiereData.data || []).reduce((acc: Record<string, any>, f: any) => {
        acc[f.id] = f;
        return acc;
      }, {});

      // Get invoice lines for detailed analysis
      const invoiceIds = (invoices || []).map(inv => inv.id);
      let invoiceLines: any[] = [];
      
      if (invoiceIds.length > 0) {
        const { data: linesData } = await supabase
          .from('invoice_line')
          .select('*')
          .in('invoice_id', invoiceIds);
        
        // Apply filiere filter on lines if needed
        if (selectedFiliere !== 'all') {
          invoiceLines = (linesData || []).filter(line => line.filiere_id === selectedFiliere);
        } else {
          invoiceLines = linesData || [];
        }
      }

      // Create a map of invoice lines by invoice_id
      const invoiceLinesMap = invoiceLines.reduce((acc: Record<string, any[]>, line: any) => {
        if (!acc[line.invoice_id]) acc[line.invoice_id] = [];
        acc[line.invoice_id].push(line);
        return acc;
      }, {});

      // Enrich invoices with related data
      let enrichedInvoices = (invoices || []).map((invoice: any) => ({
        ...invoice,
        profiles: teacherMap[invoice.teacher_id],
        campus: campusMap[invoice.campus_id],
        lines: invoiceLinesMap[invoice.id] || []
      }));

      // Filter out invoices with no lines if filiere filter is applied
      if (selectedFiliere !== 'all') {
        enrichedInvoices = enrichedInvoices.filter(invoice => invoice.lines.length > 0);
      }

      // Process data for analytics
      const processedAnalytics: AnalyticsData = {
        invoices_by_month: processInvoicesByMonth(enrichedInvoices),
        invoices_by_status: processInvoicesByStatus(enrichedInvoices),
        invoices_by_year: processInvoicesByYear(enrichedInvoices),
        payments_trend: await processPaymentsTrend(),
        top_teachers: processTopTeachers(enrichedInvoices),
        campus_performance: processCampusPerformance(enrichedInvoices),
        filiere_performance: processFilierePerformance(enrichedInvoices, filiereMap),
        kpis: calculateKPIs(enrichedInvoices)
      };

      setAnalytics(processedAnalytics);
    } catch (error) {
      console.error('Erreur lors du chargement des analytics:', error);
      toast.error('Erreur lors du chargement des analyses');
    } finally {
      setLoading(false);
    }
  };

  const processInvoicesByMonth = (invoices: any[]) => {
    const monthlyData = new Map();
    
    invoices.forEach(invoice => {
      const month = format(new Date(invoice.created_at), 'MMM yyyy', { locale: fr });
      const totalHours = invoice.lines.reduce((sum: number, line: any) => sum + (line.hours_qty || 0), 0);
      
      if (!monthlyData.has(month)) {
        monthlyData.set(month, { count: 0, total_amount: 0, total_hours: 0 });
      }
      const current = monthlyData.get(month);
      monthlyData.set(month, {
        count: current.count + 1,
        total_amount: current.total_amount + (invoice.total_ttc || 0),
        total_hours: current.total_hours + totalHours
      });
    });

    return Array.from(monthlyData.entries()).map(([month, data]) => ({
      month,
      count: data.count,
      total_amount: data.total_amount,
      total_hours: data.total_hours
    }));
  };

  const processInvoicesByYear = (invoices: any[]) => {
    const yearlyData = new Map();
    
    invoices.forEach(invoice => {
      const year = invoice.year;
      const totalHours = invoice.lines.reduce((sum: number, line: any) => sum + (line.hours_qty || 0), 0);
      
      if (!yearlyData.has(year)) {
        yearlyData.set(year, { count: 0, total_amount: 0, total_hours: 0 });
      }
      const current = yearlyData.get(year);
      yearlyData.set(year, {
        count: current.count + 1,
        total_amount: current.total_amount + (invoice.total_ttc || 0),
        total_hours: current.total_hours + totalHours
      });
    });

    return Array.from(yearlyData.entries()).map(([year, data]) => ({
      year,
      count: data.count,
      total_amount: data.total_amount,
      avg_hours: data.count > 0 ? data.total_hours / data.count : 0
    }));
  };

  const processInvoicesByStatus = (invoices: any[]) => {
    const statusCounts = new Map();
    const total = invoices.length;

    invoices.forEach(invoice => {
      const status = invoice.status;
      statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
    });

    return Array.from(statusCounts.entries()).map(([status, count]) => ({
      status: getStatusLabel(status),
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0
    }));
  };

  const processPaymentsTrend = async () => {
    try {
      const { data: payments } = await supabase
        .from('payment')
        .select('amount_ttc, paid_at')
        .gte('paid_at', dateRange.start)
        .lte('paid_at', dateRange.end);

      const monthlyPayments = new Map();
      
      (payments || []).forEach(payment => {
        const month = format(new Date(payment.paid_at), 'MMM yyyy', { locale: fr });
        if (!monthlyPayments.has(month)) {
          monthlyPayments.set(month, 0);
        }
        monthlyPayments.set(month, monthlyPayments.get(month) + payment.amount_ttc);
      });

      return Array.from(monthlyPayments.entries()).map(([month, amount]) => ({
        month,
        amount
      }));
    } catch (error) {
      console.error('Erreur lors du traitement des paiements:', error);
      return [];
    }
  };

  const processTopTeachers = (invoices: any[]) => {
    const teacherStats = new Map();

    invoices.forEach(invoice => {
      if (!invoice.profiles) return;
      
      const teacherName = `${invoice.profiles.first_name} ${invoice.profiles.last_name}`;
      const totalHours = invoice.lines.reduce((sum: number, line: any) => sum + (line.hours_qty || 0), 0);
      
      if (!teacherStats.has(teacherName)) {
        teacherStats.set(teacherName, { 
          invoices_count: 0, 
          total_amount: 0, 
          total_hours: 0 
        });
      }
      
      const current = teacherStats.get(teacherName);
      teacherStats.set(teacherName, {
        invoices_count: current.invoices_count + 1,
        total_amount: current.total_amount + (invoice.total_ttc || 0),
        total_hours: current.total_hours + totalHours
      });
    });

    return Array.from(teacherStats.entries())
      .map(([name, stats]) => ({
        name,
        invoices_count: stats.invoices_count,
        total_amount: stats.total_amount,
        total_hours: stats.total_hours,
        hourly_rate: stats.total_hours > 0 ? stats.total_amount / stats.total_hours : 0
      }))
      .sort((a, b) => b.total_amount - a.total_amount)
      .slice(0, 10);
  };

  const processCampusPerformance = (invoices: any[]) => {
    const campusStats = new Map();

    invoices.forEach(invoice => {
      if (!invoice.campus) return;
      
      const campusName = invoice.campus.name;
      const totalHours = invoice.lines.reduce((sum: number, line: any) => sum + (line.hours_qty || 0), 0);
      
      if (!campusStats.has(campusName)) {
        campusStats.set(campusName, { 
          invoices_count: 0, 
          total_amount: 0, 
          total_hours: 0,
          teachers: new Set() 
        });
      }
      
      const current = campusStats.get(campusName);
      current.invoices_count += 1;
      current.total_amount += invoice.total_ttc || 0;
      current.total_hours += totalHours;
      if (invoice.teacher_id) {
        current.teachers.add(invoice.teacher_id);
      }
    });

    return Array.from(campusStats.entries()).map(([campus_name, stats]) => ({
      campus_name,
      invoices_count: stats.invoices_count,
      teachers_count: stats.teachers.size,
      avg_amount: stats.invoices_count > 0 ? stats.total_amount / stats.invoices_count : 0,
      total_hours: stats.total_hours,
      avg_hourly_rate: stats.total_hours > 0 ? stats.total_amount / stats.total_hours : 0
    }));
  };

  const processFilierePerformance = (invoices: any[], filiereMap: Record<string, any>) => {
    const filiereStats = new Map();

    invoices.forEach(invoice => {
      invoice.lines.forEach((line: any) => {
        const filiere = filiereMap[line.filiere_id];
        if (!filiere) return;
        
        const filiereKey = filiere.label;
        const lineAmount = (line.hours_qty || 0) * (line.unit_price || 0);
        
        if (!filiereStats.has(filiereKey)) {
          filiereStats.set(filiereKey, {
            pole: filiere.pole,
            invoices_count: 0,
            total_amount: 0,
            total_hours: 0,
            invoices: new Set()
          });
        }
        
        const current = filiereStats.get(filiereKey);
        current.invoices.add(invoice.id);
        current.total_amount += lineAmount;
        current.total_hours += line.hours_qty || 0;
      });
    });

    return Array.from(filiereStats.entries()).map(([filiere_name, stats]) => ({
      filiere_name,
      pole: stats.pole,
      invoices_count: stats.invoices.size,
      total_amount: stats.total_amount,
      total_hours: stats.total_hours,
      avg_hourly_rate: stats.total_hours > 0 ? stats.total_amount / stats.total_hours : 0
    }));
  };

  const calculateKPIs = (invoices: any[]) => {
    const totalInvoices = invoices.length;
    const totalAmount = invoices.reduce((sum, inv) => sum + (inv.total_ttc || 0), 0);
    const totalHours = invoices.reduce((sum, inv) => 
      sum + inv.lines.reduce((lineSum: number, line: any) => lineSum + (line.hours_qty || 0), 0), 0
    );
    const completionRate = invoices.filter(inv => inv.status === 'paid').length / Math.max(totalInvoices, 1) * 100;
    
    return {
      total_invoices: totalInvoices,
      total_amount: totalAmount,
      total_hours: totalHours,
      avg_hourly_rate: totalHours > 0 ? totalAmount / totalHours : 0,
      completion_rate: completionRate,
      monthly_growth: 0 // Placeholder - would need historical comparison
    };
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'En attente',
      prevalidated: 'Pré-validée',
      validated: 'Validée',
      rejected: 'Rejetée',
      paid: 'Payée'
    };
    return labels[status] || status;
  };

  const exportData = async () => {
    try {
      const csvContent = generateCSVReport();
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      toast.success('Rapport exporté avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      toast.error('Erreur lors de l\'export');
    }
  };

  const generateCSVReport = () => {
    if (!analytics) return '';
    
    let csv = 'Type,Période,Valeur,Détails\n';
    
    // Add KPIs
    csv += `KPI,Total Factures,${analytics.kpis.total_invoices},-\n`;
    csv += `KPI,CA Total,${analytics.kpis.total_amount}€,-\n`;
    csv += `KPI,Heures Totales,${analytics.kpis.total_hours}h,-\n`;
    csv += `KPI,Taux Horaire Moyen,${analytics.kpis.avg_hourly_rate.toFixed(2)}€/h,-\n`;
    
    // Add campus performance
    analytics.campus_performance.forEach(campus => {
      csv += `Campus,${campus.campus_name},${campus.total_hours}h,${campus.avg_hourly_rate.toFixed(2)}€/h\n`;
    });
    
    return csv;
  };

  if (profile?.role !== 'SUPER_ADMIN' && profile?.role !== 'COMPTABLE') {
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

  return (
    <div className="container-brutal py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Analytics Avancées</h1>
        <p className="text-muted-foreground">
          Analyses détaillées des performances et tendances
        </p>
      </div>

      {/* Filters */}
      <BrutalCard className="mb-6">
        <BrutalCardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-end">
            <div>
              <label className="text-sm font-medium mb-2 block">Période</label>
              <div className="flex gap-2 w-full min-w-0">
                <BrutalInput
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="flex-1 min-w-0"
                />
                <BrutalInput
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="flex-1 min-w-0"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Campus</label>
              <Select value={selectedCampus} onValueChange={setSelectedCampus}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous les campus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les campus</SelectItem>
                  {campuses.map((campus) => (
                    <SelectItem key={campus.id} value={campus.id}>
                      {campus.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Année</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Toutes les années" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les années</SelectItem>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Filière</label>
              <Select value={selectedFiliere} onValueChange={setSelectedFiliere}>
                <SelectTrigger>
                  <SelectValue placeholder="Toutes les filières" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les filières</SelectItem>
                  {filieres.map((filiere) => (
                    <SelectItem key={filiere.id} value={filiere.id}>
                      {filiere.label} ({filiere.pole})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 col-span-1 sm:col-span-2 lg:col-span-1">
              <BrutalButton 
                onClick={fetchAnalytics}
                disabled={loading}
                variant="outline"
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualiser
              </BrutalButton>
              
              <BrutalButton 
                onClick={exportData} 
                disabled={loading}
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </BrutalButton>
            </div>
          </div>
        </BrutalCardContent>
      </BrutalCard>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-aurlom mx-auto"></div>
          <p className="mt-2">Chargement des analyses...</p>
        </div>
      ) : !analytics ? (
        <div className="text-center py-8">
          <p>Aucune donnée disponible pour la période sélectionnée</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPIs Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <BrutalCard>
              <BrutalCardContent className="p-4 text-center">
                <FileText className="h-6 w-6 lg:h-8 lg:w-8 mx-auto mb-2 text-brand-aurlom" />
                <p className="text-lg lg:text-2xl font-bold">{analytics.kpis.total_invoices}</p>
                <p className="text-xs text-muted-foreground">Factures</p>
              </BrutalCardContent>
            </BrutalCard>
            
            <BrutalCard>
              <BrutalCardContent className="p-4 text-center">
                <DollarSign className="h-6 w-6 lg:h-8 lg:w-8 mx-auto mb-2 text-brand-success" />
                <p className="text-lg lg:text-2xl font-bold">{analytics.kpis.total_amount.toLocaleString('fr-FR')}€</p>
                <p className="text-xs text-muted-foreground">CA Total</p>
              </BrutalCardContent>
            </BrutalCard>
            
            <BrutalCard>
              <BrutalCardContent className="p-4 text-center">
                <Clock className="h-6 w-6 lg:h-8 lg:w-8 mx-auto mb-2 text-brand-education" />
                <p className="text-lg lg:text-2xl font-bold">{analytics.kpis.total_hours.toFixed(0)}h</p>
                <p className="text-xs text-muted-foreground">Heures Total</p>
              </BrutalCardContent>
            </BrutalCard>
            
            <BrutalCard>
              <BrutalCardContent className="p-4 text-center">
                <TrendingUp className="h-6 w-6 lg:h-8 lg:w-8 mx-auto mb-2 text-brand-warning" />
                <p className="text-lg lg:text-2xl font-bold">{analytics.kpis.avg_hourly_rate.toFixed(0)}€/h</p>
                <p className="text-xs text-muted-foreground">Taux Horaire</p>
              </BrutalCardContent>
            </BrutalCard>
            
            <BrutalCard>
              <BrutalCardContent className="p-4 text-center">
                <Users className="h-6 w-6 lg:h-8 lg:w-8 mx-auto mb-2 text-brand-business" />
                <p className="text-lg lg:text-2xl font-bold">{analytics.kpis.completion_rate.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">Taux Paiement</p>
              </BrutalCardContent>
            </BrutalCard>
            
            <BrutalCard>
              <BrutalCardContent className="p-4 text-center">
                <Building className="h-6 w-6 lg:h-8 lg:w-8 mx-auto mb-2 text-brand-tech" />
                <p className="text-lg lg:text-2xl font-bold">{analytics.campus_performance.length}</p>
                <p className="text-xs text-muted-foreground">Campus Actifs</p>
              </BrutalCardContent>
            </BrutalCard>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
            {/* Évolution Mensuelle */}
            <BrutalCard>
              <BrutalCardHeader>
                <BrutalCardTitle>Évolution Mensuelle (Heures & CA)</BrutalCardTitle>
              </BrutalCardHeader>
              <BrutalCardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={analytics.invoices_by_month}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Bar yAxisId="left" dataKey="total_hours" fill="#0088FE" name="Heures" />
                    <Bar yAxisId="right" dataKey="total_amount" fill="#00C49F" name="CA (€)" />
                  </BarChart>
                </ResponsiveContainer>
              </BrutalCardContent>
            </BrutalCard>

            {/* Performance par Année */}
            <BrutalCard>
              <BrutalCardHeader>
                <BrutalCardTitle>Performance par Année</BrutalCardTitle>
              </BrutalCardHeader>
              <BrutalCardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={analytics.invoices_by_year}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="total_amount" stroke="#FF8042" strokeWidth={2} name="CA (€)" />
                    <Line type="monotone" dataKey="avg_hours" stroke="#8884D8" strokeWidth={2} name="Heures Moy." />
                  </LineChart>
                </ResponsiveContainer>
              </BrutalCardContent>
            </BrutalCard>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
            {/* Performance Campus */}
            <BrutalCard>
              <BrutalCardHeader>
                <BrutalCardTitle>Performance par Campus</BrutalCardTitle>
              </BrutalCardHeader>
              <BrutalCardContent>
                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2">
                  {analytics.campus_performance.map((campus, index) => (
                    <div key={campus.campus_name} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{campus.teachers_count} prof(s)</Badge>
                        <div>
                          <p className="font-medium">{campus.campus_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {campus.total_hours.toFixed(0)}h • {campus.avg_hourly_rate.toFixed(0)}€/h
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">
                          {campus.invoices_count} factures
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </BrutalCardContent>
            </BrutalCard>

            {/* Performance Filières */}
            <BrutalCard>
              <BrutalCardHeader>
                <BrutalCardTitle>Performance par Filière</BrutalCardTitle>
              </BrutalCardHeader>
              <BrutalCardContent>
                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2">
                  {analytics.filiere_performance.slice(0, 8).map((filiere, index) => (
                    <div key={filiere.filiere_name} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">{filiere.filiere_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {filiere.pole} • {filiere.total_hours.toFixed(0)}h
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{filiere.avg_hourly_rate.toFixed(0)}€/h</p>
                        <p className="text-sm text-muted-foreground">
                          {filiere.total_amount.toFixed(0)}€
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </BrutalCardContent>
            </BrutalCard>
          </div>

          {/* Top Teachers with Enhanced Stats */}
          <BrutalCard>
            <BrutalCardHeader>
              <BrutalCardTitle>Top Enseignants (Performance Détaillée)</BrutalCardTitle>
            </BrutalCardHeader>
            <BrutalCardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {analytics.top_teachers.slice(0, 6).map((teacher, index) => (
                  <div key={teacher.name} className="p-4 border-2 border-border-light rounded-lg space-y-3">
                    <div className="flex items-center gap-3 mb-3">
                      <Badge variant={index < 3 ? "default" : "outline"}>#{index + 1}</Badge>
                      <p className="font-medium">{teacher.name}</p>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>CA Total:</span>
                        <span className="font-bold">{teacher.total_amount.toFixed(0)}€</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Heures:</span>
                        <span>{teacher.total_hours.toFixed(0)}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Taux horaire:</span>
                        <span className="font-bold text-green-600">
                          {teacher.hourly_rate.toFixed(0)}€/h
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Factures:</span>
                        <span>{teacher.invoices_count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </BrutalCardContent>
          </BrutalCard>
        </div>
      )}
    </div>
  );
}