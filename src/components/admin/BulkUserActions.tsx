import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BrutalButton } from '@/components/ui/brutal-button';
import { BrutalInput } from '@/components/ui/brutal-input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Building, 
  Mail, 
  Settings,
  Download,
  Save
} from 'lucide-react';

interface BulkUserActionsProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedUsers: string[];
}

export function BulkUserActions({ isOpen, onClose, onSuccess, selectedUsers }: BulkUserActionsProps) {
  const [loading, setLoading] = useState(false);
  const [actionType, setActionType] = useState<'activate' | 'deactivate' | 'change_campus' | 'export'>('activate');
  const [newCampusId, setNewCampusId] = useState('');
  const [campuses, setCampuses] = useState<any[]>([]);

  React.useEffect(() => {
    if (isOpen) {
      fetchCampuses();
    }
  }, [isOpen]);

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

  const handleBulkAction = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Aucun utilisateur sélectionné');
      return;
    }

    setLoading(true);

    try {
      switch (actionType) {
        case 'activate':
          await supabase
            .from('profiles')
            .update({ is_active: true })
            .in('user_id', selectedUsers);
          toast.success(`${selectedUsers.length} utilisateurs activés`);
          break;

        case 'deactivate':
          await supabase
            .from('profiles')
            .update({ is_active: false })
            .in('user_id', selectedUsers);
          toast.success(`${selectedUsers.length} utilisateurs désactivés`);
          break;

        case 'change_campus':
          if (!newCampusId) {
            toast.error('Veuillez sélectionner un campus');
            return;
          }
          await supabase
            .from('profiles')
            .update({ campus_id: newCampusId })
            .in('user_id', selectedUsers);
          toast.success(`${selectedUsers.length} utilisateurs assignés au nouveau campus`);
          break;

        case 'export':
          await exportUsers();
          break;
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erreur lors de l\'action en masse:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const exportUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          first_name,
          last_name,
          email,
          phone,
          role,
          is_active,
          hire_date,
          campus (name)
        `)
        .in('user_id', selectedUsers);

      if (error) throw error;

      // Créer le CSV
      const headers = ['Prénom', 'Nom', 'Email', 'Téléphone', 'Rôle', 'Actif', 'Date embauche', 'Campus'];
      const csvContent = [
        headers.join(','),
        ...data.map(user => [
          user.first_name,
          user.last_name,
          user.email,
          user.phone || '',
          user.role,
          user.is_active ? 'Oui' : 'Non',
          user.hire_date || '',
          user.campus?.name || ''
        ].map(field => `"${field}"`).join(','))
      ].join('\n');

      // Télécharger le fichier
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `utilisateurs_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Export CSV téléchargé');
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      toast.error('Erreur lors de l\'export');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Actions en masse ({selectedUsers.length} utilisateurs)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3">
            <Label>Action à effectuer</Label>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="activate"
                  checked={actionType === 'activate'}
                  onCheckedChange={() => setActionType('activate')}
                />
                <Label htmlFor="activate" className="flex items-center">
                  <UserCheck className="h-4 w-4 mr-2 text-green-600" />
                  Activer tous les utilisateurs
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="deactivate"
                  checked={actionType === 'deactivate'}
                  onCheckedChange={() => setActionType('deactivate')}
                />
                <Label htmlFor="deactivate" className="flex items-center">
                  <UserX className="h-4 w-4 mr-2 text-red-600" />
                  Désactiver tous les utilisateurs
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="change_campus"
                  checked={actionType === 'change_campus'}
                  onCheckedChange={() => setActionType('change_campus')}
                />
                <Label htmlFor="change_campus" className="flex items-center">
                  <Building className="h-4 w-4 mr-2 text-brand-aurlom" />
                  Changer le campus
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="export"
                  checked={actionType === 'export'}
                  onCheckedChange={() => setActionType('export')}
                />
                <Label htmlFor="export" className="flex items-center">
                  <Download className="h-4 w-4 mr-2 text-purple-600" />
                  Exporter en CSV
                </Label>
              </div>
            </div>
          </div>

          {actionType === 'change_campus' && (
            <div className="space-y-2">
              <Label htmlFor="campus">Nouveau campus</Label>
              <select
                id="campus"
                value={newCampusId}
                onChange={(e) => setNewCampusId(e.target.value)}
                className="input-brutal w-full"
              >
                <option value="">Sélectionner un campus</option>
                {campuses.map((campus) => (
                  <option key={campus.id} value={campus.id}>
                    {campus.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              <strong>Attention :</strong> Cette action affectera {selectedUsers.length} utilisateur(s).
              {actionType === 'deactivate' && ' Les utilisateurs désactivés ne pourront plus se connecter.'}
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <BrutalButton variant="outline" onClick={onClose}>
            Annuler
          </BrutalButton>
          <BrutalButton 
            onClick={handleBulkAction} 
            disabled={loading}
            variant={actionType === 'deactivate' ? 'destructive' : 'default'}
          >
            {loading ? (
              <>
                <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                Traitement...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Exécuter l'action
              </>
            )}
          </BrutalButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}