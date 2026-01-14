import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { BrutalCard, BrutalCardHeader, BrutalCardTitle, BrutalCardContent } from '@/components/ui/brutal-card';
import { BrutalButton } from '@/components/ui/brutal-button';
import { BrutalInput } from '@/components/ui/brutal-input';
import { CatLoader } from '@/components/ui/cat-loader';
import { DataPagination } from '@/components/ui/data-pagination';
import { usePagination } from '@/hooks/usePagination';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, CreditCard, Calendar, DollarSign, FileText, Eye, Download, ExternalLink, Building2, MapPin, User, Mail, Banknote } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getMonthName } from '@/utils/dateUtils';
import { useAutomaticNotifications } from '@/hooks/useAutomaticNotifications';

interface Payment {
  id: string;
  invoice_id: string;
  amount_ttc: number;
  method: 'virement' | 'cheque' | 'especes' | 'autre';
  reference: string;
  paid_at: string;
  created_at: string;
  invoice?: {
    id: string;
    month: number;
    year: number;
    total_ttc: number;
    status: string;
    profiles?: {
      first_name: string;
      last_name: string;
    };
  };
}

interface Invoice {
  id: string;
  month: number;
  year: number;
  total_ttc: number;
  status: string;
  teacher_id: string;
  campus_id: string;
  created_at: string;
  drive_pdf_url?: string;
  notes?: string;
  observations?: string;
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  teacher_profile?: {
    rib_account_holder?: string;
    rib_bank_name?: string;
    rib_iban?: string;
    rib_bic?: string;
  };
  campus?: {
    name: string;
    address?: string;
  };
  invoice_line?: Array<{
    date: string;
    course_title: string;
    start_time: string;
    end_time: string;
    hours_qty: number;
    unit_price: number;
  }>;
}

const paymentMethods = {
  virement: 'Virement',
  cheque: 'Chèque',
  especes: 'Espèces',
  autre: 'Autre'
};

