import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BrutalButton } from '@/components/ui/brutal-button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  Calendar, 
  CreditCard,
  FileText,
  Clock,
  X
} from 'lucide-react';
import { toast } from 'sonner';

interface UserDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
}

export function UserDetailsDialog({ isOpen, onClose, userId }: UserDetailsDialogProps) {
  const [userDetails, setUserDetails] = useState<any>(null);
  const [userStats, setUserStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserDetails();
      fetchUserStats();
    }
  }, [isOpen, userId]);

  const fetchUserDetails = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          campus (
            id,
            name,
            address
          ),
          teacher_profile (
            specialities,
            hourly_rate_min,
            hourly_rate_max,
            rib_iban,
            rib_bank_name
          )
        `)
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      setUserDetails(data);
    } catch (error) {
      console.error('Erreur lors du chargement des détails:', error);
      toast.error('Erreur lors du chargement des détails');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    if (!userId) return;

    try {
      if (userDetails?.role === 'ENSEIGNANT') {
        // Statistiques pour les enseignants
        const { count: totalInvoices } = await supabase
          .from('invoice')
          .select('*', { count: 'exact', head: true })
          .eq('teacher_id', userId);

        const { data: paidInvoices } = await supabase
          .from('invoice')
          .select('total_ttc')
          .eq('teacher_id', userId)
          .eq('status', 'paid');

        const totalPaid = paidInvoices?.reduce((sum, inv) => sum + parseFloat(inv.total_ttc.toString()), 0) || 0;

        setUserStats({
          totalInvoices: totalInvoices || 0,
          totalPaid: totalPaid,
          type: 'teacher'
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    }
  };

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      'SUPER_ADMIN': { label: 'Super Admin', color: 'bg-purple-100 text-purple-800' },
      'COMPTABLE': { label: 'Comptable', color: 'bg-green-100 text-green-800' },
      'DIRECTEUR_CAMPUS': { label: 'Directeur', color: 'bg-brand-aurlom-light text-brand-aurlom border-brand-aurlom' },
      'ENSEIGNANT': { label: 'Enseignant', color: 'bg-orange-100 text-orange-800' },
    };
    
    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig['ENSEIGNANT'];
    
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  if (!isOpen || !userId) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Détails de l'utilisateur
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-lg">Chargement...</div>
          </div>
        ) : userDetails ? (
          <div className="space-y-6">
            {/* Informations personnelles */}
            <div className="border-2 border-border-light rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center">
                <User className="h-4 w-4 mr-2" />
                Informations personnelles
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nom complet</p>
                  <p className="font-medium">{userDetails.first_name} {userDetails.last_name}</p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">Rôle</p>
                  {getRoleBadge(userDetails.role)}
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium flex items-center">
                    <Mail className="h-4 w-4 mr-1" />
                    {userDetails.email}
                  </p>
                </div>
                
                {userDetails.phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Téléphone</p>
                    <p className="font-medium flex items-center">
                      <Phone className="h-4 w-4 mr-1" />
                      {userDetails.phone}
                    </p>
                  </div>
                )}
                
                {userDetails.campus && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Campus</p>
                    <p className="font-medium flex items-center">
                      <Building className="h-4 w-4 mr-1" />
                      {userDetails.campus.name}
                    </p>
                  </div>
                )}
                
                <div>
                  <p className="text-sm text-muted-foreground">Statut</p>
                  <Badge className={userDetails.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {userDetails.is_active ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>
                
                {userDetails.hire_date && (
                  <div>
                    <p className="text-sm text-muted-foreground">Date d'embauche</p>
                    <p className="font-medium flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {new Date(userDetails.hire_date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Informations enseignant */}
            {userDetails.role === 'ENSEIGNANT' && userDetails.teacher_profile && (
              <div className="border-2 border-border-light rounded-lg p-4">
                <h3 className="font-semibold mb-3 flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  Profil enseignant
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Tarif horaire</p>
                    <p className="font-medium">
                      {userDetails.teacher_profile.hourly_rate_min}€ - {userDetails.teacher_profile.hourly_rate_max}€
                    </p>
                  </div>
                  
                  {userDetails.teacher_profile.specialities?.length > 0 && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Spécialités</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {userDetails.teacher_profile.specialities.map((spec: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {spec}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-sm text-muted-foreground">RIB configuré</p>
                    <p className="font-medium flex items-center">
                      <CreditCard className="h-4 w-4 mr-1" />
                      {userDetails.teacher_profile.rib_iban ? 'Oui' : 'Non'}
                    </p>
                  </div>
                  
                  {userDetails.teacher_profile.rib_bank_name && (
                    <div>
                      <p className="text-sm text-muted-foreground">Banque</p>
                      <p className="font-medium">{userDetails.teacher_profile.rib_bank_name}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Statistiques */}
            {userStats && (
              <div className="border-2 border-border-light rounded-lg p-4">
                <h3 className="font-semibold mb-3 flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Statistiques
                </h3>
                
                {userStats.type === 'teacher' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total factures</p>
                      <p className="text-2xl font-bold">{userStats.totalInvoices}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total payé</p>
                      <p className="text-2xl font-bold">{userStats.totalPaid.toLocaleString('fr-FR')} €</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-4">
              <BrutalButton onClick={onClose}>
                <X className="h-4 w-4 mr-2" />
                Fermer
              </BrutalButton>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Utilisateur non trouvé</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}