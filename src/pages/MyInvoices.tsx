import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { BrutalCard, BrutalCardContent, BrutalCardHeader, BrutalCardTitle } from '@/components/ui/brutal-card';
import { BrutalButton } from '@/components/ui/brutal-button';
import { StatusBadge } from '@/components/ui/status-badge';
import { CatLoader } from '@/components/ui/cat-loader';
import { MonthYearSelector } from '@/components/invoice/MonthYearSelector';
import { getMonthName } from '@/utils/dateUtils';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  FileText, 
  Plus, 
  Calendar,
  Building,
  Clock,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Eye,
  Download,
  ExternalLink
} from 'lucide-react';

interface Invoice {
  id: string;
  month: number;
  year: number;
  status: string;
  total_ttc: number;
  drive_pdf_url?: string;
  original_filename?: string;
  created_at: string;
  campus: {
    name: string;
    address: string;
  };
}

export default function MyInvoices() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  
  // Filtrage par mois/année (par défaut le mois actuel)
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  useEffect(() => {
    if (user) {
      fetchInvoices();
    }
  }, [user, selectedMonth, selectedYear]); // Recharger quand le mois/année change

  const fetchInvoices = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('invoice')
        .select(`
          id,
          month,
          year,
          status,
          total_ttc,
          drive_pdf_url,
          original_filename,
          created_at,
          campus (
            name,
            address
          )
        `)
        .eq('teacher_id', user.id)
        .eq('month', selectedMonth)
        .eq('year', selectedYear)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des factures:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    if (filter === 'all') return true;
    return invoice.status === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-600';
      case 'prevalidated': return 'bg-brand-aurlom-light text-brand-aurlom border-brand-aurlom';
      case 'validated': return 'bg-green-100 text-green-800 border-green-600';
      case 'paid': return 'bg-emerald-100 text-emerald-800 border-emerald-600';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-600';
      default: return 'bg-gray-100 text-gray-800 border-gray-600';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'prevalidated': return 'Prévalidée';
      case 'validated': return 'Validée';
      case 'paid': return 'Payée';
      case 'rejected': return 'Rejetée';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'prevalidated': return <AlertCircle className="h-4 w-4" />;
      case 'validated': return <CheckCircle className="h-4 w-4" />;
      case 'paid': return <CreditCard className="h-4 w-4" />;
      case 'rejected': return <AlertCircle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="container-brutal py-8">
        <div className="flex items-center justify-center h-64">
          <CatLoader message="Chargement de vos factures..." size="lg" />
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
            <h1 className="text-4xl font-bold">Mes Factures</h1>
            <p className="text-lg text-muted-foreground mt-2">
              Gérez et suivez vos factures de prestation
            </p>
          </div>
          <div className="flex space-x-4">
            <Link to="/create-invoice">
              <BrutalButton variant="success">
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle Facture
              </BrutalButton>
            </Link>
          </div>
        </div>

        {/* Sélection de période */}
        <BrutalCard>
          <BrutalCardHeader>
            <BrutalCardTitle>Période de consultation</BrutalCardTitle>
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
          <BrutalCardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              <BrutalButton
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                Toutes ({invoices.length})
              </BrutalButton>
              <BrutalButton
                variant={filter === 'pending' ? 'warning' : 'outline'}
                size="sm"
                onClick={() => setFilter('pending')}
              >
                En attente ({invoices.filter(i => i.status === 'pending').length})
              </BrutalButton>
              <BrutalButton
                variant={filter === 'prevalidated' ? 'aurlom' : 'outline'}
                size="sm"
                onClick={() => setFilter('prevalidated')}
              >
                Prévalidées ({invoices.filter(i => i.status === 'prevalidated').length})
              </BrutalButton>
              <BrutalButton
                variant={filter === 'validated' ? 'education' : 'outline'}
                size="sm"
                onClick={() => setFilter('validated')}
              >
                Validées ({invoices.filter(i => i.status === 'validated').length})
              </BrutalButton>
              <BrutalButton
                variant={filter === 'paid' ? 'success' : 'outline'}
                size="sm"
                onClick={() => setFilter('paid')}
              >
                Payées ({invoices.filter(i => i.status === 'paid').length})
              </BrutalButton>
            </div>
          </BrutalCardContent>
        </BrutalCard>

        {/* Liste des factures */}
        {filteredInvoices.length === 0 ? (
          <BrutalCard>
            <BrutalCardContent className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {filter === 'all' ? 'Aucune facture trouvée' : `Aucune facture ${getStatusLabel(filter).toLowerCase()}`}
              </h3>
              <p className="text-muted-foreground mb-6">
                {filter === 'all' 
                  ? 'Créez votre première facture en important un fichier CSV.'
                  : 'Aucune facture ne correspond à ce filtre actuellement.'
                }
              </p>
              {filter === 'all' && (
                <Link to="/create-invoice">
                  <BrutalButton variant="success">
                    <Plus className="h-4 w-4 mr-2" />
                    Créer ma première facture
                  </BrutalButton>
                </Link>
              )}
            </BrutalCardContent>
          </BrutalCard>
        ) : (
          <div className="grid gap-6">
            {filteredInvoices.map((invoice) => (
              <BrutalCard key={invoice.id}>
                <BrutalCardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-lg border-2 border-foreground text-white ${
                        invoice.status === 'paid' ? 'bg-brand-success' :
                        invoice.status === 'validated' ? 'bg-brand-aurlom' :
                        invoice.status === 'prevalidated' ? 'bg-brand-education' : 
                        invoice.status === 'rejected' ? 'bg-brand-error' : 'bg-brand-warning'
                      }`}>
                        {getStatusIcon(invoice.status)}
                      </div>
                      <div>
                        <BrutalCardTitle>
                          Facture {getMonthName(invoice.month)} {invoice.year}
                        </BrutalCardTitle>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                          <div className="flex items-center">
                            <Building className="h-4 w-4 mr-1" />
                            {invoice.campus.name}
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {new Date(invoice.created_at).toLocaleDateString('fr-FR')}
                          </div>
                          {invoice.original_filename && (
                            <div className="flex items-center">
                              <FileText className="h-4 w-4 mr-1" />
                              {invoice.original_filename}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-2xl font-bold font-mono">
                        {parseFloat(invoice.total_ttc.toString()).toLocaleString('fr-FR')} €
                      </div>
                      <span className={`inline-flex items-center px-3 py-1 rounded text-xs font-medium border-2 ${getStatusColor(invoice.status)}`}>
                        {getStatusIcon(invoice.status)}
                        <span className="ml-1">{getStatusLabel(invoice.status)}</span>
                      </span>
                    </div>
                  </div>
                </BrutalCardHeader>
                
                <BrutalCardContent>
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                       <p>Montant : {parseFloat(invoice.total_ttc.toString()).toLocaleString('fr-FR')} €</p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {invoice.drive_pdf_url && (
                        <BrutalButton
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(invoice.drive_pdf_url, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          PDF Drive
                        </BrutalButton>
                      )}
                      
                      <Link to={`/invoice/${invoice.id}`}>
                        <BrutalButton
                          size="sm"
                          variant="outline"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Détails
                        </BrutalButton>
                      </Link>
                      
                      {invoice.status === 'paid' && (
                        <BrutalButton
                          size="sm"
                          variant="success"
                          onClick={() => {
                            toast.info('Génération PDF bientôt disponible');
                          }}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Télécharger
                        </BrutalButton>
                      )}
                    </div>
                  </div>
                </BrutalCardContent>
              </BrutalCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}