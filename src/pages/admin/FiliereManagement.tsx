import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { BrutalCard, BrutalCardHeader, BrutalCardTitle, BrutalCardContent } from '@/components/ui/brutal-card';
import { BrutalButton } from '@/components/ui/brutal-button';
import { BrutalInput } from '@/components/ui/brutal-input';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Search, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface Filiere {
  id: string;
  code: string;
  label: string;
  pole: string;
  is_active: boolean;
  created_at: string;
  class_count?: number;
  campus_count?: number;
}

export default function FiliereManagement() {
  const { profile } = useAuth();
  const [filieres, setFilieres] = useState<Filiere[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingFiliere, setEditingFiliere] = useState<Filiere | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    label: '',
    pole: '',
    is_active: true
  });

  useEffect(() => {
    if (profile?.role === 'SUPER_ADMIN') {
      fetchFilieres();
    }
  }, [profile]);

  const fetchFilieres = async () => {
    try {
      setLoading(true);
      
      // Fetch filieres with counts
      const { data: filieresData, error: filieresError } = await supabase
        .from('filiere')
        .select('*')
        .order('label');

      if (filieresError) throw filieresError;

      // Get class counts for each filiere
      const filieresWithCounts = await Promise.all(
        filieresData.map(async (filiere) => {
          const { count: classCount } = await supabase
            .from('class')
            .select('*', { count: 'exact', head: true })
            .eq('filiere_id', filiere.id);

          const { count: campusCount } = await supabase
            .from('campus_filiere')
            .select('*', { count: 'exact', head: true })
            .eq('filiere_id', filiere.id);

          return {
            ...filiere,
            class_count: classCount || 0,
            campus_count: campusCount || 0
          };
        })
      );

      setFilieres(filieresWithCounts);
    } catch (error) {
      console.error('Erreur lors du chargement des filières:', error);
      toast.error('Erreur lors du chargement des filières');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFiliere = async () => {
    try {
      if (editingFiliere) {
        // Update existing filiere
        const { error } = await supabase
          .from('filiere')
          .update(formData)
          .eq('id', editingFiliere.id);

        if (error) throw error;
        toast.success('Filière mise à jour avec succès');
      } else {
        // Create new filiere
        const { error } = await supabase
          .from('filiere')
          .insert([formData]);

        if (error) throw error;
        toast.success('Filière créée avec succès');
      }

      setIsDialogOpen(false);
      setEditingFiliere(null);
      setFormData({ code: '', label: '', pole: '', is_active: true });
      fetchFilieres();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleDeleteFiliere = async (filiereId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette filière ?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('filiere')
        .delete()
        .eq('id', filiereId);

      if (error) throw error;
      toast.success('Filière supprimée avec succès');
      fetchFilieres();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleEditFiliere = (filiere: Filiere) => {
    setEditingFiliere(filiere);
    setFormData({
      code: filiere.code,
      label: filiere.label,
      pole: filiere.pole,
      is_active: filiere.is_active
    });
    setIsDialogOpen(true);
  };

  const handleNewFiliere = () => {
    setEditingFiliere(null);
    setFormData({ code: '', label: '', pole: '', is_active: true });
    setIsDialogOpen(true);
  };

  const filteredFilieres = filieres.filter(filiere =>
    filiere.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    filiere.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    filiere.pole.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (profile?.role !== 'SUPER_ADMIN') {
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
        <div className="text-center">Chargement des filières...</div>
      </div>
    );
  }

  return (
    <div className="container-brutal py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Gestion des Filières</h1>
        <p className="text-muted-foreground">
          Gérez les filières de formation et leurs programmes
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <BrutalCard>
          <BrutalCardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Filières</p>
                <p className="text-2xl font-bold">{filieres.length}</p>
              </div>
              <BookOpen className="h-8 w-8 text-brand-aurlom" />
            </div>
          </BrutalCardContent>
        </BrutalCard>

        <BrutalCard>
          <BrutalCardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Filières Actives</p>
                <p className="text-2xl font-bold text-green-600">
                  {filieres.filter(f => f.is_active).length}
                </p>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-800">Actives</Badge>
            </div>
          </BrutalCardContent>
        </BrutalCard>

        <BrutalCard>
          <BrutalCardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Classes</p>
                <p className="text-2xl font-bold">
                  {filieres.reduce((sum, f) => sum + (f.class_count || 0), 0)}
                </p>
              </div>
              <div className="text-sm text-muted-foreground">Classes</div>
            </div>
          </BrutalCardContent>
        </BrutalCard>

        <BrutalCard>
          <BrutalCardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Campus Associés</p>
                <p className="text-2xl font-bold">
                  {filieres.reduce((sum, f) => sum + (f.campus_count || 0), 0)}
                </p>
              </div>
              <div className="text-sm text-muted-foreground">Liaisons</div>
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
              placeholder="Rechercher une filière..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <BrutalButton onClick={handleNewFiliere}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle Filière
            </BrutalButton>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingFiliere ? 'Modifier la filière' : 'Nouvelle filière'}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="code" className="text-right">Code</Label>
                <BrutalInput
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value})}
                  className="col-span-3"
                  placeholder="Ex: INFO"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="label" className="text-right">Libellé</Label>
                <BrutalInput
                  id="label"
                  value={formData.label}
                  onChange={(e) => setFormData({...formData, label: e.target.value})}
                  className="col-span-3"
                  placeholder="Ex: Informatique"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="pole" className="text-right">Pôle</Label>
                <BrutalInput
                  id="pole"
                  value={formData.pole}
                  onChange={(e) => setFormData({...formData, pole: e.target.value})}
                  className="col-span-3"
                  placeholder="Ex: Sciences & Technologies"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                />
                <Label htmlFor="is_active">Filière active</Label>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <BrutalButton variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </BrutalButton>
              <BrutalButton onClick={handleSaveFiliere}>
                {editingFiliere ? 'Modifier' : 'Créer'}
              </BrutalButton>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filieres List */}
      <div className="grid gap-4">
        {filteredFilieres.length === 0 ? (
          <BrutalCard>
            <BrutalCardContent className="p-8 text-center">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchTerm ? 'Aucune filière trouvée' : 'Aucune filière'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm 
                  ? 'Essayez de modifier votre recherche'
                  : 'Commencez par créer votre première filière'
                }
              </p>
              {!searchTerm && (
                <BrutalButton onClick={handleNewFiliere}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer une filière
                </BrutalButton>
              )}
            </BrutalCardContent>
          </BrutalCard>
        ) : (
          filteredFilieres.map((filiere) => (
            <BrutalCard key={filiere.id}>
              <BrutalCardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{filiere.label}</h3>
                      <Badge variant="outline" className="text-xs">
                        {filiere.code}
                      </Badge>
                      <Badge
                        variant={filiere.is_active ? "default" : "secondary"}
                        className={filiere.is_active ? "bg-green-100 text-green-800" : ""}
                      >
                        {filiere.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mb-3">{filiere.pole}</p>
                    <div className="flex gap-4 text-sm">
                      <span className="text-muted-foreground">
                        {filiere.class_count || 0} classe(s)
                      </span>
                      <span className="text-muted-foreground">
                        {filiere.campus_count || 0} campus associé(s)
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <BrutalButton
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditFiliere(filiere)}
                    >
                      <Pencil className="h-4 w-4" />
                    </BrutalButton>
                    <BrutalButton
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteFiliere(filiere.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </BrutalButton>
                  </div>
                </div>
              </BrutalCardContent>
            </BrutalCard>
          ))
        )}
      </div>
    </div>
  );
}