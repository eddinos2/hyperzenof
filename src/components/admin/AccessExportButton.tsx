import React, { useState } from 'react';
import { BrutalButton } from '@/components/ui/brutal-button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Download, FileSpreadsheet, Key, RefreshCcw } from 'lucide-react';

export function AccessExportButton() {
  const [isExporting, setIsExporting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const exportAccessCredentials = async () => {
    setIsExporting(true);
    
    try {
      // Récupérer TOUS les credentials temporaires (pas seulement les non-exportés)
      const { data: credentials, error } = await supabase
        .from('temp_access_credentials')
        .select(`
          email,
          temp_password,
          created_at,
          user_id,
          exported_at
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      if (!credentials || credentials.length === 0) {
        toast.info('Aucun compte avec mot de passe temporaire trouvé');
        return;
      }

      // Récupérer les profils associés
      const userIds = credentials.map(c => c.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          user_id,
          first_name,
          last_name,
          role,
          campus:campus (name)
        `)
        .in('user_id', userIds);

      if (profilesError) {
        throw profilesError;
      }

      // Joindre les données
      const credentialsWithProfiles = credentials.map(cred => {
        const profile = profiles?.find(p => p.user_id === cred.user_id);
        return {
          ...cred,
          profile
        };
      });

      // Préparer les données CSV
      const csvHeaders = [
        'Email',
        'Mot de passe temporaire',
        'Prénom',
        'Nom',
        'Rôle',
        'Campus',
        'Date de création',
        'Déjà exporté'
      ];

      const csvData = credentialsWithProfiles.map(cred => [
        cred.email,
        cred.temp_password,
        cred.profile?.first_name || '',
        cred.profile?.last_name || '',
        cred.profile?.role || '',
        cred.profile?.campus?.name || '',
        new Date(cred.created_at).toLocaleDateString('fr-FR'),
        cred.exported_at ? 'Oui' : 'Non'
      ]);

      // Créer le contenu CSV
      const csvContent = [
        csvHeaders.join(','),
        ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Télécharger le fichier
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `acces-aurlom-bts-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Marquer comme exporté TOUS les credentials
      await supabase
        .from('temp_access_credentials')
        .update({ exported_at: new Date().toISOString() })
        .in('email', credentialsWithProfiles.map(c => c.email));

      toast.success(`${credentialsWithProfiles.length} comptes exportés (existants et nouveaux)!`);
      
    } catch (error: any) {
      console.error('Erreur lors de l\'export:', error);
      toast.error(error.message || 'Erreur lors de l\'export des accès');
    } finally {
      setIsExporting(false);
    }
  };

  const generateTempPasswords = async () => {
    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-temp-passwords', {
        body: {}
      });
      
      if (error) {
        throw error;
      }

      const result = data;
      
      if (result?.success) {
        toast.success(
          `${result.processed} mots de passe temporaires générés ! ` +
          `(${result.alreadyExisting} comptes avaient déjà des mots de passe)`
        );
        
        if (result.errors && result.errors.length > 0) {
          console.warn('Some errors occurred:', result.errors);
          toast.warning(`Quelques erreurs: ${result.errors.slice(0, 2).join(', ')}`);
        }
      } else {
        throw new Error(result?.error || 'Erreur inconnue');
      }
    } catch (error: any) {
      console.error('Erreur génération mots de passe:', error);
      toast.error(error.message || 'Erreur lors de la génération des mots de passe');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-2">
      <BrutalButton 
        onClick={exportAccessCredentials}
        disabled={isExporting}
        variant="secondary"
        className="w-full"
      >
        {isExporting ? (
          <>
            <Download className="h-4 w-4 mr-2 animate-spin" />
            Export en cours...
          </>
        ) : (
          <>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Exporter les accès (CSV)
          </>
        )}
      </BrutalButton>
      
      <BrutalButton 
        onClick={generateTempPasswords}
        disabled={isGenerating}
        variant="outline"
        className="w-full"
      >
        {isGenerating ? (
          <>
            <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
            Génération...
          </>
        ) : (
          <>
            <Key className="h-4 w-4 mr-2" />
            Générer mots de passe temporaires
          </>
        )}
      </BrutalButton>
    </div>
  );
}