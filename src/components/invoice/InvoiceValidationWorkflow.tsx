import React, { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { BrutalButton } from '@/components/ui/brutal-button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { CheckCircle, XCircle, AlertCircle, MessageSquare, Eye } from 'lucide-react';

interface InvoiceValidationWorkflowProps {
  invoice: {
    id: string;
    status: string;
    month: number;
    year: number;
    total_ttc: number;
    teacher_id: string;
    campus_id: string;
  };
  onStatusChange?: () => void;
}

const statusLabels = {
  pending: 'En attente',
  prevalidated: 'Pré-validée',
  validated: 'Validée',
  rejected: 'Rejetée',
  paid: 'Payée'
};

const statusColors = {
  pending: 'bg-orange-100 text-orange-800',
  prevalidated: 'bg-brand-aurlom-light text-brand-aurlom',
  validated: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  paid: 'bg-emerald-100 text-emerald-800'
};

export function InvoiceValidationWorkflow({ invoice, onStatusChange }: InvoiceValidationWorkflowProps) {
  const { profile } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'validate'>('approve');

  const canPreValidate = profile?.role === 'DIRECTEUR_CAMPUS' && 
                        profile.campus_id === invoice.campus_id &&
                        invoice.status === 'pending';

  const canValidate = profile?.role === 'COMPTABLE' && 
                     invoice.status === 'prevalidated';

  const canReject = (profile?.role === 'DIRECTEUR_CAMPUS' || profile?.role === 'COMPTABLE') &&
                   ['pending', 'prevalidated'].includes(invoice.status);

  const handleValidationAction = async (action: 'pre_validate' | 'validate' | 'reject', comment: string = '') => {
    try {
      let newStatus = invoice.status;
      let actionLabel = '';

      switch (action) {
        case 'pre_validate':
          newStatus = 'prevalidated';
          actionLabel = 'Pré-validation';
          break;
        case 'validate':
          newStatus = 'validated';
          actionLabel = 'Validation';
          break;
        case 'reject':
          newStatus = 'rejected';
          actionLabel = 'Rejet';
          break;
      }

      // Update invoice status
      const { error: invoiceError } = await supabase
        .from('invoice')
        .update({ status: newStatus as any })
        .eq('id', invoice.id);

      if (invoiceError) throw invoiceError;

      // Log the validation action
      const { error: logError } = await supabase
        .from('validation_log')
        .insert({
          invoice_id: invoice.id,
          actor_id: profile?.user_id || '',
          role: profile?.role || 'ENSEIGNANT',
          action: actionLabel,
          previous_status: invoice.status as any,
          new_status: newStatus as any,
          comment: comment || null
        });

      if (logError) throw logError;

      // Si c'est un rejet, notifier l'enseignant
      if (action === 'reject') {
        const { error: notifyError } = await supabase.rpc('notify_teacher_rejection', {
          teacher_user_id: invoice.teacher_id,
          invoice_id_param: invoice.id,
          rejection_reason: comment || 'Aucun motif spécifié'
        });

        if (notifyError) {
          console.error('Erreur lors de la notification:', notifyError);
          // Ne pas faire échouer l'action si la notification échoue
        }
      }

      toast.success(`${actionLabel} effectuée avec succès`);
      setIsDialogOpen(false);
      setComment('');
      onStatusChange?.();

    } catch (error) {
      console.error('Erreur lors de l\'action:', error);
      toast.error('Erreur lors de l\'action');
    }
  };

  const openActionDialog = (action: 'approve' | 'reject' | 'validate') => {
    setActionType(action);
    setComment('');
    setIsDialogOpen(true);
  };

  const executeAction = () => {
    let action: 'pre_validate' | 'validate' | 'reject';
    
    switch (actionType) {
      case 'approve':
        action = profile?.role === 'DIRECTEUR_CAMPUS' ? 'pre_validate' : 'validate';
        break;
      case 'validate':
        action = 'validate';
        break;
      case 'reject':
        action = 'reject';
        break;
    }

    handleValidationAction(action, comment);
  };

  const getActionTitle = () => {
    switch (actionType) {
      case 'approve':
        return profile?.role === 'DIRECTEUR_CAMPUS' ? 'Pré-valider la facture' : 'Valider la facture';
      case 'validate':
        return 'Valider la facture';
      case 'reject':
        return 'Rejeter la facture';
    }
  };

  const getActionButtonText = () => {
    switch (actionType) {
      case 'approve':
        return profile?.role === 'DIRECTEUR_CAMPUS' ? 'Pré-valider' : 'Valider';
      case 'validate':
        return 'Valider';
      case 'reject':
        return 'Rejeter';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Badge className={statusColors[invoice.status as keyof typeof statusColors]}>
        {statusLabels[invoice.status as keyof typeof statusLabels]}
      </Badge>

      {canPreValidate && (
        <BrutalButton
          size="sm"
          variant="outline"
          onClick={() => openActionDialog('approve')}
          className="text-brand-aurlom border-brand-aurlom hover:bg-brand-aurlom-light"
        >
          <CheckCircle className="h-4 w-4 mr-1" />
          Pré-valider
        </BrutalButton>
      )}

      {canValidate && (
        <BrutalButton
          size="sm"
          onClick={() => openActionDialog('validate')}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <CheckCircle className="h-4 w-4 mr-1" />
          Valider
        </BrutalButton>
      )}

      {canReject && (
        <BrutalButton
          size="sm"
          variant="destructive"
          onClick={() => openActionDialog('reject')}
        >
          <XCircle className="h-4 w-4 mr-1" />
          Rejeter
        </BrutalButton>
      )}

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
              variant={actionType === 'reject' ? 'destructive' : 'default'}
            >
              {getActionButtonText()}
            </BrutalButton>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}