export default function PaymentManagement() {
  const { profile } = useAuth();
  const { notifyTeacherPaymentReceived, notifyAccountantNewPayment, notifyUsersByRole } = useAutomaticNotifications();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [availableInvoices, setAvailableInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceDetailsOpen, setInvoiceDetailsOpen] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [formData, setFormData] = useState({
    invoice_id: '',
    amount_ttc: '',
    method: 'virement' as const,
    reference: '',
    paid_at: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (profile?.role === 'SUPER_ADMIN' || profile?.role === 'COMPTABLE') {
      fetchPayments();
      fetchAvailableInvoices();
    }
  }, [profile]);

  // Reset to page 1 when search filter changes
  useEffect(() => {
    goToPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payment')
        .select('*')
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Get invoice and teacher details separately
      const paymentsWithDetails = await Promise.all(
        (paymentsData || []).map(async (payment) => {
          const { data: invoiceData } = await supabase
            .from('invoice')
            .select(`
              id,
              month,
              year,
              total_ttc,
              status,
              teacher_id
            `)
            .eq('id', payment.invoice_id)
            .single();

          let teacherProfile = null;
          if (invoiceData?.teacher_id) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('first_name, last_name')
              .eq('user_id', invoiceData.teacher_id)
              .single();
            teacherProfile = profileData;
          }

          return {
            ...payment,
            invoice: invoiceData ? {
              ...invoiceData,
              profiles: teacherProfile
            } : null
          };
        })
      );

      setPayments(paymentsWithDetails);
    } catch (error) {
      console.error('Erreur lors du chargement des paiements:', error);
      toast.error('Erreur lors du chargement des paiements');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableInvoices = async () => {
    try {
      // Fetch validated invoices that are not fully paid
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoice')
        .select(`
          id,
          month,
          year,
          total_ttc,
          status,
          teacher_id,
          campus_id,
          created_at,
          drive_pdf_url,
          notes,
          observations
        `)
        .eq('status', 'validated')
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (invoicesError) throw invoicesError;

      // Enrichir chaque facture avec les infos enseignant, bancaires et campus
      const invoicesWithDetails = await Promise.all(
        (invoicesData || []).map(async (inv) => {
          const { data: teacher } = await supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('user_id', inv.teacher_id)
            .maybeSingle();

          const { data: banking } = await supabase
            .from('teacher_profile')
            .select('rib_iban, rib_bic, rib_account_holder, rib_bank_name')
            .eq('user_id', inv.teacher_id)
            .maybeSingle();

          const { data: campus } = await supabase
            .from('campus')
            .select('name, address')
            .eq('id', inv.campus_id)
            .maybeSingle();

          return {
            ...inv,
            profiles: teacher || undefined,
            teacher_profile: banking || undefined,
            campus: campus || undefined,
          } as Invoice;
        })
      );

      setAvailableInvoices(invoicesWithDetails);
    } catch (error) {
      console.error('Erreur lors du chargement des factures:', error);
      toast.error('Erreur lors du chargement des factures');
    }
  };

  const handleCreatePayment = async () => {
    try {
      if (!formData.invoice_id || !formData.amount_ttc) {
        toast.error('Veuillez remplir tous les champs obligatoires');
        return;
      }

      const payment = {
        ...formData,
        amount_ttc: parseFloat(formData.amount_ttc),
        paid_at: new Date(formData.paid_at).toISOString()
      };

      const { error: paymentError } = await supabase
        .from('payment')
        .insert([payment]);

      if (paymentError) throw paymentError;

      // Check if invoice is fully paid and update status
      const { data: paymentsSum } = await supabase
        .from('payment')
        .select('amount_ttc')
        .eq('invoice_id', formData.invoice_id);

      const { data: invoiceData } = await supabase
        .from('invoice')
        .select('total_ttc')
        .eq('id', formData.invoice_id)
        .single();

      if (paymentsSum && invoiceData) {
        const totalPaid = paymentsSum.reduce((sum, p) => sum + p.amount_ttc, 0) + parseFloat(formData.amount_ttc);
        
        let newStatus = 'validated';
        if (totalPaid >= invoiceData.total_ttc) {
          newStatus = 'paid';
        }

        await supabase
          .from('invoice')
          .update({ status: newStatus as any })
          .eq('id', formData.invoice_id);
      }

      toast.success('Paiement enregistré avec succès');
      
      // Notifier l'enseignant du paiement
      const selectedInvoiceData = availableInvoices.find(inv => inv.id === formData.invoice_id);
      if (selectedInvoiceData?.teacher_id) {
        await notifyTeacherPaymentReceived(
          selectedInvoiceData.teacher_id, 
          parseFloat(formData.amount_ttc),
          selectedInvoiceData.month,
          selectedInvoiceData.year
        );
      }
      
      // Notifier les comptables
      await notifyUsersByRole('COMPTABLE', {
        title: 'Nouveau paiement enregistré',
        message: `Paiement de ${formData.amount_ttc}€ enregistré (Réf: ${formData.reference})`,
        type: 'success'
      });
      
      setIsDialogOpen(false);
      resetForm();
      fetchPayments();
      fetchAvailableInvoices();
    } catch (error) {
      console.error('Erreur lors de la création du paiement:', error);
      toast.error('Erreur lors de la création du paiement');
    }
  };

  const resetForm = () => {
    setFormData({
      invoice_id: '',
      amount_ttc: '',
      method: 'virement',
      reference: '',
      paid_at: new Date().toISOString().split('T')[0]
    });
    setSelectedInvoice(null);
  };

  const handleInvoiceSelect = (invoiceId: string) => {
    const invoice = availableInvoices.find(i => i.id === invoiceId);
    if (invoice) {
      setSelectedInvoice(invoice);
      setFormData({
        ...formData,
        invoice_id: invoiceId,
        amount_ttc: invoice.total_ttc.toString()
      });
    }
  };

  const handleViewInvoiceDetails = async (invoice: Invoice) => {
    try {
      // Fetch base invoice (already have), enrich with related data
      const [profileRes, bankingRes, campusRes, linesRes] = await Promise.all([
        supabase.from('profiles')
          .select('first_name, last_name, email')
          .eq('user_id', invoice.teacher_id)
          .maybeSingle(),
        supabase.from('teacher_profile')
          .select('rib_iban, rib_bic, rib_account_holder, rib_bank_name')
          .eq('user_id', invoice.teacher_id)
          .maybeSingle(),
        supabase.from('campus')
          .select('name, address')
          .eq('id', invoice.campus_id)
          .maybeSingle(),
        supabase.from('invoice_line')
          .select('date, course_title, start_time, end_time, hours_qty, unit_price')
          .eq('invoice_id', invoice.id)
      ]);

      const viewing = {
        ...invoice,
        profiles: profileRes.data || undefined,
        teacher_profile: bankingRes.data || undefined,
        campus: campusRes.data || undefined,
        invoice_line: linesRes.data || [],
      } as Invoice;

      setViewingInvoice(viewing);
      setInvoiceDetailsOpen(true);
    } catch (error) {
      console.error('Error in handleViewInvoiceDetails:', error);
      toast.error('Erreur lors du chargement des détails');
    }
  };

  const handleMarkAsPaid = async (invoice: Invoice) => {
    try {
      // Update invoice status to paid
      const { error: invoiceError } = await supabase
        .from('invoice')
        .update({ status: 'paid' })
        .eq('id', invoice.id);

      if (invoiceError) throw invoiceError;

      // Create payment record
      const { error: paymentError } = await supabase
        .from('payment')
        .insert({
          invoice_id: invoice.id,
          amount_ttc: invoice.total_ttc,
          method: 'virement',
          reference: `AUTO-${Date.now()}`,
          paid_at: new Date().toISOString()
        });

      if (paymentError) throw paymentError;

      toast.success('Facture marquée comme payée');
      
      // Notifier l'enseignant du paiement
      if (invoice.teacher_id) {
        await notifyTeacherPaymentReceived(
          invoice.teacher_id, 
          invoice.total_ttc,
          invoice.month,
          invoice.year
        );
      }
      
      fetchPayments();
      fetchAvailableInvoices();
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du marquage en payé');
    }
  };

  const handleExportValidatedInvoices = async () => {
    try {
      if (availableInvoices.length === 0) {
        toast.error('Aucune facture validée à exporter');
        return;
      }

      const exportData = availableInvoices.map(invoice => ({
        'ID Facture': invoice.id,
        'Période': `${invoice.month}/${invoice.year}`,
        'Enseignant': `${invoice.profiles?.first_name || ''} ${invoice.profiles?.last_name || ''}`.trim(),
        'Email': invoice.profiles?.email || '',
        'Campus': invoice.campus?.name || '',
        'Montant': invoice.total_ttc?.toFixed(2) || '0.00',
        'Date Création': new Date(invoice.created_at).toLocaleDateString('fr-FR'),
        'Lien Drive': invoice.drive_pdf_url || '',
        'Titulaire RIB': invoice.teacher_profile?.rib_account_holder || '',
        'Banque': invoice.teacher_profile?.rib_bank_name || '',
        'IBAN': invoice.teacher_profile?.rib_iban || '',
        'BIC': invoice.teacher_profile?.rib_bic || '',
        'Notes': invoice.notes || '',
        'Observations': invoice.observations || ''
      }));

      // Convert to CSV
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
      link.setAttribute('download', `factures_a_payer_${new Date().toISOString().split('T')[0]}.csv`);
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

  const filteredPayments = payments.filter(payment =>
    payment.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.invoice?.profiles?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.invoice?.profiles?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    paymentMethods[payment.method].toLowerCase().includes(searchTerm.toLowerCase())
  );

  const {
    currentPage,
    totalPages,
    paginatedData: paginatedPayments,
    goToPage
  } = usePagination({
    data: filteredPayments,
    itemsPerPage: 10,
    initialPage: 1
  });

  const totalPayments = payments.reduce((sum, p) => sum + p.amount_ttc, 0);
  const paymentsThisMonth = payments.filter(p => 
    new Date(p.paid_at).getMonth() === new Date().getMonth() &&
    new Date(p.paid_at).getFullYear() === new Date().getFullYear()
  );

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

  if (loading) {
    return (
      <div className="container-brutal py-8">
        <div className="flex items-center justify-center h-64">
          <CatLoader message="Chargement des paiements..." size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="container-brutal py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Gestion des Paiements</h1>
        <p className="text-muted-foreground">
          Gérez les paiements des factures validées
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <BrutalCard>
          <BrutalCardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Paiements</p>
                <p className="text-2xl font-bold">{payments.length}</p>
              </div>
              <CreditCard className="h-8 w-8 text-brand-aurlom" />
            </div>
          </BrutalCardContent>
        </BrutalCard>

        <BrutalCard>
          <BrutalCardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Montant Total</p>
                <p className="text-2xl font-bold text-green-600">
                  {totalPayments.toFixed(2)} €
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </BrutalCardContent>
        </BrutalCard>

        <BrutalCard>
          <BrutalCardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ce Mois</p>
                <p className="text-2xl font-bold">{paymentsThisMonth.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-brand-aurlom" />
            </div>
          </BrutalCardContent>
        </BrutalCard>

        <BrutalCard>
          <BrutalCardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Factures en Attente</p>
                <p className="text-2xl font-bold text-orange-600">
                  {availableInvoices.length}
                </p>
              </div>
              <FileText className="h-8 w-8 text-orange-600" />
            </div>
          </BrutalCardContent>
        </BrutalCard>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <BrutalInput
              placeholder="Rechercher un paiement..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <BrutalButton variant="outline" onClick={handleExportValidatedInvoices}>
          <Download className="h-4 w-4 mr-2" />
          Export Factures à Payer
        </BrutalButton>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <BrutalButton onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau Paiement
            </BrutalButton>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Enregistrer un paiement</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="invoice_id" className="text-right">Facture</Label>
                <Select
                  value={formData.invoice_id}
                  onValueChange={handleInvoiceSelect}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Sélectionner une facture" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableInvoices.map((invoice) => (
                      <SelectItem key={invoice.id} value={invoice.id}>
                        {invoice.profiles?.first_name} {invoice.profiles?.last_name} - 
                        {getMonthName(invoice.month)} {invoice.year} - 
                        {invoice.total_ttc.toFixed(2)} €
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedInvoice && (
                <div className="col-span-4 p-3 bg-muted rounded-lg">
                  <p className="text-sm">
                    <strong>Facture sélectionnée:</strong><br />
                    Enseignant: {selectedInvoice.profiles?.first_name} {selectedInvoice.profiles?.last_name}<br />
                    Période: {getMonthName(selectedInvoice.month)} {selectedInvoice.year}<br />
                    Montant TTC: {selectedInvoice.total_ttc.toFixed(2)} €
                  </p>
                </div>
              )}

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount_ttc" className="text-right">Montant</Label>
                <BrutalInput
                  id="amount_ttc"
                  type="number"
                  step="0.01"
                  value={formData.amount_ttc}
                  onChange={(e) => setFormData({...formData, amount_ttc: e.target.value})}
                  className="col-span-3"
                  placeholder="0.00"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="method" className="text-right">Méthode</Label>
                <Select
                  value={formData.method}
                  onValueChange={(value: any) => setFormData({...formData, method: value})}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(paymentMethods).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="reference" className="text-right">Référence</Label>
                <BrutalInput
                  id="reference"
                  value={formData.reference}
                  onChange={(e) => setFormData({...formData, reference: e.target.value})}
                  className="col-span-3"
                  placeholder="Numéro de chèque, référence virement..."
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="paid_at" className="text-right">Date paiement</Label>
                <BrutalInput
                  id="paid_at"
                  type="date"
                  value={formData.paid_at}
                  onChange={(e) => setFormData({...formData, paid_at: e.target.value})}
                  className="col-span-3"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <BrutalButton variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </BrutalButton>
              <BrutalButton onClick={handleCreatePayment}>
                Enregistrer
              </BrutalButton>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Invoice Details Dialog */}
      <Dialog open={invoiceDetailsOpen} onOpenChange={setInvoiceDetailsOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détails de la Facture</DialogTitle>
          </DialogHeader>
          {viewingInvoice && (
            <div className="space-y-6">
              {/* Invoice Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Informations Facture</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>ID:</strong> {viewingInvoice.id}</div>
                    <div><strong>Période:</strong> {getMonthName(viewingInvoice.month)} {viewingInvoice.year}</div>
                    <div><strong>Montant:</strong> {viewingInvoice.total_ttc?.toFixed(2)} €</div>
                    <div><strong>Date création:</strong> {new Date(viewingInvoice.created_at).toLocaleDateString('fr-FR')}</div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Campus</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      {viewingInvoice.campus?.name}
                    </div>
                    {viewingInvoice.campus?.address && (
                      <div className="text-muted-foreground">{viewingInvoice.campus.address}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Teacher Info */}
              <div>
                <h3 className="font-semibold mb-2 flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  Informations Enseignant
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div><strong>Nom:</strong> {viewingInvoice.profiles?.first_name} {viewingInvoice.profiles?.last_name}</div>
                    <div className="flex items-center mt-1">
                      <Mail className="h-4 w-4 mr-2" />
                      {viewingInvoice.profiles?.email}
                    </div>
                  </div>
                </div>
              </div>

              {/* Banking Info */}
              {viewingInvoice.teacher_profile && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center">
                    <Banknote className="h-4 w-4 mr-2" />
                    Informations Bancaires
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div><strong>Titulaire:</strong> {viewingInvoice.teacher_profile.rib_account_holder || 'Non renseigné'}</div>
                      <div><strong>Banque:</strong> {viewingInvoice.teacher_profile.rib_bank_name || 'Non renseigné'}</div>
                    </div>
                    <div>
                      <div><strong>IBAN:</strong> {viewingInvoice.teacher_profile.rib_iban || 'Non renseigné'}</div>
                      <div><strong>BIC:</strong> {viewingInvoice.teacher_profile.rib_bic || 'Non renseigné'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Drive Link */}
              {viewingInvoice.drive_pdf_url && (
                <div>
                  <h3 className="font-semibold mb-2">Facture Originale</h3>
                  <BrutalButton
                    variant="outline"
                    onClick={() => window.open(viewingInvoice.drive_pdf_url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Voir la facture sur Drive
                  </BrutalButton>
                </div>
              )}

              {/* Notes */}
              {(viewingInvoice.notes || viewingInvoice.observations) && (
                <div>
                  <h3 className="font-semibold mb-2">Notes et Observations</h3>
                  {viewingInvoice.notes && (
                    <div className="mb-2">
                      <strong>Notes:</strong>
                      <p className="text-sm text-muted-foreground mt-1">{viewingInvoice.notes}</p>
                    </div>
                  )}
                  {viewingInvoice.observations && (
                    <div>
                      <strong>Observations:</strong>
                      <p className="text-sm text-muted-foreground mt-1">{viewingInvoice.observations}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Validated Invoices to Pay */}
      <BrutalCard className="mb-6">
        <BrutalCardHeader>
          <BrutalCardTitle>Factures Validées à Payer ({availableInvoices.length})</BrutalCardTitle>
        </BrutalCardHeader>
        <BrutalCardContent>
          <div className="space-y-4">
            {availableInvoices.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Aucune facture validée en attente de paiement</p>
            ) : (
              availableInvoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-4 border-2 border-border-light rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-green-600 text-white border-2 border-foreground rounded-lg">
                      <FileText className="h-5 w-5" />
                    </div>
                    
                    <div>
                      <div className="flex items-center space-x-3">
                        <h3 className="font-medium">
                          {invoice.profiles?.first_name} {invoice.profiles?.last_name}
                        </h3>
                        <Badge className="bg-green-100 text-green-800 border-green-600">
                          Validée
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {getMonthName(invoice.month)} {invoice.year}
                        </div>
                        
                        <div className="flex items-center">
                          <Building2 className="h-4 w-4 mr-1" />
                          {invoice.campus?.name}
                        </div>
                        
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          {invoice.profiles?.email}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-lg font-bold font-mono text-green-600">
                        {invoice.total_ttc?.toFixed(2)} €
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <BrutalButton
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewInvoiceDetails(invoice)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Détails
                      </BrutalButton>
                      
                      <BrutalButton
                        size="sm"
                        className="bg-brand-aurlom hover:bg-brand-aurlom-dark text-white border-2 border-foreground"
                        onClick={() => handleMarkAsPaid(invoice)}
                      >
                        <CreditCard className="h-4 w-4 mr-1" />
                        Marquer Payé
                      </BrutalButton>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </BrutalCardContent>
      </BrutalCard>

      {/* Payments List */}
      <div className="grid gap-4">
        {paginatedPayments.length === 0 && filteredPayments.length === 0 ? (
          <BrutalCard>
            <BrutalCardContent className="p-8 text-center">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchTerm ? 'Aucun paiement trouvé' : 'Aucun paiement'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm 
                  ? 'Essayez de modifier votre recherche'
                  : 'Commencez par enregistrer votre premier paiement'
                }
              </p>
              {!searchTerm && (
                <BrutalButton onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Enregistrer un paiement
                </BrutalButton>
              )}
            </BrutalCardContent>
          </BrutalCard>
        ) : (
          <>
            {paginatedPayments.map((payment) => (
            <BrutalCard key={payment.id}>
              <BrutalCardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">
                        {payment.invoice?.profiles?.first_name} {payment.invoice?.profiles?.last_name}
                      </h3>
                      <Badge variant="outline">
                        {getMonthName(payment.invoice?.month || 1)} {payment.invoice?.year}
                      </Badge>
                      <Badge className="bg-green-100 text-green-800">
                        {payment.amount_ttc.toFixed(2)} €
                      </Badge>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <CreditCard className="h-4 w-4" />
                        {paymentMethods[payment.method]}
                      </div>
                      {payment.reference && (
                        <div>Réf: {payment.reference}</div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(payment.paid_at), 'dd/MM/yyyy', { locale: fr })}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <BrutalButton
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Ouvrir les détails de la facture dans un modal ou rediriger
                        toast.info(`Détails de la facture ${payment.invoice_id}`);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </BrutalButton>
                  </div>
                </div>
              </BrutalCardContent>
            </BrutalCard>
          ))}
          
          <DataPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
            totalItems={filteredPayments.length}
            itemsPerPage={10}
            itemName="paiements"
          />
          </>
        )}
      </div>
      {/* Invoice Details Dialog */}
      <Dialog open={invoiceDetailsOpen} onOpenChange={setInvoiceDetailsOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détails de la Facture</DialogTitle>
          </DialogHeader>
          {viewingInvoice && (
            <div className="space-y-6">
              {/* Invoice Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Informations Facture</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>ID:</strong> {viewingInvoice.id}</div>
                    <div><strong>Période:</strong> {getMonthName(viewingInvoice.month)} {viewingInvoice.year}</div>
                    <div><strong>Montant:</strong> {viewingInvoice.total_ttc?.toFixed(2)} €</div>
                    <div><strong>Date création:</strong> {new Date(viewingInvoice.created_at).toLocaleDateString('fr-FR')}</div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Campus</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      {viewingInvoice.campus?.name}
                    </div>
                    {viewingInvoice.campus?.address && (
                      <div className="text-muted-foreground">{viewingInvoice.campus.address}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Teacher Info */}
              <div>
                <h3 className="font-semibold mb-2 flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  Informations Enseignant
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div><strong>Nom:</strong> {viewingInvoice.profiles?.first_name} {viewingInvoice.profiles?.last_name}</div>
                    <div className="flex items-center mt-1">
                      <Mail className="h-4 w-4 mr-2" />
                      {viewingInvoice.profiles?.email}
                    </div>
                  </div>
                </div>
              </div>

              {/* Banking Info */}
              {viewingInvoice.teacher_profile && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center">
                    <Banknote className="h-4 w-4 mr-2" />
                    Informations Bancaires
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div><strong>Titulaire:</strong> {viewingInvoice.teacher_profile.rib_account_holder || 'Non renseigné'}</div>
                      <div><strong>Banque:</strong> {viewingInvoice.teacher_profile.rib_bank_name || 'Non renseigné'}</div>
                    </div>
                    <div>
                      <div><strong>IBAN:</strong> {viewingInvoice.teacher_profile.rib_iban || 'Non renseigné'}</div>
                      <div><strong>BIC:</strong> {viewingInvoice.teacher_profile.rib_bic || 'Non renseigné'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Drive Link */}
              {viewingInvoice.drive_pdf_url && (
                <div>
                  <h3 className="font-semibold mb-2">Facture Originale</h3>
                  <BrutalButton
                    variant="outline"
                    onClick={() => window.open(viewingInvoice.drive_pdf_url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Voir la facture sur Drive
                  </BrutalButton>
                </div>
              )}

              {/* Notes */}
              {(viewingInvoice.notes || viewingInvoice.observations) && (
                <div>
                  <h3 className="font-semibold mb-2">Notes et Observations</h3>
                  {viewingInvoice.notes && (
                    <div className="mb-2">
                      <strong>Notes:</strong>
                      <p className="text-sm text-muted-foreground mt-1">{viewingInvoice.notes}</p>
                    </div>
                  )}
                  {viewingInvoice.observations && (
                    <div>
                      <strong>Observations:</strong>
                      <p className="text-sm text-muted-foreground mt-1">{viewingInvoice.observations}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}