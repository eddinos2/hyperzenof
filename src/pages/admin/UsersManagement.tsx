import { UserDetailsDialogFixed } from '@/components/admin/UserDetailsDialogFixed';
import { DirectorCampusManagement } from '@/components/admin/DirectorCampusManagement';
import { UserCreationRequestsList } from '@/components/admin/UserCreationRequestsList';

import React, { useEffect, useState } from 'react';
import { BrutalCard, BrutalCardContent, BrutalCardHeader, BrutalCardTitle } from '@/components/ui/brutal-card';
import { BrutalButton } from '@/components/ui/brutal-button';
import { BrutalInput } from '@/components/ui/brutal-input';
import { CatLoader } from '@/components/ui/cat-loader';
import { DataPagination } from '@/components/ui/data-pagination';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePagination } from '@/hooks/usePagination';
import { TeacherImportForm } from '@/components/admin/TeacherImportForm';
import { UserFormDialog } from '@/components/admin/UserFormDialog';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { BulkUserActions } from '@/components/admin/BulkUserActions';
import { UserAccessManager } from '@/components/admin/UserAccessManager';
import { AccessExportButton } from '@/components/admin/AccessExportButton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { 
  Users, 
  Plus, 
  Search,
  Filter,
  Edit,
  Trash2,
  Upload,
  Eye,
  UserCheck,
  UserX,
  Building,
  Mail,
  Phone,
  FileText,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';

interface User {
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
  campus?: {
    id: string;
    name: string;
  };
}

