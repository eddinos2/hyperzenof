import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { BrutalCard, BrutalCardHeader, BrutalCardTitle, BrutalCardContent } from '@/components/ui/brutal-card';
import { BrutalButton } from '@/components/ui/brutal-button';
import { BrutalInput } from '@/components/ui/brutal-input';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Search, Users, MapPin, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Class {
  id: string;
  group_code: string;
  label: string;
  year: number;
  is_active: boolean;
  campus_id: string;
  filiere_id: string;
  created_at: string;
  campus?: {
    name: string;
  };
  filiere?: {
    label: string;
    code: string;
  };
}

interface Campus {
  id: string;
  name: string;
}

interface Filiere {
  id: string;
  label: string;
  code: string;
}

export default function ClassManagement() {
  const { profile } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [filieres, setFilieres] = useState<Filiere[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    group_code: '',
    label: '',
    year: new Date().getFullYear(),
    campus_id: '',
    filiere_id: '',
    is_active: true
  });

  useEffect(() => {
    if (profile?.role === 'SUPER_ADMIN' || profile?.role === 'DIRECTEUR_CAMPUS') {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch classes with campus and filiere info
      let query = supabase
        .from('class')
        .select(`
          *,
          campus:campus_id(name),
          filiere:filiere_id(label, code)
        `)
        .order('label');

      // Filter by campus for directeur_campus
      if (profile?.role === 'DIRECTEUR_CAMPUS' && profile.campus_id) {
        query = query.eq('campus_id', profile.campus_id);
      }

      const { data: classesData, error: classesError } = await query;
      if (classesError) throw classesError;

      setClasses(classesData || []);

      // Fetch campuses for form
      let campusQuery = supabase
        .from('campus')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (profile?.role === 'DIRECTEUR_CAMPUS' && profile.campus_id) {
        campusQuery = campusQuery.eq('id', profile.campus_id);
      }

      const { data: campusesData, error: campusesError } = await campusQuery;
      if (campusesError) throw campusesError;
      setCampuses(campusesData || []);

      // Fetch filieres for form
      const { data: filieresData, error: filieresError } = await supabase
        .from('filiere')
        .select('id, label, code')
        .eq('is_active', true)
        .order('label');

      if (filieresError) throw filieresError;
      setFilieres(filieresData || []);

    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClass = async () => {
    try {
      if (editingClass) {
        // Update existing class
        const { error } = await supabase
          .from('class')
          .update(formData)
          .eq('id', editingClass.id);

        if (error) throw error;
        toast.success('Classe mise à jour avec succès');
      } else {
        // Create new class
        const { error } = await supabase
          .from('class')
          .insert([formData]);

        if (error) throw error;
        toast.success('Classe créée avec succès');
      }

      setIsDialogOpen(false);
      setEditingClass(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette classe ?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('class')
        .delete()
        .eq('id', classId);

      if (error) throw error;
      toast.success('Classe supprimée avec succès');
      fetchData();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleEditClass = (classItem: Class) => {
    setEditingClass(classItem);
    setFormData({
      group_code: classItem.group_code,
      label: classItem.label,
      year: classItem.year,
      campus_id: classItem.campus_id,
      filiere_id: classItem.filiere_id,
      is_active: classItem.is_active
    });
    setIsDialogOpen(true);
  };

  const handleNewClass = () => {
    setEditingClass(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      group_code: '',
      label: '',
      year: new Date().getFullYear(),
      campus_id: profile?.campus_id || '',
      filiere_id: '',
      is_active: true
    });
  };

  const filteredClasses = classes.filter(classItem =>
    classItem.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    classItem.group_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    classItem.campus?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    classItem.filiere?.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (profile?.role !== 'SUPER_ADMIN' && profile?.role !== 'DIRECTEUR_CAMPUS') {
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
        <div className="text-center">Chargement des classes...</div>
      </div>
    );
  }

  return (
    <div className="container-brutal py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Gestion des Classes</h1>
        <p className="text-muted-foreground">
          Gérez les classes et leurs affectations aux campus et filières
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <BrutalCard>
          <BrutalCardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Classes</p>
                <p className="text-2xl font-bold">{classes.length}</p>
              </div>
              <Users className="h-8 w-8 text-brand-aurlom" />
            </div>
          </BrutalCardContent>
        </BrutalCard>

        <BrutalCard>
          <BrutalCardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Classes Actives</p>
                <p className="text-2xl font-bold text-green-600">
                  {classes.filter(c => c.is_active).length}
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
                <p className="text-sm font-medium text-muted-foreground">Année Courante</p>
                <p className="text-2xl font-bold">
                  {classes.filter(c => c.year === new Date().getFullYear()).length}
                </p>
              </div>
              <div className="text-sm text-muted-foreground">{new Date().getFullYear()}</div>
            </div>
          </BrutalCardContent>
        </BrutalCard>

        <BrutalCard>
          <BrutalCardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Campus</p>
                <p className="text-2xl font-bold">{campuses.length}</p>
              </div>
              <MapPin className="h-6 w-6 text-muted-foreground" />
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
              placeholder="Rechercher une classe..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <BrutalButton onClick={handleNewClass}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle Classe
            </BrutalButton>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingClass ? 'Modifier la classe' : 'Nouvelle classe'}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="group_code" className="text-right">Code</Label>
                <BrutalInput
                  id="group_code"
                  value={formData.group_code}
                  onChange={(e) => setFormData({...formData, group_code: e.target.value})}
                  className="col-span-3"
                  placeholder="Ex: INFO1A"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="label" className="text-right">Libellé</Label>
                <BrutalInput
                  id="label"
                  value={formData.label}
                  onChange={(e) => setFormData({...formData, label: e.target.value})}
                  className="col-span-3"
                  placeholder="Ex: Informatique 1ère Année A"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="year" className="text-right">Année</Label>
                <BrutalInput
                  id="year"
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({...formData, year: parseInt(e.target.value)})}
                  className="col-span-3"
                  min={new Date().getFullYear() - 5}
                  max={new Date().getFullYear() + 5}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="campus_id" className="text-right">Campus</Label>
                <Select
                  value={formData.campus_id}
                  onValueChange={(value) => setFormData({...formData, campus_id: value})}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Sélectionner un campus" />
                  </SelectTrigger>
                  <SelectContent>
                    {campuses.map((campus) => (
                      <SelectItem key={campus.id} value={campus.id}>
                        {campus.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="filiere_id" className="text-right">Filière</Label>
                <Select
                  value={formData.filiere_id}
                  onValueChange={(value) => setFormData({...formData, filiere_id: value})}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Sélectionner une filière" />
                  </SelectTrigger>
                  <SelectContent>
                    {filieres.map((filiere) => (
                      <SelectItem key={filiere.id} value={filiere.id}>
                        {filiere.label} ({filiere.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                />
                <Label htmlFor="is_active">Classe active</Label>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <BrutalButton variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </BrutalButton>
              <BrutalButton onClick={handleSaveClass}>
                {editingClass ? 'Modifier' : 'Créer'}
              </BrutalButton>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Classes List */}
      <div className="grid gap-4">
        {filteredClasses.length === 0 ? (
          <BrutalCard>
            <BrutalCardContent className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchTerm ? 'Aucune classe trouvée' : 'Aucune classe'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm 
                  ? 'Essayez de modifier votre recherche'
                  : 'Commencez par créer votre première classe'
                }
              </p>
              {!searchTerm && (
                <BrutalButton onClick={handleNewClass}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer une classe
                </BrutalButton>
              )}
            </BrutalCardContent>
          </BrutalCard>
        ) : (
          filteredClasses.map((classItem) => (
            <BrutalCard key={classItem.id}>
              <BrutalCardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{classItem.label}</h3>
                      <Badge variant="outline" className="text-xs">
                        {classItem.group_code}
                      </Badge>
                      <Badge
                        variant={classItem.is_active ? "default" : "secondary"}
                        className={classItem.is_active ? "bg-green-100 text-green-800" : ""}
                      >
                        {classItem.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {classItem.campus?.name}
                      </div>
                      <div className="flex items-center gap-1">
                        <BookOpen className="h-4 w-4" />
                        {classItem.filiere?.label} ({classItem.filiere?.code})
                      </div>
                      <span>Année {classItem.year}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <BrutalButton
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditClass(classItem)}
                    >
                      <Pencil className="h-4 w-4" />
                    </BrutalButton>
                    <BrutalButton
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteClass(classItem.id)}
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