import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BrutalButton } from '@/components/ui/brutal-button';
import { BrutalCard, BrutalCardContent, BrutalCardHeader, BrutalCardTitle } from '@/components/ui/brutal-card';
import { Badge } from '@/components/ui/badge';
import { CatLoader } from '@/components/ui/cat-loader';
import { supabase } from '@/integrations/supabase/client';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  Calendar, 
  CreditCard, 
  FileText, 
  Activity,
  MapPin,
  Clock,
  Shield
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface UserDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
}

interface UserDetail {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: string;
  is_active: boolean;
  is_new_teacher?: boolean;
  hire_date?: string;
  created_at: string;
  updated_at: string;
  campus?: {
    id: string;
    name: string;
    address: string;
  };
  teacher_profile?: {
    rib_account_holder?: string;
    rib_bank_name?: string;
    rib_iban?: string;
    rib_bic?: string;
    hourly_rate_min?: number;
    hourly_rate_max?: number;
    specialities?: string[];
  };
  stats?: {
    totalInvoices: number;
    totalAmount: number;
    lastInvoiceDate?: string;
    averageMonthlyHours: number;
  };
  recentActivity?: Array<{
    action: string;
    timestamp: string;
    details?: any;
  }>;
}

export function UserDetailsDialogFixed({ isOpen, onClose, userId }: UserDetailsDialogProps) {
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { logDataAccess } = useActivityLogger();

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserDetails();
    } else {
      setUser(null);
      setError(null);
    }
  }, [isOpen, userId]);

  const fetchUserDetails = async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Log l'accès aux données
      await logDataAccess('user', userId, 'read');

      // Récupérer les infos de base de l'utilisateur
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select(`
          *,
          campus (
            id,
            name,
            address
          )
        `)
        .eq('user_id', userId)
        .maybeSingle();

      if (userError) throw userError;
      if (!userData) throw new Error('Utilisateur non trouvé');

      // Récupérer le profil enseignant si applicable
      let teacherProfile = null;
      if (userData.role === 'ENSEIGNANT') {
        const { data: teacherData } = await supabase
          .from('teacher_profile')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        
        teacherProfile = teacherData;
      }

      // Récupérer les statistiques de factures (seulement si accessible)
      let invoiceStats = [];
      try {
        const { data } = await supabase
          .from('invoice')
          .select('total_ttc, created_at')
          .eq('teacher_id', userId);
        invoiceStats = data || [];
      } catch (error) {
        console.warn('Cannot access invoice stats for user:', error);
      }

      // Récupérer l'activité récente (seulement si accessible)
      let activityData = [];
      try {
        const { data } = await supabase
          .from('user_activity_log')
          .select('action, timestamp, details')
          .eq('user_id', userId)
          .order('timestamp', { ascending: false })
          .limit(10);
        activityData = data || [];
      } catch (error) {
        console.warn('Cannot access activity logs for user:', error);
      }

      // Calculer les stats
      const stats = {
        totalInvoices: invoiceStats?.length || 0,
        totalAmount: invoiceStats?.reduce((sum, inv) => sum + (Number(inv.total_ttc) || 0), 0) || 0,
        lastInvoiceDate: invoiceStats?.[0]?.created_at || null,
        averageMonthlyHours: 0 // À calculer si nécessaire
      };

      const completeUser: UserDetail = {
        ...userData,
        teacher_profile: teacherProfile,
        stats,
        recentActivity: activityData || []
      };

      setUser(completeUser);
    } catch (error: any) {
      console.error('Error fetching user details:', error);
      setError(error.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    const colors = {
      'SUPER_ADMIN': 'bg-purple-100 text-purple-800 border-purple-600',
      'COMPTABLE': 'bg-green-100 text-green-800 border-green-600',
      'DIRECTEUR_CAMPUS': 'bg-brand-aurlom-light text-brand-aurlom border-brand-aurlom',
      'ENSEIGNANT': 'bg-orange-100 text-orange-800 border-orange-600',
    };
    return colors[role as keyof typeof colors] || colors['ENSEIGNANT'];
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            Détails de l'utilisateur
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8">
            <CatLoader message="Chargement des détails..." size="md" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="text-red-600 mb-4">{error}</div>
            <BrutalButton onClick={fetchUserDetails}>
              Réessayer
            </BrutalButton>
          </div>
        ) : user ? (
          <div className="space-y-6">
            {/* Informations principales */}
            <BrutalCard>
              <BrutalCardHeader>
                <BrutalCardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Informations personnelles
                  </span>
                  <div className="flex items-center space-x-2">
                    <Badge className={getRoleBadgeColor(user.role)}>
                      {user.role.replace('_', ' ')}
                    </Badge>
                    {!user.is_active && (
                      <Badge className="bg-red-100 text-red-800 border-red-200">
                        Désactivé
                      </Badge>
                    )}
                    {user.is_new_teacher && (
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        Nouveau
                      </Badge>
                    )}
                  </div>
                </BrutalCardTitle>
              </BrutalCardHeader>
              <BrutalCardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-3 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">Nom complet</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-3 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{user.email}</p>
                        <p className="text-sm text-muted-foreground">Email</p>
                      </div>
                    </div>

                    {user.phone && (
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-3 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{user.phone}</p>
                          <p className="text-sm text-muted-foreground">Téléphone</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    {user.campus && (
                      <div className="flex items-start">
                        <Building className="h-4 w-4 mr-3 text-muted-foreground mt-1" />
                        <div>
                          <p className="font-medium">{user.campus.name}</p>
                          <p className="text-sm text-muted-foreground">{user.campus.address}</p>
                        </div>
                      </div>
                    )}

                    {user.hire_date && (
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-3 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {new Date(user.hire_date).toLocaleDateString('fr-FR')}
                          </p>
                          <p className="text-sm text-muted-foreground">Date d'embauche</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-3 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {formatDistanceToNow(new Date(user.created_at), { addSuffix: true, locale: fr })}
                        </p>
                        <p className="text-sm text-muted-foreground">Compte créé</p>
                      </div>
                    </div>
                  </div>
                </div>
              </BrutalCardContent>
            </BrutalCard>

            {/* Profil enseignant */}
            {user.teacher_profile && (
              <BrutalCard>
                <BrutalCardHeader>
                  <BrutalCardTitle className="flex items-center">
                    <Shield className="h-5 w-5 mr-2" />
                    Profil Enseignant
                  </BrutalCardTitle>
                </BrutalCardHeader>
                <BrutalCardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3">Tarification</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tarif min/h:</span>
                          <span className="font-medium">
                            {formatCurrency(user.teacher_profile.hourly_rate_min || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tarif max/h:</span>
                          <span className="font-medium">
                            {formatCurrency(user.teacher_profile.hourly_rate_max || 0)}
                          </span>
                        </div>
                      </div>

                      {user.teacher_profile.specialities && user.teacher_profile.specialities.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-medium mb-2">Spécialités</h4>
                          <div className="flex flex-wrap gap-2">
                            {user.teacher_profile.specialities.map((specialty, index) => (
                              <Badge key={index} variant="outline">
                                {specialty}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">Informations bancaires</h4>
                      <div className="space-y-2 text-sm">
                        {user.teacher_profile.rib_account_holder && (
                          <div>
                            <span className="text-muted-foreground">Titulaire:</span>
                            <span className="ml-2 font-medium">{user.teacher_profile.rib_account_holder}</span>
                          </div>
                        )}
                        {user.teacher_profile.rib_bank_name && (
                          <div>
                            <span className="text-muted-foreground">Banque:</span>
                            <span className="ml-2 font-medium">{user.teacher_profile.rib_bank_name}</span>
                          </div>
                        )}
                        {user.teacher_profile.rib_iban && (
                          <div>
                            <span className="text-muted-foreground">IBAN:</span>
                            <span className="ml-2 font-mono text-xs">
                              {user.teacher_profile.rib_iban.replace(/(.{4})/g, '$1 ')}
                            </span>
                          </div>
                        )}
                        {user.teacher_profile.rib_bic && (
                          <div>
                            <span className="text-muted-foreground">BIC:</span>
                            <span className="ml-2 font-mono text-xs">{user.teacher_profile.rib_bic}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </BrutalCardContent>
              </BrutalCard>
            )}

            {/* Statistiques */}
            {user.stats && (
              <BrutalCard>
                <BrutalCardHeader>
                  <BrutalCardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Statistiques
                  </BrutalCardTitle>
                </BrutalCardHeader>
                <BrutalCardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-brand-aurlom">
                        {user.stats.totalInvoices}
                      </div>
                      <div className="text-sm text-muted-foreground">Factures</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-brand-success">
                        {formatCurrency(user.stats.totalAmount)}
                      </div>
                      <div className="text-sm text-muted-foreground">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-brand-education">
                        {user.stats.lastInvoiceDate ? 
                          formatDistanceToNow(new Date(user.stats.lastInvoiceDate), { locale: fr }) : 'N/A'
                        }
                      </div>
                      <div className="text-sm text-muted-foreground">Dernière facture</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-brand-warning">
                        {user.stats.averageMonthlyHours}h
                      </div>
                      <div className="text-sm text-muted-foreground">Moy. mensuelle</div>
                    </div>
                  </div>
                </BrutalCardContent>
              </BrutalCard>
            )}

            {/* Activité récente */}
            {user.recentActivity && user.recentActivity.length > 0 && (
              <BrutalCard>
                <BrutalCardHeader>
                  <BrutalCardTitle className="flex items-center">
                    <Activity className="h-5 w-5 mr-2" />
                    Activité récente
                  </BrutalCardTitle>
                </BrutalCardHeader>
                <BrutalCardContent>
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {user.recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <span className="font-medium">{activity.action}</span>
                          {activity.details?.page && (
                            <span className="text-sm text-muted-foreground ml-2">
                              sur {activity.details.page}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true, locale: fr })}
                        </span>
                      </div>
                    ))}
                  </div>
                </BrutalCardContent>
              </BrutalCard>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Aucune donnée disponible</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}