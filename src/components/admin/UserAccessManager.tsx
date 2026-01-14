import React, { useState } from 'react';
import { BrutalCard, BrutalCardContent, BrutalCardHeader, BrutalCardTitle } from '@/components/ui/brutal-card';
import { BrutalButton } from '@/components/ui/brutal-button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Key, 
  Download, 
  RefreshCcw, 
  Mail,
  Users,
  FileSpreadsheet,
  Send,
  AlertTriangle,
  CheckCircle,
  Copy
} from 'lucide-react';

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

interface UserAccessManagerProps {
  users: User[];
  onRefresh?: () => void;
}

interface AccessInfo {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  campus: string;
  temporary_password?: string;
  reset_date?: string;
  login_url: string;
}

export function UserAccessManager({ users, onRefresh }: UserAccessManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetResults, setResetResults] = useState<AccessInfo[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedUserType, setSelectedUserType] = useState<'all' | 'new' | 'teachers'>('new');

  const getFilteredUsers = () => {
    switch (selectedUserType) {
      case 'new':
        return users.filter(u => u.is_new_teacher === true);
      case 'teachers':
        return users.filter(u => u.role === 'ENSEIGNANT');
      default:
        return users;
    }
  };

  const resetPasswords = async () => {
    setLoading(true);
    const filteredUsers = getFilteredUsers();
    
    try {
      const { data, error } = await supabase.functions.invoke('reset-user-passwords', {
        body: {
          user_ids: filteredUsers.map(u => u.user_id),
          reset_type: selectedUserType
        }
      });

      if (error) throw error;

      setResetResults(data?.results || []);
      setShowResults(true);
      
      toast.success(`${data?.success_count || 0} mots de passe réinitialisés`);
      
      if (onRefresh) onRefresh();
    } catch (error: any) {
      console.error('Erreur lors de la réinitialisation:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const exportAccessInfo = () => {
    if (resetResults.length === 0) return;

    const csvContent = [
      'Prénom,Nom,Email,Campus,Mot de passe temporaire,Date de réinitialisation,URL de connexion',
      ...resetResults.map(user => 
        `"${user.first_name}","${user.last_name}","${user.email}","${user.campus}","${user.temporary_password}","${user.reset_date}","${user.login_url}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `accès-utilisateurs-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copié dans le presse-papiers');
  };

  const sendAccessByEmail = async () => {
    if (resetResults.length === 0) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('send-access-emails', {
        body: {
          access_info: resetResults
        }
      });

      if (error) throw error;
      
      toast.success('Emails d\'accès envoyés avec succès');
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi des emails:', error);
      toast.error(`Erreur envoi emails: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = getFilteredUsers();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <BrutalButton variant="outline" className="flex items-center">
          <Key className="h-4 w-4 mr-2" />
          Gestion des Accès
        </BrutalButton>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Key className="h-5 w-5 mr-2" />
            Gestion des Accès Utilisateurs
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!showResults ? (
            // Configuration de la réinitialisation
            <>
              <BrutalCard>
                <BrutalCardHeader>
                  <BrutalCardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Sélection des Utilisateurs
                  </BrutalCardTitle>
                </BrutalCardHeader>
                <BrutalCardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div 
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                          selectedUserType === 'new' 
                            ? 'border-brand-aurlom bg-brand-aurlom/10' 
                            : 'border-border-light hover:border-brand-aurlom/50'
                        }`}
                        onClick={() => setSelectedUserType('new')}
                      >
                        <h4 className="font-medium">Nouveaux Enseignants</h4>
                        <p className="text-sm text-muted-foreground">
                          {users.filter(u => u.is_new_teacher === true).length} utilisateurs
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Professeurs nouvellement importés
                        </p>
                      </div>

                      <div 
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                          selectedUserType === 'teachers' 
                            ? 'border-brand-education bg-brand-education/10' 
                            : 'border-border-light hover:border-brand-education/50'
                        }`}
                        onClick={() => setSelectedUserType('teachers')}
                      >
                        <h4 className="font-medium">Tous les Enseignants</h4>
                        <p className="text-sm text-muted-foreground">
                          {users.filter(u => u.role === 'ENSEIGNANT').length} utilisateurs
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Tous les comptes enseignants
                        </p>
                      </div>

                      <div 
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                          selectedUserType === 'all' 
                            ? 'border-brand-success bg-brand-success/10' 
                            : 'border-border-light hover:border-brand-success/50'
                        }`}
                        onClick={() => setSelectedUserType('all')}
                      >
                        <h4 className="font-medium">Tous les Utilisateurs</h4>
                        <p className="text-sm text-muted-foreground">
                          {users.length} utilisateurs
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Tous les comptes du système
                        </p>
                      </div>
                    </div>

                    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-yellow-800">Information importante</h4>
                          <p className="text-sm text-yellow-700 mt-1">
                            La réinitialisation génèrera de nouveaux mots de passe temporaires pour {filteredUsers.length} utilisateur(s).
                            Les anciens mots de passe ne fonctionneront plus.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </BrutalCardContent>
              </BrutalCard>

              <div className="flex justify-between">
                <BrutalButton variant="outline" onClick={() => setIsOpen(false)}>
                  Annuler
                </BrutalButton>
                <BrutalButton 
                  onClick={resetPasswords}
                  disabled={loading || filteredUsers.length === 0}
                  variant="warning"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                      Réinitialisation...
                    </>
                  ) : (
                    <>
                      <RefreshCcw className="h-4 w-4 mr-2" />
                      Réinitialiser {filteredUsers.length} mot(s) de passe
                    </>
                  )}
                </BrutalButton>
              </div>
            </>
          ) : (
            // Résultats de la réinitialisation
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <h3 className="text-lg font-medium">Réinitialisation Terminée</h3>
                </div>
                <Badge variant="outline">
                  {resetResults.length} utilisateur(s)
                </Badge>
              </div>

              <div className="flex space-x-3">
                <BrutalButton variant="success" onClick={exportAccessInfo}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Exporter CSV
                </BrutalButton>
                <BrutalButton variant="outline" onClick={sendAccessByEmail} disabled={loading}>
                  {loading ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full"></div>
                      Envoi...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Envoyer par Email
                    </>
                  )}
                </BrutalButton>
              </div>

              <BrutalCard>
                <BrutalCardHeader>
                  <BrutalCardTitle>Informations de Connexion</BrutalCardTitle>
                </BrutalCardHeader>
                <BrutalCardContent>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {resetResults.map((user, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="font-medium">{user.first_name} {user.last_name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                            <p className="text-xs text-muted-foreground">{user.campus}</p>
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                                {user.temporary_password}
                              </code>
                              <BrutalButton 
                                size="sm" 
                                variant="ghost"
                                onClick={() => copyToClipboard(user.temporary_password!)}
                              >
                                <Copy className="h-3 w-3" />
                              </BrutalButton>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Réinitialisé le {user.reset_date}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </BrutalCardContent>
              </BrutalCard>

              <div className="flex justify-between">
                <BrutalButton variant="outline" onClick={() => { setShowResults(false); setResetResults([]); }}>
                  Nouvelle Réinitialisation
                </BrutalButton>
                <BrutalButton onClick={() => setIsOpen(false)}>
                  Fermer
                </BrutalButton>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}