import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BrutalButton } from '@/components/ui/brutal-button';
import { BrutalInput } from '@/components/ui/brutal-input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { User, Save, X } from 'lucide-react';

interface UserFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user?: {
    id: string;
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    role: string;
    campus_id?: string;
  } | null;
}

export function UserFormDialog({ isOpen, onClose, onSuccess, user }: UserFormDialogProps) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: 'ENSEIGNANT',
    campus_id: '',
    password: ''
  });
  const [campuses, setCampuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCampuses();
      if (user) {
        setFormData({
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          phone: user.phone || '',
          role: user.role,
          campus_id: user.campus_id || '',
          password: ''
        });
      } else {
        setFormData({
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          role: 'ENSEIGNANT',
          campus_id: '',
          password: ''
        });
      }
    }
  }, [isOpen, user]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (user) {
        // Modification d'utilisateur existant
        const { error } = await supabase
          .from('profiles')
          .update({
            first_name: formData.first_name,
            last_name: formData.last_name,
            email: formData.email,
            phone: formData.phone || null,
            role: formData.role as any,
            campus_id: formData.campus_id || null
          })
          .eq('user_id', user.user_id);

        if (error) throw error;
        toast.success('Utilisateur modifié avec succès');
      } else {
        // Création d'un nouvel utilisateur via fonction backend sécurisée
        if (!formData.password) {
          toast.error('Le mot de passe est obligatoire pour un nouvel utilisateur');
          return;
        }

        const { data, error } = await supabase.functions.invoke('create-user', {
          body: {
            first_name: formData.first_name,
            last_name: formData.last_name,
            email: formData.email,
            phone: formData.phone,
            role: formData.role,
            campus_id: formData.campus_id,
            password: formData.password
          }
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Erreur lors de la création');

        toast.success('Utilisateur créé avec succès');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {user ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">Prénom *</Label>
              <BrutalInput
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Nom *</Label>
              <BrutalInput
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <BrutalInput
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <BrutalInput
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          {!user && (
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe *</Label>
              <BrutalInput
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role">Rôle *</Label>
              <select
                id="role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="input-brutal w-full"
                required
              >
                <option value="ENSEIGNANT">Enseignant</option>
                <option value="DIRECTEUR_CAMPUS">Directeur Campus</option>
                <option value="COMPTABLE">Comptable</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="campus_id">Campus</Label>
              <select
                id="campus_id"
                value={formData.campus_id}
                onChange={(e) => setFormData({ ...formData, campus_id: e.target.value })}
                className="input-brutal w-full"
              >
                <option value="">Aucun campus</option>
                {campuses.map((campus) => (
                  <option key={campus.id} value={campus.id}>
                    {campus.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <BrutalButton type="button" variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Annuler
            </BrutalButton>
            <BrutalButton type="submit" disabled={loading}>
              {loading ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                  {user ? 'Modification...' : 'Création...'}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {user ? 'Modifier' : 'Créer'}
                </>
              )}
            </BrutalButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}