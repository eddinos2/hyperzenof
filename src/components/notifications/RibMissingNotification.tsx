import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BrutalButton } from '@/components/ui/brutal-button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CreditCard, X, ArrowRight, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export function RibMissingNotification() {
  const { user, profile } = useAuth();
  const [hasRib, setHasRib] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && profile?.role === 'ENSEIGNANT') {
      checkRibStatus();
    } else {
      setLoading(false);
    }
  }, [user, profile]);

  // Écouter les mises à jour de profil
  useEffect(() => {
    const handleProfileUpdate = () => {
      if (user && profile?.role === 'ENSEIGNANT') {
        console.log('Profil mis à jour, rechargement du statut RIB...');
        checkRibStatus();
      }
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, [user, profile]);

  const checkRibStatus = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('teacher_profile')
        .select('rib_iban, rib_bic, rib_bank_name, rib_account_holder')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Erreur lors de la vérification du RIB:', error);
        return;
      }

      // Vérifier si toutes les informations bancaires sont présentes
      const ribComplete = data && 
        data.rib_iban && 
        data.rib_bic && 
        data.rib_bank_name && 
        data.rib_account_holder &&
        data.rib_iban.trim() !== '' &&
        data.rib_bic.trim() !== '' &&
        data.rib_bank_name.trim() !== '' &&
        data.rib_account_holder.trim() !== '';

      console.log('Vérification RIB:', {
        user_id: user.id,
        data,
        ribComplete,
        hasRib: !!ribComplete
      });

      setHasRib(!!ribComplete);
      
      // Afficher automatiquement le dialog si pas de RIB
      if (!ribComplete) {
        setShowDialog(true);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification du RIB:', error);
    } finally {
      setLoading(false);
    }
  };

  // Ne rien afficher si pas enseignant ou si RIB complet
  if (loading || profile?.role !== 'ENSEIGNANT' || hasRib) {
    return null;
  }

  return (
    <>
      {/* Alert banner persistante */}
      <div className="border-b-4 border-brand-warning bg-brand-warning/10 p-4">
        <Alert className="border-brand-warning border-2 bg-background">
          <CreditCard className="h-5 w-5 text-brand-warning" />
          <AlertDescription className="ml-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-brand-warning">RIB manquant !</span>
                <span className="text-foreground ml-2">
                  Vous devez renseigner vos informations bancaires pour recevoir vos paiements.
                </span>
              </div>
              <BrutalButton
                variant="warning"
                size="sm"
                onClick={() => setShowDialog(true)}
                className="ml-4"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Ajouter mon RIB
              </BrutalButton>
            </div>
          </AlertDescription>
        </Alert>
      </div>

      {/* Dialog explicatif */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="p-3 rounded-lg bg-brand-warning text-white border-2 border-foreground">
                <CreditCard className="h-6 w-6" />
              </div>
              Informations bancaires requises
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="bg-brand-warning/10 border-2 border-brand-warning/30 rounded-lg p-4">
              <h3 className="font-bold text-brand-warning mb-2">⚠️ Action requise</h3>
              <p className="text-foreground">
                Vous devez impérativement ajouter vos informations bancaires (RIB) 
                pour pouvoir recevoir vos paiements. Cette étape est obligatoire.
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-brand-success" />
                Comment procéder ?
              </h4>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 border-2 border-border-light rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-brand-aurlom text-white rounded-full flex items-center justify-center text-sm font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Accédez à votre profil enseignant</p>
                    <p className="text-sm text-muted-foreground">Cliquez sur "Mon Profil" dans le menu de navigation</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 border-2 border-border-light rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-brand-aurlom text-white rounded-full flex items-center justify-center text-sm font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Remplissez vos informations bancaires</p>
                    <p className="text-sm text-muted-foreground">IBAN, BIC, nom de la banque et titulaire du compte</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 border-2 border-border-light rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-brand-aurlom text-white rounded-full flex items-center justify-center text-sm font-bold">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Sauvegardez vos informations</p>
                    <p className="text-sm text-muted-foreground">Une fois validées, cette notification disparaîtra</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-muted/50 border-2 border-border-light rounded-lg p-4">
              <h4 className="font-semibold mb-2">🔒 Sécurité</h4>
              <p className="text-sm text-muted-foreground">
                Vos informations bancaires sont sécurisées et ne sont accessibles 
                qu'à l'équipe comptable pour le traitement des paiements.
              </p>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4 border-t-2 border-border-light">
            <BrutalButton 
              variant="outline" 
              onClick={() => setShowDialog(false)}
            >
              Fermer
            </BrutalButton>
            
            <Link to="/teacher-profile">
              <BrutalButton 
                variant="success"
                onClick={() => setShowDialog(false)}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Ajouter mon RIB
                <ArrowRight className="h-4 w-4 ml-2" />
              </BrutalButton>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}