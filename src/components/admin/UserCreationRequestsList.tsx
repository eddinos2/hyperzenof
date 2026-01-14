import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { BrutalCard, BrutalCardContent, BrutalCardHeader, BrutalCardTitle } from '@/components/ui/brutal-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { BrutalButton } from '@/components/ui/brutal-button';
import { CatLoader } from '@/components/ui/cat-loader';
import { toast } from 'sonner';
import { useAutomaticNotifications } from '@/hooks/useAutomaticNotifications';
import { Clock, CheckCircle, XCircle, User, Calendar, FileText } from 'lucide-react';

interface UserCreationRequest {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  justification: string;
  campus_id: string;
  processed_by?: string;
  processed_at?: string;
  rejection_reason?: string;
  created_at: string;
  campus?: {
    name: string;
  } | null;
  requester?: {
    first_name: string;
    last_name: string;
  } | null;
  processor?: {
    first_name: string;
    last_name: string;
  } | null;
}

interface UserCreationRequestsListProps {
  viewMode?: 'director' | 'admin';
  onRefresh?: () => void;
}

export function UserCreationRequestsList({ viewMode = 'director', onRefresh }: UserCreationRequestsListProps) {
  const { profile } = useAuth();
  const { notifyUsersByRole } = useAutomaticNotifications();
  const [requests, setRequests] = useState<UserCreationRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, [profile]);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('user_creation_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrichir avec les données des profils et campus
      const enrichedData = await Promise.all(
        (data || []).map(async (request) => {
          // Récupérer campus
          const { data: campus } = await supabase
            .from('campus')
            .select('name')
            .eq('id', request.campus_id)
            .single();

          // Récupérer profil du demandeur
          const { data: requester } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('user_id', request.requested_by)
            .single();

          // Récupérer profil du processeur si applicable
          let processor = null;
          if (request.processed_by) {
            const { data: processorData } = await supabase
              .from('profiles')
              .select('first_name, last_name')
              .eq('user_id', request.processed_by)
              .single();
            processor = processorData;
          }

          return {
            ...request,
            campus,
            requester,
            processor
          };
        })
      );

      // Filtrer pour les directeurs
      let filteredData = viewMode === 'director' && profile?.role === 'DIRECTEUR_CAMPUS'
        ? enrichedData.filter(req => req.requested_by === profile.user_id)
        : enrichedData;

      // Pour la vue admin, filtrer par défaut pour n'afficher que pending/approved
      if (viewMode === 'admin') {
        filteredData = filteredData.filter(req => 
          req.status === 'pending' || req.status === 'approved'
        );
      }

      setRequests(filteredData);
    } catch (error: any) {
      console.error('Erreur lors du chargement des demandes:', error);
      toast.error('Erreur lors du chargement des demandes');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      // D'abord marquer comme approuvé
      const { error } = await supabase
        .from('user_creation_requests')
        .update({
          status: 'approved',
          processed_by: profile?.user_id,
          processed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Demande approuvée');
      
      // Notifier les super admins
      const { data: requestData } = await supabase
        .from('user_creation_requests')
        .select('first_name, last_name')
        .eq('id', requestId)
        .single();
        
      if (requestData) {
        await notifyUsersByRole('SUPER_ADMIN', {
          title: 'Demande approuvée',
          message: `La demande de création pour ${requestData.first_name} ${requestData.last_name} a été approuvée et est prête pour création.`,
          type: 'info'
        });
      }
      
      fetchRequests();
      onRefresh?.();
    } catch (error: any) {
      console.error('Erreur lors de l\'approbation:', error);
      toast.error('Erreur lors de l\'approbation');
    }
  };

  const handleCreateUser = async (request: UserCreationRequest) => {
    try {
      console.log('Creating user for request:', request.id, request.email);
      
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: request.email,
          first_name: request.first_name,
          last_name: request.last_name,
          role: request.role,
          campus_id: request.campus_id,
          phone: request.phone
        }
      });

      if (error) {
        console.error('Function invocation error:', error);
        throw error;
      }

      console.log('Create user response:', data);

      if (data?.error) {
        // Si c'est une vraie erreur, l'afficher
        console.error('Create user function error:', data.error);
        toast.error(`Erreur: ${data.error}`);
        return;
      }

      // Gérer les cas de succès
      if (data?.success) {
        console.log('User creation successful, updating request status...');
        
        if (data.alreadyExists) {
          toast.success(`Utilisateur ${request.first_name} ${request.last_name} déjà existant - demande clôturée`);
        } else {
          toast.success(`Utilisateur ${request.first_name} ${request.last_name} créé avec succès`);
        }
        
        // Marquer la demande comme traitée avec succès dans tous les cas
        const { error: updateError } = await supabase
          .from('user_creation_requests')
          .update({
            status: 'completed',
            processed_by: profile?.user_id,
            processed_at: new Date().toISOString()
          })
          .eq('id', request.id);

        if (updateError) {
          console.error('Error updating request status:', updateError);
          toast.error('Erreur lors de la mise à jour du statut de la demande');
          return;
        }

        console.log('Request status updated to completed');
        fetchRequests();
        onRefresh?.();
      }
    } catch (error: any) {
      console.error('Erreur lors de la création:', error);
      
      // Vérifier si l'utilisateur existe déjà en cas d'erreur non gérée
      try {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', request.email)
          .maybeSingle();
        
        if (existingProfile) {
          console.log('User already exists, closing request');
          // L'utilisateur existe, clôturer la demande
          await supabase
            .from('user_creation_requests')
            .update({
              status: 'completed',
              processed_by: profile?.user_id,
              processed_at: new Date().toISOString()
            })
            .eq('id', request.id);
          
          toast.success(`Utilisateur ${request.first_name} ${request.last_name} déjà existant - demande clôturée`);
          fetchRequests();
          onRefresh?.();
        } else {
          toast.error('Erreur lors de la création de l\'utilisateur');
        }
      } catch {
        toast.error('Erreur lors de la création de l\'utilisateur');
      }
    }
  };

  const handleReject = async (requestId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('user_creation_requests')
        .update({
          status: 'rejected',
          processed_by: profile?.user_id,
          processed_at: new Date().toISOString(),
          rejection_reason: reason
        })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Demande rejetée');
      fetchRequests();
      onRefresh?.();
    } catch (error: any) {
      console.error('Erreur lors du rejet:', error);
      toast.error('Erreur lors du rejet');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-orange-600" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-orange-100 text-orange-800 border-orange-600';
      case 'approved':
        return 'bg-blue-100 text-blue-800 border-blue-600';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-600';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-600';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-600';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ENSEIGNANT':
        return 'Enseignant';
      case 'DIRECTEUR_CAMPUS':
        return 'Directeur Campus';
      default:
        return role;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <CatLoader message="Chargement des demandes..." />
      </div>
    );
  }

  return (
    <BrutalCard>
      <BrutalCardHeader>
        <BrutalCardTitle className="flex items-center">
          <FileText className="h-5 w-5 mr-2" />
          {viewMode === 'admin' ? 'Toutes les demandes de création' : 'Mes demandes de création'}
        </BrutalCardTitle>
      </BrutalCardHeader>
      <BrutalCardContent>
        {requests.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            {viewMode === 'admin' ? 'Aucune demande trouvée' : 'Vous n\'avez pas encore fait de demande'}
          </p>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request.id}
                className="flex flex-col lg:flex-row lg:items-center lg:justify-between p-4 border-2 border-border-light rounded-lg hover:bg-muted/50 transition-colors space-y-3 lg:space-y-0"
              >
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-brand-aurlom text-white border-2 border-foreground rounded-lg flex-shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-medium text-sm">
                        {request.first_name} {request.last_name}
                      </h3>
                      <span className={`px-2 py-1 text-xs rounded border ${getStatusColor(request.status)}`}>
                        {getStatusIcon(request.status)}
                         <span className="ml-1">
                           {request.status === 'pending' ? 'En attente' :
                            request.status === 'approved' ? 'Approuvé' : 
                            request.status === 'completed' ? 'Utilisateur créé' : 'Rejeté'}
                         </span>
                      </span>
                    </div>
                    
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <span className="font-medium mr-2">Email:</span>
                        {request.email}
                      </div>
                      <div className="flex items-center">
                        <span className="font-medium mr-2">Rôle:</span>
                        {getRoleLabel(request.role)}
                      </div>
                      {viewMode === 'admin' && request.campus && (
                        <div className="flex items-center">
                          <span className="font-medium mr-2">Campus:</span>
                          {request.campus.name}
                        </div>
                      )}
                      {viewMode === 'admin' && request.requester && (
                        <div className="flex items-center">
                          <span className="font-medium mr-2">Demandé par:</span>
                          {request.requester.first_name} {request.requester.last_name}
                        </div>
                      )}
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(request.created_at).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                    
                    <div className="mt-2 p-2 bg-muted rounded text-xs">
                      <span className="font-medium">Justification:</span>
                      <p className="mt-1">{request.justification}</p>
                    </div>

                    {request.status === 'rejected' && request.rejection_reason && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                        <span className="font-medium text-red-800">Motif du rejet:</span>
                        <p className="mt-1 text-red-700">{request.rejection_reason}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {viewMode === 'admin' && profile?.role === 'SUPER_ADMIN' && (request.status === 'pending' || request.status === 'approved') && (
                  <div className="flex items-center space-x-2">
                    {request.status === 'pending' && (
                      <>
                        <BrutalButton
                          size="sm"
                          onClick={() => handleApprove(request.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approuver
                        </BrutalButton>
                        <BrutalButton
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            const reason = prompt('Motif du rejet:');
                            if (reason) handleReject(request.id, reason);
                          }}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Rejeter
                        </BrutalButton>
                      </>
                    )}
                    {request.status === 'approved' && (
                      <BrutalButton
                        size="sm"
                        variant="success"
                        onClick={() => handleCreateUser(request)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <User className="h-4 w-4 mr-1" />
                        Créer Utilisateur
                      </BrutalButton>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </BrutalCardContent>
    </BrutalCard>
  );
}