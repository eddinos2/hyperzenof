import React, { useEffect, useState } from 'react';
import { BrutalCard, BrutalCardContent, BrutalCardHeader, BrutalCardTitle } from '@/components/ui/brutal-card';
import { BrutalButton } from '@/components/ui/brutal-button';
import { BrutalInput } from '@/components/ui/brutal-input';
import { CatLoader } from '@/components/ui/cat-loader';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { 
  Building,
  Plus,
  Edit,
  Users,
  GraduationCap,
  MapPin,
  Settings,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface Campus {
  id: string;
  name: string;
  address: string;
  is_active: boolean;
  created_at: string;
  teacher_count?: number;
  filiere_count?: number;
}

export default function CampusManagement() {
  const { profile } = useAuth();
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [selectedCampus, setSelectedCampus] = useState<Campus | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: ''
  });

  useEffect(() => {
    if (profile?.role === 'SUPER_ADMIN') {
      fetchCampuses();
    }
  }, [profile]);

  const fetchCampuses = async () => {
    try {
      // Récupérer les campus avec statistiques
      const { data: campusData, error } = await supabase
        .from('campus')
        .select('*')
        .order('name');

      if (error) throw error;

      // Compter les enseignants par campus
      const { data: teacherCounts } = await supabase
        .from('profiles')
        .select('campus_id')
        .eq('role', 'ENSEIGNANT')
        .eq('is_active', true);

      // Compter les filières par campus
      const { data: filiereCounts } = await supabase
        .from('campus_filiere')
        .select('campus_id');

      const teacherCountMap = teacherCounts?.reduce((acc, teacher) => {
        if (teacher.campus_id) {
          acc[teacher.campus_id] = (acc[teacher.campus_id] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>) || {};

      const filiereCountMap = filiereCounts?.reduce((acc, cf) => {
        acc[cf.campus_id] = (acc[cf.campus_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const enrichedCampuses = campusData?.map(campus => ({
        ...campus,
        teacher_count: teacherCountMap[campus.id] || 0,
        filiere_count: filiereCountMap[campus.id] || 0
      })) || [];

      setCampuses(enrichedCampuses);
    } catch (error) {
      console.error('Erreur lors du chargement des campus:', error);
      toast.error('Erreur lors du chargement des campus');
    } finally {
      setLoading(false);
    }
  };

  const handleEditCampus = (campus: Campus) => {
    setSelectedCampus(campus);
    setFormData({
      name: campus.name,
      address: campus.address
    });
    setShowEditDialog(true);
  };

  const handleSettingsCampus = (campus: Campus) => {
    setSelectedCampus(campus);
    setShowSettingsDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedCampus) return;
    
    try {
      const { error } = await supabase
        .from('campus')
        .update({
          name: formData.name,
          address: formData.address
        })
        .eq('id', selectedCampus.id);

      if (error) throw error;
      
      toast.success('Campus modifié avec succès');
      setShowEditDialog(false);
      setSelectedCampus(null);
      fetchCampuses();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la modification');
    }
  };

  const handleToggleActive = async (campusId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('campus')
        .update({ is_active: !currentStatus })
        .eq('id', campusId);

      if (error) throw error;
      
      toast.success(`Campus ${!currentStatus ? 'activé' : 'désactivé'}`);
      fetchCampuses();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la modification');
    }
  };

  if (profile?.role !== 'SUPER_ADMIN') {
    return (
      <div className="container-brutal py-8">
        <BrutalCard>
          <BrutalCardContent className="text-center py-8">
            <p className="text-muted-foreground">
              Accès réservé aux Super Administrateurs
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
          <CatLoader message="Chargement des campus..." size="lg" />
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
            <h1 className="text-4xl font-bold">Gestion des Campus</h1>
            <p className="text-lg text-muted-foreground mt-2">
              Administration des sites Aurlom et assignations
            </p>
          </div>
          <div className="flex space-x-4">
            <BrutalButton variant="success">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau Campus
            </BrutalButton>
          </div>
        </div>

        {/* Statistiques globales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <BrutalCard>
            <BrutalCardContent className="p-6 text-center">
              <Building className="h-12 w-12 text-brand-aurlom mx-auto mb-4" />
              <p className="text-3xl font-bold mb-2">{campuses.length}</p>
              <p className="text-sm text-muted-foreground">Campus Total</p>
            </BrutalCardContent>
          </BrutalCard>

          <BrutalCard>
            <BrutalCardContent className="p-6 text-center">
              <Users className="h-12 w-12 text-brand-education mx-auto mb-4" />
              <p className="text-3xl font-bold mb-2">
                {campuses.reduce((sum, c) => sum + (c.teacher_count || 0), 0)}
              </p>
              <p className="text-sm text-muted-foreground">Enseignants Total</p>
            </BrutalCardContent>
          </BrutalCard>

          <BrutalCard>
            <BrutalCardContent className="p-6 text-center">
              <GraduationCap className="h-12 w-12 text-brand-success mx-auto mb-4" />
              <p className="text-3xl font-bold mb-2">
                {campuses.reduce((sum, c) => sum + (c.filiere_count || 0), 0)}
              </p>
              <p className="text-sm text-muted-foreground">Formations Assignées</p>
            </BrutalCardContent>
          </BrutalCard>
        </div>

        {/* Liste des campus */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {campuses.map((campus) => (
            <BrutalCard key={campus.id}>
              <BrutalCardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-lg border-2 border-foreground text-white ${
                      campus.is_active ? 'bg-brand-success' : 'bg-gray-400'
                    }`}>
                      <Building className="h-5 w-5" />
                    </div>
                    <div>
                      <BrutalCardTitle className="text-xl">{campus.name}</BrutalCardTitle>
                      <div className="flex items-center mt-1">
                        {campus.is_active ? (
                          <CheckCircle className="h-4 w-4 text-brand-success mr-1" />
                        ) : (
                          <XCircle className="h-4 w-4 text-brand-error mr-1" />
                        )}
                        <span className="text-sm text-muted-foreground">
                          {campus.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </BrutalCardHeader>

              <BrutalCardContent className="space-y-4">
                <div className="flex items-start">
                  <MapPin className="h-4 w-4 text-muted-foreground mr-2 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">{campus.address}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 border-2 border-border-light rounded-lg">
                    <p className="text-lg font-bold text-brand-education">{campus.teacher_count}</p>
                    <p className="text-xs text-muted-foreground">Enseignants</p>
                  </div>
                  
                  <div className="text-center p-3 border-2 border-border-light rounded-lg">
                    <p className="text-lg font-bold text-brand-aurlom">{campus.filiere_count}</p>
                    <p className="text-xs text-muted-foreground">Filières</p>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <BrutalButton
                    size="sm"
                    variant={campus.is_active ? "outline" : "success"}
                    onClick={() => handleToggleActive(campus.id, campus.is_active)}
                    className="flex-1"
                  >
                    {campus.is_active ? 'Désactiver' : 'Activer'}
                  </BrutalButton>
                  
                  <BrutalButton 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleEditCampus(campus)}
                  >
                    <Edit className="h-4 w-4" />
                  </BrutalButton>
                  
                  <BrutalButton 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleSettingsCampus(campus)}
                  >
                    <Settings className="h-4 w-4" />
                  </BrutalButton>
                </div>
              </BrutalCardContent>
            </BrutalCard>
          ))}
        </div>

        {campuses.length === 0 && (
          <BrutalCard>
            <BrutalCardContent className="text-center py-12">
              <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucun campus configuré</h3>
              <p className="text-muted-foreground mb-6">
                Commencez par créer votre premier campus.
              </p>
              <BrutalButton variant="success">
                <Plus className="h-4 w-4 mr-2" />
                Créer le premier campus
              </BrutalButton>
            </BrutalCardContent>
          </BrutalCard>
        )}
        
        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier le Campus</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Nom du Campus</Label>
                <BrutalInput
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nom du campus"
                />
              </div>
              <div>
                <Label htmlFor="edit-address">Adresse</Label>
                <Textarea
                  id="edit-address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Adresse complète"
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <BrutalButton variant="outline" onClick={() => setShowEditDialog(false)}>
                  Annuler
                </BrutalButton>
                <BrutalButton onClick={handleSaveEdit}>
                  Sauvegarder
                </BrutalButton>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Settings Dialog */}
        <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Paramètres du Campus</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedCampus && (
                <>
                  <div className="p-4 border-2 border-border-light rounded-lg">
                    <h4 className="font-medium mb-2">Informations Générales</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>ID:</strong> {selectedCampus.id}</div>
                      <div><strong>Nom:</strong> {selectedCampus.name}</div>
                      <div><strong>Adresse:</strong> {selectedCampus.address}</div>
                      <div><strong>Status:</strong> {selectedCampus.is_active ? 'Actif' : 'Inactif'}</div>
                      <div><strong>Créé le:</strong> {new Date(selectedCampus.created_at).toLocaleDateString('fr-FR')}</div>
                    </div>
                  </div>
                  
                  <div className="p-4 border-2 border-border-light rounded-lg">
                    <h4 className="font-medium mb-2">Statistiques</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-brand-education">{selectedCampus.teacher_count || 0}</div>
                        <div className="text-muted-foreground">Enseignants</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-brand-aurlom">{selectedCampus.filiere_count || 0}</div>
                        <div className="text-muted-foreground">Filières</div>
                      </div>
                    </div>
                  </div>
                </>
              )}
              <div className="flex justify-end">
                <BrutalButton variant="outline" onClick={() => setShowSettingsDialog(false)}>
                  Fermer
                </BrutalButton>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}