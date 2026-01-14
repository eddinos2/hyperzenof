import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BrutalCard, BrutalCardContent, BrutalCardHeader, BrutalCardTitle } from '@/components/ui/brutal-card';
import { BrutalButton } from '@/components/ui/brutal-button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { CatLoader } from '@/components/ui/cat-loader';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { getMonthName } from '@/utils/dateUtils';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Calendar, 
  Building, 
  FileText, 
  Clock,
  User,
  MapPin,
  DollarSign,
  ExternalLink,
  Download
} from 'lucide-react';

interface InvoiceLine {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  hours_qty: number;
  unit_price: number;
  course_title: string;
  is_late: boolean;
  filiere: {
    code: string;
    label: string;
  };
  campus: {
    name: string;
  };
}

interface InvoiceDetails {
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
  invoice_lines: InvoiceLine[];
}

export default function InvoiceDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const [invoice, setInvoice] = useState<InvoiceDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id && user) {
      fetchInvoiceDetails();
    }
  }, [id, user]);

  const fetchInvoiceDetails = async () => {
    if (!id || !user) return;

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
          ),
          invoice_line (
            id,
            date,
            start_time,
            end_time,
            hours_qty,
            unit_price,
            course_title,
            is_late,
            filiere (
              code,
              label
            ),
            campus (
              name
            )
          )
        `)
        .eq('id', id)
        .eq('teacher_id', user.id)
        .single();

      if (error) throw error;
      setInvoice({
        ...data,
        invoice_lines: data.invoice_line || []
      });
    } catch (error) {
      console.error('Erreur lors du chargement des détails:', error);
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

  if (loading) {
    return (
      <div className="container-brutal py-8">
        <div className="flex items-center justify-center h-64">
          <CatLoader message="Chargement des détails..." size="lg" />
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="container-brutal py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Facture non trouvée</h1>
          <Link to="/my-invoices">
            <BrutalButton>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux factures
            </BrutalButton>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-brutal py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/my-invoices">
              <BrutalButton variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </BrutalButton>
            </Link>
            <div>
              <h1 className="text-4xl font-bold">
                Facture {getMonthName(invoice.month)} {invoice.year}
              </h1>
              <p className="text-lg text-muted-foreground mt-2">
                Détails complets de votre facture
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <span className={`inline-flex items-center px-4 py-2 rounded text-sm font-medium border-2 ${getStatusColor(invoice.status)}`}>
              {getStatusLabel(invoice.status)}
            </span>
          </div>
        </div>

        {/* Informations générales */}
        <BrutalCard>
          <BrutalCardHeader>
            <BrutalCardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Informations Générales
            </BrutalCardTitle>
          </BrutalCardHeader>
          <BrutalCardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Building className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{invoice.campus.name}</p>
                    <p className="text-sm text-muted-foreground">{invoice.campus.address}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Période</p>
                    <p className="text-sm text-muted-foreground">
                      {getMonthName(invoice.month)} {invoice.year}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Montants</p>
                    <p className="text-sm text-muted-foreground">
                       Montant: {parseFloat(invoice.total_ttc.toString()).toLocaleString('fr-FR')} €
                    </p>
                  </div>
                </div>
                
                {invoice.original_filename && (
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Fichier source</p>
                      <p className="text-sm text-muted-foreground">
                        {invoice.original_filename}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {invoice.drive_pdf_url && (
              <div className="mt-6 pt-6 border-t border-border-light">
                <BrutalButton
                  variant="outline"
                  onClick={() => window.open(invoice.drive_pdf_url, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Voir le PDF original sur Drive
                </BrutalButton>
              </div>
            )}
          </BrutalCardContent>
        </BrutalCard>

        {/* Détail des prestations */}
        <BrutalCard>
          <BrutalCardHeader>
            <BrutalCardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Détail des Prestations ({invoice.invoice_lines.length} lignes)
            </BrutalCardTitle>
          </BrutalCardHeader>
          <BrutalCardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-2 border-foreground">
                <thead>
                  <tr className="bg-muted border-b-2 border-foreground">
                    <th className="p-3 text-left font-bold">Date</th>
                    <th className="p-3 text-left font-bold">Horaires</th>
                    <th className="p-3 text-left font-bold">Cours</th>
                    <th className="p-3 text-left font-bold">Filière</th>
                    <th className="p-3 text-left font-bold">Campus</th>
                    <th className="p-3 text-right font-bold">Heures</th>
                    <th className="p-3 text-right font-bold">Prix unitaire</th>
                    <th className="p-3 text-right font-bold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.invoice_lines.map((line, index) => (
                    <tr key={line.id} className={`border-b border-border-light ${index % 2 === 0 ? 'bg-surface' : 'bg-muted/30'}`}>
                      <td className="p-3">
                        <div className="flex items-center">
                          {line.is_late && (
                            <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-2" title="Retard signalé" />
                          )}
                          {new Date(line.date).toLocaleDateString('fr-FR')}
                        </div>
                      </td>
                      <td className="p-3 text-sm">
                        {line.start_time} - {line.end_time}
                      </td>
                      <td className="p-3 font-medium">
                        {line.course_title}
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-brand-aurlom-light text-brand-aurlom border border-brand-aurlom">
                          {line.filiere.code}
                        </span>
                      </td>
                      <td className="p-3 text-sm">
                        {line.campus.name}
                      </td>
                      <td className="p-3 text-right font-mono">
                        {parseFloat(line.hours_qty.toString()).toFixed(1)}h
                      </td>
                      <td className="p-3 text-right font-mono">
                        {parseFloat(line.unit_price.toString()).toLocaleString('fr-FR')} €
                      </td>
                      <td className="p-3 text-right font-mono font-bold">
                        {(parseFloat(line.hours_qty.toString()) * parseFloat(line.unit_price.toString())).toLocaleString('fr-FR')} €
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted border-t-2 border-foreground">
                    <td colSpan={5} className="p-3 font-bold text-right">TOTAL:</td>
                    <td className="p-3 text-right font-mono font-bold">
                      {invoice.invoice_lines.reduce((sum, line) => sum + parseFloat(line.hours_qty.toString()), 0).toFixed(1)}h
                    </td>
                    <td className="p-3"></td>
                    <td className="p-3 text-right font-mono font-bold text-lg">
                      {parseFloat(invoice.total_ttc.toString()).toLocaleString('fr-FR')} €
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </BrutalCardContent>
        </BrutalCard>

        {/* Actions */}
        <div className="flex justify-center space-x-4">
          {invoice.status === 'paid' && (
            <BrutalButton 
              variant="success" 
              onClick={() => toast.info('Génération PDF bientôt disponible')}
            >
              <Download className="h-4 w-4 mr-2" />
              Télécharger PDF
            </BrutalButton>
          )}
          
          <Link to="/my-invoices">
            <BrutalButton variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux factures
            </BrutalButton>
          </Link>
        </div>
      </div>
    </div>
  );
}