import React, { useState, useEffect } from 'react';
import { BrutalCard, BrutalCardContent, BrutalCardHeader, BrutalCardTitle } from '@/components/ui/brutal-card';
import { BrutalButton } from '@/components/ui/brutal-button';
import { BrutalInput } from '@/components/ui/brutal-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';
import { 
  User, 
  CreditCard, 
  Building2,
  Save,
  Euro
} from 'lucide-react';

interface TeacherProfile {
  specialities: string[];
  hourly_rate_min: number;
  hourly_rate_max: number;
  rib_iban?: string;
  rib_bic?: string;
  rib_bank_name?: string;
  rib_account_holder?: string;
}

export function TeacherProfileForm() {
  const { user, profile } = useAuth();
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile>({
    specialities: [],
    hourly_rate_min: 50.00,
    hourly_rate_max: 80.00,
    rib_iban: '',
    rib_bic: '',
    rib_bank_name: '',
    rib_account_holder: ''
  });
  const [specialitiesText, setSpecialitiesText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && profile?.role === 'ENSEIGNANT') {
      fetchTeacherProfile();
    }
  }, [user, profile]);

  const fetchTeacherProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('teacher_profile')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setTeacherProfile(data);
        setSpecialitiesText(data.specialities?.join(', ') || '');
      }
    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error);
      toast.error('Erreur lors du chargement du profil');
    } finally {
      setLoading(false);
    }
  };

  // Validation des champs RIB
  const validateRibFields = (): { isValid: boolean; missingFields: string[] } => {
    const ribFields = [
      { key: 'rib_account_holder', label: 'Titulaire du compte', value: teacherProfile.rib_account_holder },
      { key: 'rib_bank_name', label: 'Nom de la banque', value: teacherProfile.rib_bank_name },
      { key: 'rib_iban', label: 'IBAN', value: teacherProfile.rib_iban },
      { key: 'rib_bic', label: 'Code BIC', value: teacherProfile.rib_bic }
    ];

    const filledFields = ribFields.filter(field => field.value && field.value.trim() !== '');
    const missingFields = ribFields.filter(field => !field.value || field.value.trim() === '');

    // Si au moins un champ RIB est rempli, tous doivent l'être
    if (filledFields.length > 0 && missingFields.length > 0) {
      return {
        isValid: false,
        missingFields: missingFields.map(field => field.label)
      };
    }

    // Validation IBAN si présent
    if (teacherProfile.rib_iban && !validateIBAN(teacherProfile.rib_iban)) {
      return {
        isValid: false,
        missingFields: ['IBAN (format invalide)']
      };
    }

    return { isValid: true, missingFields: [] };
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    
    try {
      // Validation des champs RIB
      const ribValidation = validateRibFields();
      if (!ribValidation.isValid) {
        toast.error(`Informations bancaires incomplètes: ${ribValidation.missingFields.join(', ')}`);
        setSaving(false);
        return;
      }

      const specialitiesArray = specialitiesText
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      const profileData = {
        ...teacherProfile,
        specialities: specialitiesArray,
        user_id: user.id
      };

      console.log('Sauvegarde profil enseignant:', {
        user_id: user.id,
        hasRibData: !!(teacherProfile.rib_account_holder && teacherProfile.rib_bank_name && teacherProfile.rib_iban && teacherProfile.rib_bic)
      });

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
          .update(profileData)
          .eq('user_id', user.id);
        
        if (error) throw error;
      } else {
        // Créer
        const { error } = await supabase
          .from('teacher_profile')
          .insert(profileData);
        
        if (error) throw error;
      }

      toast.success('Profil sauvegardé avec succès');
      
      // Forcer un rechargement pour actualiser les notifications
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('profileUpdated'));
      }, 500);
      
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
    // Formater l'IBAN avec des espaces (groupes de 4)
    const cleanIban = iban.replace(/\s/g, '').toUpperCase();
    return cleanIban.replace(/(.{4})/g, '$1 ').trim();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Chargement du profil...</div>
      </div>
    );
  }

  if (profile?.role !== 'ENSEIGNANT') {
    return (
      <BrutalCard>
        <BrutalCardContent className="text-center py-8">
          <p className="text-muted-foreground">
            Cette section est réservée aux enseignants.
          </p>
        </BrutalCardContent>
      </BrutalCard>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Mon Profil Enseignant</h1>
          <p className="text-muted-foreground mt-2">
            Gérez vos informations personnelles et bancaires
          </p>
        </div>
      </div>

      {/* Informations professionnelles */}
      <BrutalCard>
        <BrutalCardHeader>
          <BrutalCardTitle className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            Informations Professionnelles
          </BrutalCardTitle>
        </BrutalCardHeader>
        <BrutalCardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rate-min">Tarif horaire minimum (€)</Label>
              <BrutalInput
                id="rate-min"
                type="number"
                step="0.01"
                min="0"
                value={teacherProfile.hourly_rate_min}
                onChange={(e) => setTeacherProfile({
                  ...teacherProfile,
                  hourly_rate_min: parseFloat(e.target.value) || 0
                })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="rate-max">Tarif horaire maximum (€)</Label>
              <BrutalInput
                id="rate-max"
                type="number"
                step="0.01"
                min="0"
                value={teacherProfile.hourly_rate_max}
                onChange={(e) => setTeacherProfile({
                  ...teacherProfile,
                  hourly_rate_max: parseFloat(e.target.value) || 0
                })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialities">Spécialités (séparées par des virgules)</Label>
            <Textarea
              id="specialities"
              placeholder="Informatique, Programmation Web, Bases de données..."
              value={specialitiesText}
              onChange={(e) => setSpecialitiesText(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Listez vos domaines d'expertise, séparés par des virgules
            </p>
          </div>
        </BrutalCardContent>
      </BrutalCard>

      {/* Informations bancaires (RIB) */}
      <BrutalCard>
        <BrutalCardHeader>
          <BrutalCardTitle className="flex items-center">
            <CreditCard className="h-5 w-5 mr-2" />
            Informations Bancaires (RIB)
          </BrutalCardTitle>
        </BrutalCardHeader>
        <BrutalCardContent className="space-y-4">
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <Euro className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800">Information importante</p>
                <p className="text-yellow-700">
                  Vos informations bancaires sont nécessaires pour le traitement des paiements. 
                  Ces données sont sécurisées et ne sont visibles que par l'équipe comptable.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rib-holder">
                Titulaire du compte <span className="text-red-500">*</span>
              </Label>
              <BrutalInput
                id="rib-holder"
                placeholder="Prénom NOM"
                value={teacherProfile.rib_account_holder || ''}
                onChange={(e) => setTeacherProfile({
                  ...teacherProfile,
                  rib_account_holder: e.target.value
                })}
                className={!teacherProfile.rib_account_holder?.trim() && 
                  (teacherProfile.rib_bank_name || teacherProfile.rib_iban || teacherProfile.rib_bic) 
                  ? 'border-red-500' : ''}
              />
              {!teacherProfile.rib_account_holder?.trim() && 
                (teacherProfile.rib_bank_name || teacherProfile.rib_iban || teacherProfile.rib_bic) && (
                <p className="text-xs text-red-600">Ce champ est obligatoire si vous remplissez les informations bancaires</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="rib-bank">
                Nom de la banque <span className="text-red-500">*</span>
              </Label>
              <BrutalInput
                id="rib-bank"
                placeholder="Crédit Agricole, BNP Paribas..."
                value={teacherProfile.rib_bank_name || ''}
                onChange={(e) => setTeacherProfile({
                  ...teacherProfile,
                  rib_bank_name: e.target.value
                })}
                className={!teacherProfile.rib_bank_name?.trim() && 
                  (teacherProfile.rib_account_holder || teacherProfile.rib_iban || teacherProfile.rib_bic) 
                  ? 'border-red-500' : ''}
              />
              {!teacherProfile.rib_bank_name?.trim() && 
                (teacherProfile.rib_account_holder || teacherProfile.rib_iban || teacherProfile.rib_bic) && (
                <p className="text-xs text-red-600">Ce champ est obligatoire si vous remplissez les informations bancaires</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rib-iban">
              IBAN <span className="text-red-500">*</span>
            </Label>
            <BrutalInput
              id="rib-iban"
              placeholder="FR76 3000 3018 0100 0006 7269 896"
              value={teacherProfile.rib_iban || ''}
              onChange={(e) => {
                const formattedIban = formatIBAN(e.target.value);
                setTeacherProfile({
                  ...teacherProfile,
                  rib_iban: formattedIban
                });
              }}
              className={
                (teacherProfile.rib_iban && !validateIBAN(teacherProfile.rib_iban)) ||
                (!teacherProfile.rib_iban?.trim() && 
                  (teacherProfile.rib_account_holder || teacherProfile.rib_bank_name || teacherProfile.rib_bic))
                ? 'border-red-500' 
                : ''}
            />
            {teacherProfile.rib_iban && !validateIBAN(teacherProfile.rib_iban) && (
              <p className="text-xs text-red-600">Format IBAN invalide</p>
            )}
            {!teacherProfile.rib_iban?.trim() && 
              (teacherProfile.rib_account_holder || teacherProfile.rib_bank_name || teacherProfile.rib_bic) && (
              <p className="text-xs text-red-600">Ce champ est obligatoire si vous remplissez les informations bancaires</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="rib-bic">
              Code BIC/SWIFT <span className="text-red-500">*</span>
            </Label>
            <BrutalInput
              id="rib-bic"
              placeholder="AGRIFRPP882"
              value={teacherProfile.rib_bic || ''}
              onChange={(e) => setTeacherProfile({
                ...teacherProfile,
                rib_bic: e.target.value.toUpperCase()
              })}
              maxLength={11}
              className={!teacherProfile.rib_bic?.trim() && 
                (teacherProfile.rib_account_holder || teacherProfile.rib_bank_name || teacherProfile.rib_iban) 
                ? 'border-red-500' : ''}
            />
            {!teacherProfile.rib_bic?.trim() && 
              (teacherProfile.rib_account_holder || teacherProfile.rib_bank_name || teacherProfile.rib_iban) && (
              <p className="text-xs text-red-600">Ce champ est obligatoire si vous remplissez les informations bancaires</p>
            )}
            <p className="text-xs text-muted-foreground">
              Code à 8 ou 11 caractères de votre banque
            </p>
          </div>
        </BrutalCardContent>
      </BrutalCard>

      {/* Actions */}
      <div className="flex justify-end space-x-4">
        <BrutalButton
          variant="outline"
          onClick={() => window.location.reload()}
        >
          Annuler
        </BrutalButton>
        
        <BrutalButton
          variant="success"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
              Sauvegarde...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder
            </>
          )}
        </BrutalButton>
      </div>
    </div>
  );
}