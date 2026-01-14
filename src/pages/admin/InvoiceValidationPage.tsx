import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { BrutalButton } from '@/components/ui/brutal-button';
import { BrutalCard, BrutalCardContent, BrutalCardHeader, BrutalCardTitle } from '@/components/ui/brutal-card';
import { CatLoader } from '@/components/ui/cat-loader';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { getMonthName } from '@/utils/dateUtils';
import { toast } from 'sonner';
import { useAutomaticNotifications } from '@/hooks/useAutomaticNotifications';
import { CheckCircle, XCircle, AlertCircle, ArrowLeft, Eye, Clock, Users, MapPin, Euro, Calendar } from 'lucide-react';

interface InvoiceData {
  id: string;
  month: number;
  year: number;
  status: string;
  total_ttc: number;
  notes?: string;
  observations?: string;
  teacher_id: string;
  campus_id: string;
  created_at: string;
  teacher?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  campus?: {
    name: string;
  };
  teacher_profile?: {
    rib_account_holder?: string;
    rib_bank_name?: string;
    rib_iban?: string;
    rib_bic?: string;
  };
  invoice_lines?: InvoiceLine[];
}

interface InvoiceLine {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  hours_qty: number;
  unit_price: number;
  course_title: string;
  campus_id: string;  // Ajout du campus_id pour les vérifications de permissions
  validation_status: string;
  observations?: string;
  prevalidated_at?: string;
  prevalidated_by: string;
  filiere?: {
    label: string;
  };
  class?: {
    label: string;
  };
  prevalidated_by_profile?: {
    first_name: string;
    last_name: string;
  };
}

const statusLabels = {
  pending: 'En attente',
  prevalidated: 'Pré-validée',
  validated: 'Validée',
  rejected: 'Rejetée',
  paid: 'Payée'
};

const statusColors = {
  pending: 'bg-orange-100 text-orange-800 border-orange-200',
  prevalidated: 'bg-brand-aurlom-light text-brand-aurlom border-brand-aurlom-light',
  validated: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  paid: 'bg-emerald-100 text-emerald-800 border-emerald-200'
};

const lineStatusIcons = {
  pending: <Clock className="h-4 w-4 text-orange-500" />,
  prevalidated: <Eye className="h-4 w-4 text-brand-aurlom" />,
  validated: <CheckCircle className="h-4 w-4 text-green-500" />,
  rejected: <XCircle className="h-4 w-4 text-red-500" />
};

function InvoiceValidationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { 
    notifyTeacherInvoiceValidated, 
    notifyTeacherInvoiceRejected, 
    notifyAccountantInvoicePrevalidated,
    notifyUsersByRole
  } = useAutomaticNotifications();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [actionType, setActionType] = useState<'prevalidate' | 'validate' | 'reject' | null>(null);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchInvoiceDetails();
    }
  }, [id]);

  const fetchInvoiceDetails = async () => {
    try {
      setLoading(true);
      
      // First fetch the invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoice')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (invoiceError) throw invoiceError;
      if (!invoiceData) {
        toast.error('Facture non trouvée');
        navigate('/admin/invoices');
        return;
      }

      // Fetch teacher info
      const { data: teacherData } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('user_id', invoiceData.teacher_id)
        .maybeSingle();

      // Fetch campus info
      const { data: campusData } = await supabase
        .from('campus')
        .select('name')
        .eq('id', invoiceData.campus_id)
        .maybeSingle();

      // Fetch teacher profile for banking info
      const { data: teacherProfileData } = await supabase
        .from('teacher_profile')
        .select('rib_account_holder, rib_bank_name, rib_iban, rib_bic')
        .eq('user_id', invoiceData.teacher_id)
        .maybeSingle();

      // Fetch invoice lines
      const { data: linesData } = await supabase
        .from('invoice_line')
        .select(`
          *,
          filiere:filiere(label),
          class:class(label),
          prevalidated_by_profile:profiles(first_name, last_name)
        `)
        .eq('invoice_id', id);

      const completeInvoice: InvoiceData = {
        ...invoiceData,
        teacher: teacherData || undefined,
        campus: campusData || undefined,
        teacher_profile: teacherProfileData || undefined,
        invoice_lines: linesData || []
      };

      setInvoice(completeInvoice);
    } catch (error: any) {
      console.error('Error fetching invoice:', error);
      toast.error(`Erreur lors du chargement: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getMonthName = (month: number) => {
    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    return months[month - 1] || `Month ${month}`;
  };

  const canPrevalidateLine = (line: InvoiceLine) => {
    return profile?.role === 'DIRECTEUR_CAMPUS' && 
           profile.campus_id === line.campus_id &&  // Vérifier le campus de la LIGNE, pas de la facture
           line.validation_status === 'pending';
  };

  const canValidateLine = (line: InvoiceLine) => {
    return profile?.role === 'COMPTABLE' && 
           line.validation_status === 'prevalidated';
  };

  const canRejectLine = (line: InvoiceLine) => {
    return (
      (profile?.role === 'DIRECTEUR_CAMPUS' && profile.campus_id === line.campus_id) ||  // Directeur : son campus uniquement
      profile?.role === 'COMPTABLE'  // Comptable : tous les campus
    ) && ['pending', 'prevalidated'].includes(line.validation_status);
  };

  const canValidateInvoice = () => {
    return profile?.role === 'COMPTABLE' && 
           invoice?.status === 'prevalidated' &&
           invoice?.invoice_lines?.every(line => ['prevalidated', 'validated'].includes(line.validation_status));
  };

  const handleLineAction = (lineId: string, action: 'prevalidate' | 'validate' | 'reject') => {
    setSelectedLineId(lineId);
    setActionType(action);
    setComment('');
    setIsDialogOpen(true);
  };

  const handleInvoiceAction = (action: 'validate') => {
    setSelectedLineId(null);
    setActionType(action);
    setComment('');
    setIsDialogOpen(true);
  };

  const handleBulkPrevalidation = async () => {
    if (!invoice || !profile?.user_id) return;
    
    try {
      const { data, error } = await supabase.rpc('bulk_prevalidate_invoice_lines', {
        invoice_id_param: invoice.id,
        director_user_id: profile.user_id
      });

      if (error) throw error;

      const result = data as { success: boolean; lines_processed?: number; lines_total?: number; error?: string };

      if (result.success) {
        toast.success(`${result.lines_processed} lignes prévalidées sur ${result.lines_total}`);
        
        // Log the bulk action
        await supabase.from('validation_log').insert({
          invoice_id: invoice.id,
          actor_id: profile.user_id,
          role: profile.role,
          action: 'bulk_prevalidate_lines',
          previous_status: invoice.status as any,
          new_status: 'prevalidated' as any,
          comment: `Prévalidation en masse: ${result.lines_processed} lignes`
        });
        
        fetchInvoiceDetails(); // Refresh data
      } else {
        toast.error(result.error || 'Erreur lors de la prévalidation');
      }
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la prévalidation en masse');
    }
  };

  const executeAction = async () => {
    if (!actionType || !invoice) return;
    
    setIsLoading(true);
    try {
      if (selectedLineId) {
        // Line-level action
        let newStatus = '';
        switch (actionType) {
          case 'prevalidate':
            newStatus = 'prevalidated';
            break;
          case 'validate':
            newStatus = 'validated';
            break;
          case 'reject':
            newStatus = 'rejected';
            break;
        }

        const { error: lineError } = await supabase
          .from('invoice_line')
          .update({
            validation_status: newStatus,
            ...(actionType === 'prevalidate' && { 
              prevalidated_by: profile?.user_id,
              prevalidated_at: new Date().toISOString()
            }),
            ...(comment && { observations: comment })
          })
          .eq('id', selectedLineId);

        if (lineError) throw lineError;

        // Log the action
        await supabase.from('validation_log').insert({
          invoice_id: invoice.id,
          actor_id: profile?.user_id || '',
          role: profile?.role || 'ENSEIGNANT',
          action: `${actionType}_line`,
          previous_status: invoice.status as any,
          new_status: newStatus as any,
          comment: comment || null
        });

        toast.success(`Ligne ${actionType === 'prevalidate' ? 'pré-validée' : actionType === 'validate' ? 'validée' : 'rejetée'} avec succès`);
        
        // Notifications automatiques pour les lignes
        if (actionType === 'prevalidate' && invoice.status === 'prevalidated') {
          // Si toutes les lignes sont prévalidées, notifier les comptables
          await notifyUsersByRole('COMPTABLE', {
            title: 'Facture prévalidée',
            message: `La facture ${invoice.month}/${invoice.year} de ${invoice.teacher?.first_name} ${invoice.teacher?.last_name} est prête pour validation finale.`,
            type: 'info'
          });
        }
      } else {
        // Invoice-level action
        let newStatus = '';
        switch (actionType) {
          case 'validate':
            newStatus = 'validated';
            break;
        }

        const { error: invoiceError } = await supabase
          .from('invoice')
          .update({ 
            status: newStatus as any,
            ...(comment && { observations: comment })
          })
          .eq('id', invoice.id);

        if (invoiceError) throw invoiceError;

        // Log the action
        await supabase.from('validation_log').insert({
          invoice_id: invoice.id,
          actor_id: profile?.user_id || '',
          role: profile?.role || 'ENSEIGNANT',
          action: actionType,
          previous_status: invoice.status as any,
          new_status: newStatus as any,
          comment: comment || null
        });

        toast.success('Facture validée avec succès');
        
        // Notification à l'enseignant
        if (actionType === 'validate' && invoice.teacher_id) {
          await notifyTeacherInvoiceValidated(invoice.teacher_id, invoice.month, invoice.year);
        }
      }

      setIsDialogOpen(false);
      setComment('');
      fetchInvoiceDetails(); // Refresh data
    } catch (error: any) {
      console.error('Error executing action:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getActionTitle = () => {
    if (!actionType) return '';
    
    if (selectedLineId) {
      switch (actionType) {
        case 'prevalidate': return 'Pré-valider la ligne';
        case 'validate': return 'Valider la ligne';
        case 'reject': return 'Rejeter la ligne';
      }
    } else {
      switch (actionType) {
        case 'validate': return 'Valider la facture';
      }
    }
    return '';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <CatLoader message="Chargement de la facture..." size="lg" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Facture non trouvée</h2>
          <BrutalButton onClick={() => navigate('/admin/invoices')}>
            Retour aux factures
          </BrutalButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <BrutalButton
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/invoices')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </BrutalButton>
            <h1 className="text-3xl font-bold">
              Validation Facture {getMonthName(invoice.month)} {invoice.year}
            </h1>
          </div>
          <Badge className={statusColors[invoice.status as keyof typeof statusColors]}>
            {statusLabels[invoice.status as keyof typeof statusLabels]}
          </Badge>
        </div>

        {/* Campus restriction notice for directors */}
        {profile?.role === 'DIRECTEUR_CAMPUS' && (
          <div className="bg-brand-aurlom-light border-2 border-brand-aurlom rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <MapPin className="h-5 w-5 text-brand-aurlom mr-2 mt-0.5" />
              <div>
                <h4 className="font-medium text-brand-aurlom">Restriction par Campus</h4>
                <p className="text-sm text-brand-aurlom mt-1">
                  En tant que Directeur de Campus, vous ne pouvez prévalider que les lignes de facture de votre campus.
                  Les lignes d'autres campus ne sont pas visibles ou modifiables.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Invoice Details */}
        <BrutalCard>
          <BrutalCardHeader>
            <BrutalCardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Informations Facture
            </BrutalCardTitle>
          </BrutalCardHeader>
          <BrutalCardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="font-medium">Enseignant:</span>
                  <span className="ml-2">
                    {invoice.teacher ? `${invoice.teacher.first_name} ${invoice.teacher.last_name}` : 'Non défini'}
                  </span>
                </div>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="font-medium">Campus:</span>
                  <span className="ml-2">{invoice.campus?.name || 'Non défini'}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="font-medium">Période:</span>
                  <span className="ml-2">{getMonthName(invoice.month)} {invoice.year}</span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center">
                  <Euro className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="font-medium">Total:</span>
                  <span className="ml-2 font-bold">{invoice.total_ttc.toFixed(2)} €</span>
                </div>
                <div className="flex items-center">
                  <span className="font-medium">Lignes:</span>
                  <span className="ml-2">{invoice.invoice_lines?.length || 0}</span>
                </div>
              </div>
            </div>

            {/* Invoice Actions */}
            <div className="mt-6 flex space-x-4">
              {profile?.role === 'DIRECTEUR_CAMPUS' && invoice?.status === 'pending' && (
                <BrutalButton
                  onClick={() => handleBulkPrevalidation()}
                  variant="success"
                  className="bg-brand-aurlom hover:bg-brand-aurlom-dark text-white"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Prévalider toutes mes lignes
                </BrutalButton>
              )}
              
              {canValidateInvoice() && (
                <BrutalButton
                  onClick={() => handleInvoiceAction('validate')}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Valider la facture
                </BrutalButton>
              )}
            </div>
          </BrutalCardContent>
        </BrutalCard>

        {/* Invoice Lines */}
        <BrutalCard>
          <BrutalCardHeader>
            <BrutalCardTitle>Lignes de Facture</BrutalCardTitle>
          </BrutalCardHeader>
          <BrutalCardContent>
            <div className="space-y-4">
              {invoice.invoice_lines?.map((line) => (
                <div key={line.id} className={`border rounded-lg p-4 ${
                  profile?.role === 'DIRECTEUR_CAMPUS' && profile.campus_id !== line.campus_id
                    ? 'border-gray-300 bg-gray-50 opacity-60'  // Ligne d'un autre campus - grisée
                    : 'border-border'  // Ligne du bon campus ou autre rôle - normale
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      {lineStatusIcons[line.validation_status as keyof typeof lineStatusIcons]}
                      <Badge className={statusColors[line.validation_status as keyof typeof statusColors]}>
                        {statusLabels[line.validation_status as keyof typeof statusLabels]}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(line.date).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      {canPrevalidateLine(line) && (
                        <BrutalButton
                          size="sm"
                          variant="outline"
                          onClick={() => handleLineAction(line.id, 'prevalidate')}
                          className="text-brand-aurlom border-brand-aurlom hover:bg-brand-aurlom-light"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Pré-valider
                        </BrutalButton>
                      )}
                      
                      {canValidateLine(line) && (
                        <BrutalButton
                          size="sm"
                          onClick={() => handleLineAction(line.id, 'validate')}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Valider
                        </BrutalButton>
                      )}
                      
                      {canRejectLine(line) && (
                        <BrutalButton
                          size="sm"
                          variant="destructive"
                          onClick={() => handleLineAction(line.id, 'reject')}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Rejeter
                        </BrutalButton>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Cours:</strong> {line.course_title}</p>
                      <p><strong>Filière:</strong> {line.filiere?.label || 'Non définie'}</p>
                      <p><strong>Classe:</strong> {line.class?.label || 'Non définie'}</p>
                      {profile?.role === 'DIRECTEUR_CAMPUS' && (
                        <p><strong>Campus:</strong> 
                          <span className={`ml-1 px-2 py-1 rounded text-xs ${
                            profile.campus_id === line.campus_id 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {profile.campus_id === line.campus_id ? 'Votre campus' : 'Autre campus'}
                          </span>
                        </p>
                      )}
                    </div>
                    <div>
                      <p><strong>Horaires:</strong> {line.start_time} - {line.end_time}</p>
                      <p><strong>Heures:</strong> {line.hours_qty}h</p>
                      <p><strong>Prix unitaire:</strong> {line.unit_price.toFixed(2)} €</p>
                      <p><strong>Total:</strong> {(line.hours_qty * line.unit_price).toFixed(2)} €</p>
                    </div>
                  </div>
                  
                  {line.observations && (
                    <div className="mt-3 p-3 bg-muted rounded-md">
                      <p className="text-sm"><strong>Observations:</strong> {line.observations}</p>
                    </div>
                  )}
                  
                  {line.prevalidated_by_profile && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Pré-validé par {line.prevalidated_by_profile.first_name} {line.prevalidated_by_profile.last_name}
                      {line.prevalidated_at && ` le ${new Date(line.prevalidated_at).toLocaleDateString('fr-FR')}`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </BrutalCardContent>
        </BrutalCard>
      </div>

      {/* Action Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'reject' ? (
                <XCircle className="h-5 w-5 text-red-600" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
              {getActionTitle()}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="comment">
                {actionType === 'reject' ? 'Motif du rejet' : 'Commentaire (optionnel)'}
              </Label>
              <Textarea
                id="comment"
                placeholder={
                  actionType === 'reject' 
                    ? "Expliquez la raison du rejet..." 
                    : "Ajoutez un commentaire si nécessaire..."
                }
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
            </div>
            
            {actionType === 'reject' && !comment.trim() && (
              <div className="flex items-center gap-2 text-amber-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                Un motif de rejet est recommandé
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-2">
            <BrutalButton variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </BrutalButton>
            <BrutalButton
              onClick={executeAction}
              disabled={isLoading}
              variant={actionType === 'reject' ? 'destructive' : 'default'}
            >
              {isLoading ? (
                <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
              ) : null}
              {actionType === 'prevalidate' ? 'Pré-valider' : 
               actionType === 'validate' ? 'Valider' :
               actionType === 'reject' ? 'Rejeter' :
               actionType === 'mark_paid' ? 'Marquer comme payée' : 'Confirmer'}
            </BrutalButton>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default InvoiceValidationPage;