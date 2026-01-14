import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrutalCard, BrutalCardContent, BrutalCardHeader, BrutalCardTitle } from '@/components/ui/brutal-card';
import { BrutalButton } from '@/components/ui/brutal-button';
import { BrutalInput } from '@/components/ui/brutal-input';
import { StatusBadge } from '@/components/ui/status-badge';
import { CatLoader } from '@/components/ui/cat-loader';
import { DataPagination } from '@/components/ui/data-pagination';
import { usePagination } from '@/hooks/usePagination';
import { PDFGenerator } from '@/components/invoice/PDFGenerator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { MonthYearSelector } from '@/components/invoice/MonthYearSelector';
import { getMonthName } from '@/utils/dateUtils';
import { 
  FileText, 
  Search,
  Calendar,
  Building,
  User,
  Eye,
  CheckCircle,
  XCircle,
  Download,
  Filter,
  ExternalLink,
  MapPin,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

interface Invoice {
  id: string;
  month: number;
  year: number;
  status: string;
  total_ttc: number;
  drive_pdf_url?: string;
  created_at: string;
  teacher: {
    first_name: string;
    last_name: string;
    email: string;
  };
  campus: {
    name: string;
    address?: string;
  };
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  teacher_profile?: {
    rib_iban?: string;
    rib_bic?: string;
    rib_account_holder?: string;
    rib_bank_name?: string;
  };
  invoice_line?: Array<{
    date: string;
    course_title: string;
    start_time: string;
    end_time: string;
    hours_qty: number;
    unit_price: number;
    validation_status?: string;
    campus_id?: string;
  }>;
  campus_lines_count?: number;
  campus_total_hours?: number;
  campus_prevalidated_lines?: number;
  campus_pending_lines?: number;
  all_campus_lines_prevalidated?: boolean;
}

export default function InvoicesManagement() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [campusFilter, setCampusFilter] = useState<string>('all');
  const [campuses, setCampuses] = useState<any[]>([]);
  
  // Filtrage par mois/année (par défaut le mois actuel)
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  useEffect(() => {
    if (profile && ['SUPER_ADMIN', 'COMPTABLE', 'DIRECTEUR_CAMPUS'].includes(profile.role)) {
      fetchInvoices();
      fetchCampuses();
    }
  }, [profile, selectedMonth, selectedYear]);

  // Reset to page 1 when filters change
  useEffect(() => {
    goToPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, statusFilter, campusFilter, selectedMonth, selectedYear]);

  const fetchInvoices = async () => {
    try {
      // Requête avec filtre mois/année
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoice')
        .select(`
          id,
          month,
          year,
          status,
          total_ttc,
          drive_pdf_url,
          created_at,
          teacher_id,
          campus_id
        `)
        .eq('month', selectedMonth)
        .eq('year', selectedYear)
        .order('created_at', { ascending: false });

      if (invoicesError) throw invoicesError;

      // Charger les profils des enseignants et les campus pour mapper localement
      const { data: teachersData, error: teachersError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email');

      if (teachersError) throw teachersError;

      const { data: campusData, error: campusError } = await supabase
        .from('campus')
        .select('id, name, address');

      if (campusError) throw campusError;

      // Récupérer les infos bancaires des enseignants
      const { data: teacherProfilesData } = await supabase
        .from('teacher_profile')
        .select('user_id, rib_iban, rib_bic, rib_account_holder, rib_bank_name');

      // Créer des maps pour un accès rapide
      const teacherMap = (teachersData || []).reduce((acc: Record<string, any>, t: any) => {
        acc[t.user_id] = t;
        return acc;
      }, {} as Record<string, any>);

      const campusMap = (campusData || []).reduce((acc: Record<string, any>, c: any) => {
        acc[c.id] = c;
        return acc;
      }, {} as Record<string, any>);

      const teacherProfileMap = (teacherProfilesData || []).reduce((acc: Record<string, any>, tp: any) => {
        acc[tp.user_id] = tp;
        return acc;
      }, {} as Record<string, any>);

      // Enrichir chaque facture avec ses lignes
      const transformedData = await Promise.all(
        (invoicesData || []).map(async (item: any) => {
          const { data: invoiceLines } = await supabase
            .from('invoice_line')
            .select('date, course_title, start_time, end_time, hours_qty, unit_price, validation_status, campus_id')
            .eq('invoice_id', item.id);

          // Calculer les stats pour le campus du directeur (si applicable)
          let campusLines: any[] = [];
          let campusLinesCount = 0;
          let campusTotalHours = 0;
          let campusPrevalidatedLines = 0;
          let campusPendingLines = 0;
          let allCampusLinesPrevalidated = false;

          if (profile?.role === 'DIRECTEUR_CAMPUS' && profile.campus_id) {
            campusLines = (invoiceLines || []).filter(line => line.campus_id === profile.campus_id);
            campusLinesCount = campusLines.length;
            campusTotalHours = campusLines.reduce((sum, line) => sum + parseFloat(line.hours_qty?.toString() || '0'), 0);
            campusPrevalidatedLines = campusLines.filter(line => line.validation_status === 'prevalidated').length;
            campusPendingLines = campusLines.filter(line => line.validation_status === 'pending').length;
            allCampusLinesPrevalidated = campusPendingLines === 0 && campusLinesCount > 0;
          }

          return {
            id: item.id,
            month: item.month,
            year: item.year,
            status: item.status,
            total_ttc: item.total_ttc,
            drive_pdf_url: item.drive_pdf_url,
            created_at: item.created_at,
            teacher: {
              first_name: teacherMap[item.teacher_id]?.first_name || '',
              last_name: teacherMap[item.teacher_id]?.last_name || '',
              email: teacherMap[item.teacher_id]?.email || ''
            },
            campus: {
              name: campusMap[item.campus_id]?.name || '',
              address: campusMap[item.campus_id]?.address || ''
            },
            profiles: teacherMap[item.teacher_id],
            teacher_profile: teacherProfileMap[item.teacher_id],
            invoice_line: invoiceLines || [],
            campus_lines_count: campusLinesCount,
            campus_total_hours: campusTotalHours,
            campus_prevalidated_lines: campusPrevalidatedLines,
            campus_pending_lines: campusPendingLines,
            all_campus_lines_prevalidated: allCampusLinesPrevalidated
          };
        })
      );

      setInvoices(transformedData);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Erreur lors du chargement des factures');
    } finally {
      setLoading(false);
    }
  };

  const fetchCampuses = async () => {
    try {
      const { data, error } = await supabase
        .from('campus')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCampuses(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des campus:', error);
    }
  };

  const handleValidateInvoice = async (invoiceId: string, newStatus: 'pending' | 'prevalidated' | 'validated' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('invoice')
        .update({ status: newStatus })
        .eq('id', invoiceId);

      if (error) throw error;

      // Enregistrer dans le log de validation
      await supabase
        .from('validation_log')
        .insert({
          invoice_id: invoiceId,
          actor_id: profile?.user_id,
          role: profile?.role as any,
          action: newStatus,
          new_status: newStatus
        });

      toast.success('Facture mise à jour');
      fetchInvoices();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la validation');
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.teacher?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.teacher?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.teacher?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.campus?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    const matchesCampus = campusFilter === 'all' || invoice.campus?.name === campusFilter;
    
    return matchesSearch && matchesStatus && matchesCampus;
  });

  const {
    currentPage,
    totalPages,
    paginatedData: paginatedInvoices,
    goToPage
  } = usePagination({
    data: filteredInvoices,
    itemsPerPage: 15,
    initialPage: 1
  });

  const handleBulkPrevalidation = async (invoiceId: string) => {
    try {
      const { data, error } = await supabase.rpc('bulk_prevalidate_invoice_lines', {
        invoice_id_param: invoiceId,
        director_user_id: profile?.user_id
      });

      if (error) throw error;

      const result = data as { success: boolean; lines_processed?: number; lines_total?: number; error?: string };

      if (result.success) {
        toast.success(`${result.lines_processed} lignes prévalidées sur ${result.lines_total}`);
        fetchInvoices();
      } else {
        toast.error(result.error || 'Erreur lors de la prévalidation');
      }
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la prévalidation en masse');
    }
  };

  const handleExportValidatedInvoices = async () => {
    try {
      const { data: validatedInvoices, error } = await supabase
        .from('invoice')
        .select(`
          id,
          month,
          year,
          status,
          total_ttc,
          created_at,
          teacher_id,
          campus_id
        `)
        .in('status', ['validated', 'paid'])
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (error) throw error;

      // Get detailed info for each invoice
      const exportData = await Promise.all(
        (validatedInvoices || []).map(async (invoice) => {
          // Get teacher profile
          const { data: teacherProfile } = await supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('user_id', invoice.teacher_id)
            .single();

          // Get teacher banking info
          const { data: teacherBanking } = await supabase
            .from('teacher_profile')
            .select('rib_account_holder, rib_bank_name, rib_iban, rib_bic')
            .eq('user_id', invoice.teacher_id)
            .single();

          // Get campus info
          const { data: campus } = await supabase
            .from('campus')
            .select('name')
            .eq('id', invoice.campus_id)
            .single();

          // Get validation logs
          const { data: validationLogs } = await supabase
            .from('validation_log')
            .select(`
              action,
              created_at,
              actor_id,
              role,
              comment,
              previous_status,
              new_status
            `)
            .eq('invoice_id', invoice.id)
            .order('created_at', { ascending: true });

          // Get actor names for validation logs
          const actorIds = validationLogs?.map(log => log.actor_id).filter(Boolean) || [];
          const { data: actors } = await supabase
            .from('profiles')
            .select('user_id, first_name, last_name')
            .in('user_id', actorIds);

          const actorMap = actors?.reduce((acc, actor) => {
            acc[actor.user_id] = `${actor.first_name} ${actor.last_name}`;
            return acc;
          }, {} as Record<string, string>) || {};

          return {
            'ID Facture': invoice.id,
            'Période': `${invoice.month}/${invoice.year}`,
            'Statut': invoice.status,
            'Montant': invoice.total_ttc,
            'Date Création': new Date(invoice.created_at).toLocaleDateString('fr-FR'),
            'Enseignant': `${teacherProfile?.first_name || ''} ${teacherProfile?.last_name || ''}`.trim(),
            'Email Enseignant': teacherProfile?.email || '',
            'Campus': campus?.name || '',
            'Titulaire RIB': teacherBanking?.rib_account_holder || '',
            'Banque': teacherBanking?.rib_bank_name || '',
            'IBAN': teacherBanking?.rib_iban || '',
            'BIC': teacherBanking?.rib_bic || '',
            'Historique Validation': validationLogs?.map(log => 
              `${log.action} par ${actorMap[log.actor_id] || 'Inconnu'} (${log.role}) le ${new Date(log.created_at).toLocaleDateString('fr-FR')}${log.comment ? ` - ${log.comment}` : ''}`
            ).join(' | ') || ''
          };
        })
      );

      // Convert to CSV
      if (exportData.length === 0) {
        toast.error('Aucune facture validée à exporter');
        return;
      }

      const headers = Object.keys(exportData[0]);
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => 
          headers.map(header => {
            const value = row[header as keyof typeof row];
            return `"${String(value || '').replace(/"/g, '""')}"`;
          }).join(',')
        )
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `factures_validees_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Export réalisé : ${exportData.length} factures`);
    } catch (error: any) {
      console.error('Erreur lors de l\'export:', error);
      toast.error('Erreur lors de l\'export');
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette facture ? Cette action est irréversible.')) {
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('delete-invoice', {
        body: { invoiceId }
      });

      if (error) {
        throw error;
      }

      toast.success('Facture supprimée avec succès');
      fetchInvoices(); // Recharger la liste
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression de la facture');
    }
  };

  const getActionButtons = (invoice: Invoice) => {
    const buttons = [];
    
    // Directeur campus - Prévalidation
    if (profile?.role === 'DIRECTEUR_CAMPUS' && invoice.status === 'pending') {
      buttons.push(
        <BrutalButton
          key="prevalidate"
          size="sm"
          variant={invoice.all_campus_lines_prevalidated ? "outline" : "success"}
          onClick={() => handleBulkPrevalidation(invoice.id)}
          disabled={invoice.all_campus_lines_prevalidated || (invoice.campus_pending_lines || 0) === 0}
        >
          <CheckCircle className="h-4 w-4 mr-1" />
          {invoice.all_campus_lines_prevalidated ? 'Déjà prévalidé' : 'Prévalider'}
        </BrutalButton>
      );
    }
    
    // Comptable - Validation et paiement
    if (profile?.role === 'COMPTABLE' || profile?.role === 'SUPER_ADMIN') {
      if (invoice.status === 'prevalidated') {
        buttons.push(
          <BrutalButton
            key="validate"
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white border-2 border-foreground"
            onClick={() => handleValidateInvoice(invoice.id, 'validated')}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Valider
          </BrutalButton>
        );
      }
    }
    
    // Super Admin - Suppression 
    if (profile?.role === 'SUPER_ADMIN') {
      buttons.push(
        <BrutalButton
          key="delete"
          size="sm"
          variant="destructive"
          onClick={() => handleDeleteInvoice(invoice.id)}
          className="p-2"
        >
          <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
        </BrutalButton>
      );
    }
    
    return buttons;
  };

  if (!profile || !['SUPER_ADMIN', 'COMPTABLE', 'DIRECTEUR_CAMPUS'].includes(profile.role)) {
    return (
      <div className="container-brutal py-4 md:py-8">
        <BrutalCard>
          <BrutalCardContent className="text-center py-8">
            <p className="text-muted-foreground">
              Accès non autorisé
            </p>
          </BrutalCardContent>
        </BrutalCard>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container-brutal py-4 md:py-8">
        <div className="flex items-center justify-center h-64">
          <CatLoader message="Chargement des factures..." size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="container-brutal py-4 md:py-8">
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold">Gestion des Factures</h1>
            <p className="text-sm md:text-lg text-muted-foreground mt-1 md:mt-2">
              {profile.role === 'DIRECTEUR_CAMPUS' ? 'Prévalidation des factures de votre campus' : 'Validation et gestion des factures'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:space-x-4">
            <BrutalButton variant="outline" onClick={handleExportValidatedInvoices} className="text-sm">
              <Download className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Export Factures Validées</span>
              <span className="sm:hidden">Export</span>
            </BrutalButton>
          </div>
        </div>

        {/* Campus restriction notice for directors */}
        {profile?.role === 'DIRECTEUR_CAMPUS' && (
          <div className="bg-brand-aurlom-light border-2 border-brand-aurlom rounded-lg p-3 md:p-4">
            <div className="flex items-start">
              <MapPin className="h-4 w-4 md:h-5 md:w-5 text-brand-aurlom mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-brand-aurlom text-sm md:text-base">Accès Restreint par Campus</h4>
                <p className="text-xs md:text-sm text-brand-aurlom mt-1">
                  Vous voyez toutes les factures contenant des lignes de cours de votre campus. 
                  Vous pouvez prévalider uniquement les lignes de votre campus.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Statistiques */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
          {['pending', 'prevalidated', 'validated', 'paid', 'rejected'].map(status => {
            const count = invoices.filter(inv => inv.status === status).length;
            
            return (
              <BrutalCard key={status}>
                <BrutalCardContent className="p-2 md:p-4 text-center">
                  <p className="text-lg md:text-2xl font-bold mb-1">{count}</p>
                  <StatusBadge status={status} size="sm" />
                </BrutalCardContent>
              </BrutalCard>
            );
          })}
        </div>

        {/* Sélection de période */}
        <BrutalCard>
          <BrutalCardHeader>
            <BrutalCardTitle className="text-sm md:text-base">Période de consultation</BrutalCardTitle>
          </BrutalCardHeader>
          <BrutalCardContent>
            <MonthYearSelector
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              onMonthChange={setSelectedMonth}
              onYearChange={setSelectedYear}
            />
          </BrutalCardContent>
        </BrutalCard>

        {/* Filtres */}
        <BrutalCard>
          <BrutalCardContent className="p-3 md:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <BrutalInput
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 text-sm"
                />
              </div>

              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-brutal text-sm"
              >
                <option value="all">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="prevalidated">Prévalidées</option>
                <option value="validated">Validées</option>
                <option value="paid">Payées</option>
                <option value="rejected">Rejetées</option>
              </select>

              <select 
                value={campusFilter} 
                onChange={(e) => setCampusFilter(e.target.value)}
                className="input-brutal text-sm"
              >
                <option value="all">Tous les campus</option>
                {campuses.map(campus => (
                  <option key={campus.id} value={campus.name}>{campus.name}</option>
                ))}
              </select>

              <div className="text-xs md:text-sm text-muted-foreground flex items-center justify-center sm:justify-start">
                <Filter className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                {filteredInvoices.length} facture{filteredInvoices.length > 1 ? 's' : ''}
              </div>
            </div>
          </BrutalCardContent>
        </BrutalCard>

        {/* Liste des factures */}
        <BrutalCard>
          <BrutalCardHeader>
            <BrutalCardTitle className="text-sm md:text-base">Factures ({filteredInvoices.length})</BrutalCardTitle>
          </BrutalCardHeader>
          <BrutalCardContent>
            <div className="space-y-3 md:space-y-4">
              {paginatedInvoices.map((invoice) => (
                <div key={invoice.id} className="flex flex-col lg:flex-row lg:items-center lg:justify-between p-3 md:p-4 border-2 border-border-light rounded-lg hover:bg-muted/50 transition-colors space-y-3 lg:space-y-0">
                  {/* Main content */}
                  <div className="flex items-start space-x-3 md:space-x-4">
                    <div className="p-2 md:p-3 bg-brand-aurlom text-white border-2 border-foreground rounded-lg flex-shrink-0">
                      <FileText className="h-4 w-4 md:h-5 md:w-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                        <h3 className="font-medium text-sm md:text-base truncate">
                          {invoice.teacher?.first_name} {invoice.teacher?.last_name}
                        </h3>
                        <StatusBadge status={invoice.status} size="sm" />
                      </div>
                      
                      {/* Desktop info */}
                      <div className="hidden md:flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {getMonthName(invoice.month)} {invoice.year}
                        </div>
                        
                        <div className="flex items-center">
                          <Building className="h-4 w-4 mr-1" />
                          {invoice.campus?.name}
                        </div>
                        
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          {invoice.teacher?.email}
                        </div>
                      </div>
                      
                      {/* Mobile info */}
                      <div className="md:hidden space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {getMonthName(invoice.month)} {invoice.year}
                        </div>
                        <div className="flex items-center">
                          <Building className="h-3 w-3 mr-1" />
                          {invoice.campus?.name}
                        </div>
                        <div className="flex items-center truncate">
                          <User className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span className="truncate">{invoice.teacher?.email}</span>
                        </div>
                      </div>
                      
                      {/* Détails pour directeurs campus */}
                      {profile?.role === 'DIRECTEUR_CAMPUS' && invoice.campus_lines_count !== undefined && (
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-2">
                          <span>📄 {invoice.campus_lines_count} lignes</span>
                          <span>⏱️ {Math.round((invoice.campus_total_hours || 0) * 100) / 100}h</span>
                          <span className="hidden sm:inline">📅 {new Date(invoice.created_at).toLocaleDateString('fr-FR')}</span>
                        </div>
                      )}
                      
                      {/* Statut prévalidation pour directeurs campus */}
                      {profile?.role === 'DIRECTEUR_CAMPUS' && invoice.campus_lines_count !== undefined && invoice.campus_lines_count > 0 && (
                        <div className="flex items-center space-x-2 mt-2 text-xs">
                          <span className={`px-2 py-0.5 rounded text-xs ${
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
                  
                  {/* Amount and actions */}
                  <div className="flex items-center justify-between lg:justify-end lg:space-x-4">
                    <div className="text-right">
                      <p className="text-base md:text-lg font-bold font-mono">
                        {parseFloat(invoice.total_ttc.toString()).toLocaleString('fr-FR')} €
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-1 md:space-x-2 flex-wrap">
                      {invoice.drive_pdf_url && (
                        <BrutalButton
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(invoice.drive_pdf_url, '_blank')}
                          className="p-2"
                        >
                          <ExternalLink className="h-3 w-3 md:h-4 md:w-4" />
                        </BrutalButton>
                      )}
                      
                      <PDFGenerator 
                        invoice={{
                          id: invoice.id,
                          month: invoice.month,
                          year: invoice.year,
                          total_ttc: invoice.total_ttc,
                         status: invoice.status,
                         created_at: invoice.created_at,
                         teacher_profile: {
                           first_name: invoice.profiles?.first_name || invoice.teacher.first_name,
                           last_name: invoice.profiles?.last_name || invoice.teacher.last_name,
                           email: invoice.profiles?.email || invoice.teacher.email,
                           rib_iban: invoice.teacher_profile?.rib_iban,
                           rib_bic: invoice.teacher_profile?.rib_bic,
                           rib_account_holder: invoice.teacher_profile?.rib_account_holder,
                           rib_bank_name: invoice.teacher_profile?.rib_bank_name
                         },
                         campus: {
                           name: invoice.campus.name,
                           address: invoice.campus.address || 'Adresse non renseignée'
                         },
                         invoice_lines: invoice.invoice_line || []
                        }} 
                     />
                      
                      <BrutalButton 
                        size="sm" 
                        variant="outline"
                        onClick={() => navigate(`/admin/invoices/${invoice.id}`)}
                        className="p-2"
                      >
                        <Eye className="h-3 w-3 md:h-4 md:w-4" />
                      </BrutalButton>
                      
                      {getActionButtons(invoice).map(button => button)}
                    </div>
                  </div>
                </div>
              ))}
              
              {paginatedInvoices.length === 0 && filteredInvoices.length === 0 && (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Aucune facture trouvée</h3>
                  <p className="text-muted-foreground">
                    Aucune facture ne correspond aux critères de recherche.
                  </p>
                </div>
              )}
            </div>
            
            <DataPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={goToPage}
              totalItems={filteredInvoices.length}
              itemsPerPage={15}
              itemName="factures"
            />
          </BrutalCardContent>
        </BrutalCard>
      </div>
    </div>
  );
}