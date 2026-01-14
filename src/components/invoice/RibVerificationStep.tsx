import React, { useState, useEffect } from 'react';
import { BrutalCard, BrutalCardContent, BrutalCardHeader, BrutalCardTitle } from '@/components/ui/brutal-card';
import { BrutalButton } from '@/components/ui/brutal-button';
import { BrutalInput } from '@/components/ui/brutal-input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MonthYearSelector } from './MonthYearSelector';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';
import { 
  CreditCard, 
  CheckCircle, 
  AlertTriangle, 
  Edit,
  Save,
  X,
  Calendar
} from 'lucide-react';

interface RibData {
  rib_iban?: string;
  rib_bic?: string;
  rib_bank_name?: string;
  rib_account_holder?: string;
}

interface RibVerificationStepProps {
  isOpen: boolean;
  onConfirm: (month: number, year: number) => void;
  onCancel: () => void;
}

export function RibVerificationStep({ isOpen, onConfirm, onCancel }: RibVerificationStepProps) {
  const { user } = useAuth();
  const [ribData, setRibData] = useState<RibData>({});
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasExistingRib, setHasExistingRib] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    if (isOpen && user) {
      fetchRibData();
    }
  }, [isOpen, user]);

  const fetchRibData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('teacher_profile')
        .select('rib_iban, rib_bic, rib_bank_name, rib_account_holder')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setRibData(data);
        // Vérifier si toutes les informations RIB sont présentes
        const isComplete = data.rib_iban && 
                          data.rib_bic && 
                          data.rib_bank_name && 
                          data.rib_account_holder &&
                          data.rib_iban.trim() !== '' &&
                          data.rib_bic.trim() !== '' &&
                          data.rib_bank_name.trim() !== '' &&
                          data.rib_account_holder.trim() !== '';
        setHasExistingRib(!!isComplete);
        setEditMode(!isComplete); // Mode édition si RIB incomplet
      } else {
        setHasExistingRib(false);
        setEditMode(true); // Mode édition si pas de profil
      }
    } catch (error) {
      console.error('Erreur lors du chargement du RIB:', error);
      toast.error('Erreur lors du chargement des informations bancaires');
      setEditMode(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRib = async () => {
    if (!user) return;

    // Validation basique
    if (!ribData.rib_iban || !ribData.rib_bic || !ribData.rib_bank_name || !ribData.rib_account_holder) {
      toast.error('Tous les champs sont requis');
      return;
    }

    setSaving(true);
    
    try {
      // Vérifier si le profil existe déjà
      const { data: existingProfile } = await supabase
        .from('teacher_profile')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingProfile) {
        // Mettre à jour
        const { error } = await supabase
          .from('teacher_profile')
          .update({
            rib_iban: ribData.rib_iban,
            rib_bic: ribData.rib_bic,
            rib_bank_name: ribData.rib_bank_name,
            rib_account_holder: ribData.rib_account_holder
          })
          .eq('user_id', user.id);
        
        if (error) throw error;
      } else {
        // Créer
        const { error } = await supabase
          .from('teacher_profile')
          .insert({
            user_id: user.id,
            rib_iban: ribData.rib_iban,
            rib_bic: ribData.rib_bic,
            rib_bank_name: ribData.rib_bank_name,
            rib_account_holder: ribData.rib_account_holder,
            specialities: [],
            hourly_rate_min: 50.00,
            hourly_rate_max: 80.00
          });
        
        if (error) throw error;
      }

      toast.success('Informations bancaires sauvegardées');
      setHasExistingRib(true);
      setEditMode(false);
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error(`Erreur de sauvegarde: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const validateIBAN = (iban: string): boolean => {
    // Support international IBANs - basic validation for length and format
    const cleanIban = iban.replace(/\s/g, '').toUpperCase();
    
    // Basic IBAN validation: 2 letters + 2 digits + up to 30 alphanumeric characters
    const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/;
    
    // Check basic format and length (15-34 characters total)
    if (!ibanRegex.test(cleanIban) || cleanIban.length < 15 || cleanIban.length > 34) {
      return false;
    }
    
    // Country-specific length validation for common countries
    const countryLengths: { [key: string]: number } = {
      'AD': 24, 'AE': 23, 'AL': 28, 'AT': 20, 'AZ': 28, 'BA': 20, 'BE': 16,
      'BG': 22, 'BH': 22, 'BR': 29, 'BY': 28, 'CH': 21, 'CR': 22, 'CY': 28,
      'CZ': 24, 'DE': 22, 'DK': 18, 'DO': 28, 'EE': 20, 'EG': 29, 'ES': 24,
      'FI': 18, 'FO': 18, 'FR': 27, 'GB': 22, 'GE': 22, 'GI': 23, 'GL': 18,
      'GR': 27, 'GT': 28, 'HR': 21, 'HU': 28, 'IE': 22, 'IL': 23, 'IS': 26,
      'IT': 27, 'JO': 30, 'KW': 30, 'KZ': 20, 'LB': 28, 'LC': 32, 'LI': 21,
      'LT': 20, 'LU': 20, 'LV': 21, 'MC': 27, 'MD': 24, 'ME': 22, 'MK': 19,
      'MR': 27, 'MT': 31, 'MU': 30, 'NL': 18, 'NO': 15, 'PK': 24, 'PL': 28,
      'PS': 29, 'PT': 25, 'QA': 29, 'RO': 24, 'RS': 22, 'SA': 24, 'SE': 24,
      'SI': 19, 'SK': 24, 'SM': 27, 'TN': 24, 'TR': 26, 'UA': 29, 'VG': 24,
      'XK': 20
    };
    
    const countryCode = cleanIban.substring(0, 2);
    const expectedLength = countryLengths[countryCode];
    
    if (expectedLength && cleanIban.length !== expectedLength) {
      return false;
    }
    
    return true;
  };

  const formatIBAN = (iban: string): string => {
    const cleanIban = iban.replace(/\s/g, '').toUpperCase();
    return cleanIban.replace(/(.{4})/g, '$1 ').trim();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-3 rounded-lg bg-brand-aurlom text-white border-2 border-foreground">
              <CreditCard className="h-6 w-6" />
            </div>
            Vérification avant soumission
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-brand-aurlom border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-muted-foreground">Chargement des informations...</p>
            </div>
          ) : (
            <>
              <div className="bg-brand-warning/10 border-2 border-brand-warning/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-brand-warning mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-brand-warning mb-1">Vérification obligatoire</h3>
                    <p className="text-sm text-foreground">
                      Avant de soumettre votre facture, vous devez confirmer vos informations bancaires 
                      et sélectionner la période de facturation.
                    </p>
                  </div>
                </div>
              </div>

              {/* Sélecteur de mois/année */}
              <MonthYearSelector
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                onMonthChange={setSelectedMonth}
                onYearChange={setSelectedYear}
                disabled={saving}
              />

              {hasExistingRib && !editMode ? (
                // Mode affichage/confirmation
                <div className="space-y-4">
                  <div className="bg-brand-success/10 border-2 border-brand-success/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="h-5 w-5 text-brand-success" />
                      <h3 className="font-semibold text-brand-success">Informations bancaires enregistrées</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-muted-foreground">Titulaire :</p>
                        <p className="text-foreground">{ribData.rib_account_holder}</p>
                      </div>
                      <div>
                        <p className="font-medium text-muted-foreground">Banque :</p>
                        <p className="text-foreground">{ribData.rib_bank_name}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="font-medium text-muted-foreground">IBAN :</p>
                        <p className="text-foreground font-mono">{ribData.rib_iban}</p>
                      </div>
                      <div>
                        <p className="font-medium text-muted-foreground">BIC :</p>
                        <p className="text-foreground font-mono">{ribData.rib_bic}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <BrutalButton 
                      variant="outline" 
                      onClick={() => setEditMode(true)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Modifier mes informations
                    </BrutalButton>
                    
                    <div className="text-sm text-muted-foreground">
                      Ces informations sont-elles correctes ?
                    </div>
                  </div>
                </div>
              ) : (
                // Mode édition/ajout
                <div className="space-y-4">
                  <div className="bg-brand-aurlom/10 border-2 border-brand-aurlom/30 rounded-lg p-4">
                    <h3 className="font-semibold text-brand-aurlom mb-2">
                      {hasExistingRib ? 'Modifier vos informations bancaires' : 'Ajouter vos informations bancaires'}
                    </h3>
                    <p className="text-sm text-foreground">
                      Veuillez renseigner ou vérifier vos coordonnées bancaires pour recevoir vos paiements.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="rib-holder">Titulaire du compte *</Label>
                      <BrutalInput
                        id="rib-holder"
                        placeholder="Prénom NOM"
                        value={ribData.rib_account_holder || ''}
                        onChange={(e) => setRibData({
                          ...ribData,
                          rib_account_holder: e.target.value
                        })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rib-bank">Nom de la banque *</Label>
                      <BrutalInput
                        id="rib-bank"
                        placeholder="Crédit Agricole, BNP Paribas..."
                        value={ribData.rib_bank_name || ''}
                        onChange={(e) => setRibData({
                          ...ribData,
                          rib_bank_name: e.target.value
                        })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rib-iban">IBAN *</Label>
                    <BrutalInput
                      id="rib-iban"
                      placeholder="FR76 3000 3018 0100 0006 7269 896"
                      value={ribData.rib_iban || ''}
                      onChange={(e) => {
                        const formattedIban = formatIBAN(e.target.value);
                        setRibData({
                          ...ribData,
                          rib_iban: formattedIban
                        });
                      }}
                      className={ribData.rib_iban && !validateIBAN(ribData.rib_iban) 
                        ? 'border-red-500' 
                        : ''}
                    />
                    {ribData.rib_iban && !validateIBAN(ribData.rib_iban) && (
                      <p className="text-xs text-red-600">Format IBAN invalide</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rib-bic">Code BIC/SWIFT *</Label>
                    <BrutalInput
                      id="rib-bic"
                      placeholder="AGRIFRPP882"
                      value={ribData.rib_bic || ''}
                      onChange={(e) => setRibData({
                        ...ribData,
                        rib_bic: e.target.value.toUpperCase()
                      })}
                      maxLength={11}
                    />
                  </div>

                  <div className="pt-2">
                    <BrutalButton
                      variant="success"
                      onClick={handleSaveRib}
                      disabled={saving || !ribData.rib_iban || !ribData.rib_bic || !ribData.rib_bank_name || !ribData.rib_account_holder}
                      className="w-full"
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                          Sauvegarde...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          {hasExistingRib ? 'Mettre à jour' : 'Enregistrer mes informations'}
                        </>
                      )}
                    </BrutalButton>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t-2 border-border-light">
          <BrutalButton 
            variant="outline" 
            onClick={onCancel}
            disabled={saving}
          >
            <X className="h-4 w-4 mr-2" />
            Annuler
          </BrutalButton>
          
          {hasExistingRib && !editMode && (
            <BrutalButton 
              variant="success"
              onClick={() => onConfirm(selectedMonth, selectedYear)}
              disabled={saving}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirmer et soumettre la facture
            </BrutalButton>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}