export default function UsersManagement() {
  const { profile } = useAuth();
  const { logClick } = useActivityLogger();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [campusFilter, setCampusFilter] = useState<string>('all');
  const [showImport, setShowImport] = useState(false);
  const [campuses, setCampuses] = useState<any[]>([]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  
  const isDirector = profile?.role === 'DIRECTEUR_CAMPUS';
  const isAdmin = profile?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (profile && ['SUPER_ADMIN', 'DIRECTEUR_CAMPUS'].includes(profile.role)) {
      fetchUsers();
      if (profile.role === 'SUPER_ADMIN') {
        fetchCampuses();
      }
    }
  }, [profile]);

  const fetchUsers = async () => {
    try {
      let query = supabase
        .from('profiles')
        .select(`
          id,
          user_id,
          first_name,
          last_name,
          email,
          phone,
          role,
          is_active,
          is_new_teacher,
          hire_date,
          campus (
            id,
            name
          )
        `)
        .order('last_name', { ascending: true });

      // Si c'est un directeur, ne montrer que les utilisateurs de son campus
      if (profile?.role === 'DIRECTEUR_CAMPUS' && profile.campus_id) {
        query = query.eq('campus_id', profile.campus_id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
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

  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers([...selectedUsers, userId]);
    } else {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
      setSelectAll(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedUsers(paginatedUsers.map(user => user.user_id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentStatus })
        .eq('user_id', userId);

      if (error) throw error;
      
      toast.success(`Utilisateur ${!currentStatus ? 'activé' : 'désactivé'}`);
      fetchUsers();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la modification');
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir SUPPRIMER définitivement l'utilisateur ${email} ? Cette action est irréversible.`)) {
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('delete-users', {
        body: { user_ids: [userId] }
      });

      if (error) throw error;

      if (data?.errors && data.errors.length > 0) {
        toast.error(`Erreurs: ${data.errors.slice(0, 2).join(', ')}`);
      } else {
        toast.success('Utilisateur supprimé avec succès');
      }
      
      fetchUsers();
    } catch (error: any) {
      console.error('Erreur suppression:', error);
      toast.error(error.message || 'Erreur lors de la suppression');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.length === 0) return;
    
    if (!confirm(`Êtes-vous sûr de vouloir SUPPRIMER définitivement ${selectedUsers.length} utilisateur(s) ? Cette action est irréversible.`)) {
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('delete-users', {
        body: { user_ids: selectedUsers }
      });

      if (error) throw error;

      toast.success(`${data?.deleted || 0} utilisateur(s) supprimé(s)`);
      if (data?.errors && data.errors.length > 0) {
        toast.warning(`Quelques erreurs: ${data.errors.slice(0, 3).join(', ')}`);
      }
      
      setSelectedUsers([]);
      setSelectAll(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Erreur suppression en masse:', error);
      toast.error(error.message || 'Erreur lors de la suppression en masse');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' || [
      user.first_name?.toLowerCase() || '',
      user.last_name?.toLowerCase() || '',
      user.email?.toLowerCase() || '',
      user.phone?.toLowerCase() || '',
      `${user.first_name} ${user.last_name}`.toLowerCase(),
      user.campus?.name?.toLowerCase() || ''
    ].some(field => field.includes(searchTerm.toLowerCase().trim()));
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesCampus = campusFilter === 'all' || user.campus?.id === campusFilter;
    
    return matchesSearch && matchesRole && matchesCampus;
  });

  const {
    currentPage,
    totalPages,
    paginatedData: paginatedUsers,
    goToPage
  } = usePagination({
    data: filteredUsers,
    itemsPerPage: 20,
    initialPage: 1
  });

  // Reset to page 1 when filters change
  useEffect(() => {
    goToPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, roleFilter, campusFilter]);

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      'SUPER_ADMIN': { label: 'Super Admin', color: 'bg-purple-100 text-purple-800 border-purple-600' },
      'COMPTABLE': { label: 'Comptable', color: 'bg-green-100 text-green-800 border-green-600' },
      'DIRECTEUR_CAMPUS': { label: 'Directeur', color: 'bg-brand-aurlom-light text-brand-aurlom border-brand-aurlom' },
      'ENSEIGNANT': { label: 'Enseignant', color: 'bg-orange-100 text-orange-800 border-orange-600' },
    };
    
    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig['ENSEIGNANT'];
    
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium border-2 ${config.color}`}>
        {config.label}
      </span>
    );
  };

  if (!['SUPER_ADMIN', 'DIRECTEUR_CAMPUS'].includes(profile?.role || '')) {
    return (
      <div className="container-brutal py-8">
        <BrutalCard>
          <BrutalCardContent className="text-center py-8">
            <p className="text-muted-foreground">
              Accès réservé aux Super Administrateurs et Directeurs de Campus
            </p>
          </BrutalCardContent>
        </BrutalCard>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container-brutal py-8">
        <div className="flex items-center justify-center h-64">
          <CatLoader message="Chargement des utilisateurs..." size="lg" />
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
            <h1 className="text-4xl font-bold">Gestion des Utilisateurs</h1>
            <p className="text-lg text-muted-foreground mt-2">
              Administration complète des comptes Aurlom
            </p>
          </div>
          <div className="flex space-x-4">
            <div className="min-w-[200px]">
              <AccessExportButton />
            </div>
            <BrutalButton 
              variant="outline"
              onClick={() => setShowImport(!showImport)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Import Professeurs
            </BrutalButton>
            <BrutalButton 
              variant="outline"
              onClick={async () => {
                try {
                  const { data, error } = await supabase.functions.invoke('assign-teachers', { body: {} });
                  if (error) throw error;
                  const matched = data?.matched || 0;
                  const unmatched = data?.unmatched || 0;
                  const campusUpdated = data?.campusUpdated || 0;
                  toast.success(`Réconciliation terminée: ${matched} assignés, ${unmatched} sans correspondance, ${campusUpdated} campus mis à jour`);
                } catch (e: any) {
                  console.error(e);
                  toast.error(e.message || 'Erreur lors de la réconciliation');
                } finally {
                  fetchUsers();
                }
              }}
            >
              <Users className="h-4 w-4 mr-2" />
              Réconcilier enseignants
            </BrutalButton>
            <BrutalButton 
              variant="success"
              onClick={() => {
                setSelectedUser(null);
                setShowUserForm(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouvel Utilisateur
            </BrutalButton>
            {selectedUsers.length > 0 && (
              <>
                <BrutalButton 
                  variant="aurlom"
                  onClick={() => setShowBulkActions(true)}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Actions en masse ({selectedUsers.length})
                </BrutalButton>
                <BrutalButton 
                  variant="destructive"
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer ({selectedUsers.length})
                </BrutalButton>
              </>
            )}
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <BrutalCard>
            <BrutalCardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{users.length}</p>
                  <p className="text-sm text-muted-foreground">Total Utilisateurs</p>
                </div>
                <Users className="h-8 w-8 text-brand-aurlom" />
              </div>
            </BrutalCardContent>
          </BrutalCard>

          <BrutalCard>
            <BrutalCardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">
                    {users.filter(u => u.role === 'ENSEIGNANT').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Enseignants</p>
                </div>
                <UserCheck className="h-8 w-8 text-brand-education" />
              </div>
            </BrutalCardContent>
          </BrutalCard>

          <BrutalCard>
            <BrutalCardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">
                    {users.filter(u => u.is_new_teacher).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Nouveaux Profs</p>
                </div>
                <Plus className="h-8 w-8 text-brand-success" />
              </div>
            </BrutalCardContent>
          </BrutalCard>

          <BrutalCard>
            <BrutalCardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">
                    {users.filter(u => !u.is_active).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Désactivés</p>
                </div>
                <UserX className="h-8 w-8 text-brand-error" />
              </div>
            </BrutalCardContent>
          </BrutalCard>
        </div>

        {/* Import Form (conditional) */}
        {showImport && (
          <TeacherImportForm onImportComplete={() => {
            setShowImport(false);
            fetchUsers();
          }} />
        )}


        {/* Filtres et recherche */}
        <BrutalCard>
          <BrutalCardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <BrutalInput
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <select 
                value={roleFilter} 
                onChange={(e) => setRoleFilter(e.target.value)}
                className="input-brutal"
              >
                <option value="all">Tous les rôles</option>
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="COMPTABLE">Comptable</option>
                <option value="DIRECTEUR_CAMPUS">Directeur Campus</option>
                <option value="ENSEIGNANT">Enseignant</option>
              </select>

              <select 
                value={campusFilter} 
                onChange={(e) => setCampusFilter(e.target.value)}
                className="input-brutal"
              >
                <option value="all">Tous les campus</option>
                {campuses.map(campus => (
                  <option key={campus.id} value={campus.id}>{campus.name}</option>
                ))}
              </select>

              <div className="text-sm text-muted-foreground flex items-center">
                <Filter className="h-4 w-4 mr-2" />
                {filteredUsers.length} résultat{filteredUsers.length > 1 ? 's' : ''}
              </div>
            </div>
          </BrutalCardContent>
        </BrutalCard>

        {/* Onglets */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users">Utilisateurs</TabsTrigger>
            <TabsTrigger value="requests">
              Demandes en Attente
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            {/* Liste des utilisateurs */}
            <BrutalCard>
          <BrutalCardHeader>
            <div className="flex justify-between items-center">
              <BrutalCardTitle>Utilisateurs ({filteredUsers.length})</BrutalCardTitle>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-sm text-muted-foreground">Tout sélectionner</span>
              </div>
            </div>
          </BrutalCardHeader>
          <BrutalCardContent>
            <div className="space-y-4">
              {paginatedUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 border-2 border-border-light rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.user_id)}
                      onChange={(e) => handleSelectUser(user.user_id, e.target.checked)}
                      className="h-4 w-4"
                    />
                    
                    <div className={`w-12 h-12 rounded-lg border-2 border-foreground flex items-center justify-center text-white font-bold ${
                      user.is_active ? 'bg-brand-success' : 'bg-gray-400'
                    }`}>
                      {user.first_name[0]}{user.last_name[0]}
                    </div>
                    
                    <div>
                      <div className="flex items-center space-x-3">
                        <h3 className="font-medium">
                          {user.first_name} {user.last_name}
                          {user.is_new_teacher && (
                            <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded border">
                              NOUVEAU
                            </span>
                          )}
                        </h3>
                        {getRoleBadge(user.role)}
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-1" />
                          {user.email}
                        </div>
                        
                        {user.phone && (
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 mr-1" />
                            {user.phone}
                          </div>
                        )}
                        
                        {user.campus && (
                          <div className="flex items-center">
                            <Building className="h-4 w-4 mr-1" />
                            {user.campus.name}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <BrutalButton
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          const { data, error } = await supabase.functions.invoke('reset-user-passwords', {
                            body: { user_ids: [user.user_id] }
                          });
                          if (error) throw error;
                          if (data?.success?.length > 0) {
                            toast.success(`Mot de passe réinitialisé pour ${user.first_name} ${user.last_name}`);
                          } else {
                            toast.error('Erreur lors de la réinitialisation');
                          }
                        } catch (e: any) {
                          console.error(e);
                          toast.error(e.message || 'Erreur');
                        }
                      }}
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      Reset MDP
                    </BrutalButton>

                    <BrutalButton
                      size="sm"
                      variant={user.is_active ? "outline" : "success"}
                      onClick={() => handleToggleActive(user.user_id, user.is_active)}
                    >
                      {user.is_active ? (
                        <>
                          <UserX className="h-4 w-4 mr-1" />
                          Désactiver
                        </>
                      ) : (
                        <>
                          <UserCheck className="h-4 w-4 mr-1" />
                          Activer
                        </>
                      )}
                    </BrutalButton>
                    
                    <BrutalButton 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setSelectedUser(user);
                        setShowUserForm(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Modifier
                    </BrutalButton>
                    
                    <BrutalButton 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        logClick('user_details_view', { user_id: user.user_id });
                        setSelectedUserId(user.user_id);
                        setShowUserDetails(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </BrutalButton>
                    
                    {isAdmin && (
                      <BrutalButton 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleDeleteUser(user.user_id, user.email)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </BrutalButton>
                    )}
                  </div>
                </div>
              ))}
              
              {paginatedUsers.length === 0 && filteredUsers.length === 0 && (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Aucun utilisateur trouvé</h3>
                  <p className="text-muted-foreground">
                    Aucun utilisateur ne correspond aux critères de recherche.
                  </p>
                </div>
              )}
            </div>
            
            <DataPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={goToPage}
              totalItems={filteredUsers.length}
              itemsPerPage={20}
              itemName="utilisateurs"
            />
          </BrutalCardContent>
        </BrutalCard>
          </TabsContent>

          <TabsContent value="requests">
            <UserCreationRequestsList viewMode="admin" onRefresh={() => {}} />
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <UserFormDialog
          isOpen={showUserForm}
          onClose={() => {
            setShowUserForm(false);
            setSelectedUser(null);
          }}
          onSuccess={() => {
            fetchUsers();
            toast.success(selectedUser ? 'Utilisateur modifié' : 'Utilisateur créé');
          }}
          user={selectedUser}
        />

        <UserDetailsDialogFixed
          isOpen={showUserDetails}
          onClose={() => {
            setShowUserDetails(false);
            setSelectedUserId(null);
          }}
          userId={selectedUserId}
        />

        <BulkUserActions
          isOpen={showBulkActions}
          onClose={() => {
            setShowBulkActions(false);
            setSelectedUsers([]);
            setSelectAll(false);
          }}
          onSuccess={() => {
            fetchUsers();
            setSelectedUsers([]);
            setSelectAll(false);
          }}
          selectedUsers={selectedUsers}
        />
      </div>
    </div>
  );
}