import React, { useState, useRef } from 'react';
import { BrutalCard, BrutalCardContent, BrutalCardHeader, BrutalCardTitle } from '@/components/ui/brutal-card';
import { BrutalButton } from '@/components/ui/brutal-button';
import { BrutalInput } from '@/components/ui/brutal-input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';
import { RibVerificationStep } from './RibVerificationStep';
import { 
  Upload, 
  FileText, 
  Download, 
  AlertCircle, 
  CheckCircle,
  Link as LinkIcon,
  CreditCard
} from 'lucide-react';

interface InvoiceImportFormProps {
  onImportComplete?: () => void;
}

export function InvoiceImportForm({ onImportComplete }: InvoiceImportFormProps) {
  const { user } = useAuth();
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [driveUrl, setDriveUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [showRibVerification, setShowRibVerification] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    // Template avec tous les campus AURLOM réels
    const csvContent = `MOIS,DATE,HEURE DÉBUT,HEURE FIN,CAMPUS,FILIÈRE,CLASSE,INTITULÉ DU COURS,RETARD ?,QUANTITÉ,PRIX UNITAIRE TTC,TOTAL TTC
FÉVRIER,lundi 3 février 2025,08:30:00,10:00:00,JAURÈS,MOS,MOS1 LM/LMM [Paris],ANGLAIS,Aucun,"1,5","60,00 €","90,00 €"
FÉVRIER,lundi 3 février 2025,10:15:00,11:45:00,PARMENTIER,SIO,SIO1 A SLAM LM/LMM [Paris],ANGLAIS,Aucun,"1,5","60,00 €","90,00 €"
FÉVRIER,jeudi 6 février 2025,10:15:00,11:45:00,NICE,MCO,MCO2 JV1 [Nice],ANGLAIS,Aucun,"1,5","60,00 €","90,00 €"

# ======= VALEURS AUTORISÉES POUR LES COLONNES =======
# Utilisez EXACTEMENT ces valeurs comme dans vos dropdowns Google Sheets

# CAMPUS (tous les campus AURLOM) :
BOULOGNE
DOUAI
JAURÈS
NICE
PARMENTIER
PICPUS
ROQUETTE
SAINT-SÉBASTIEN
SENTIER

# FORMAT DATE : jour_semaine jour mois année
# Exemples: lundi 3 février 2025, mercredi 5 février 2025, jeudi 6 février 2025

# RETARD : Aucun (si pas de retard) ou description du retard

# FILIÈRE (codes exacts) :
ABM,ASSURANCE,AUDIOVISUEL,BANQUE,BIOAC,CCST,CG,CI,CIEL,CJN,COM,DCG,EDITION,ESF,FED,GTLA,GPME,MECP,MCO,MOS,NDRC,OPTIQUE,PHOTOGRAPHIE,PI,PRO DENT,SAM,SIO,SP3S,TOURISME

# CLASSE (exemples par campus) :
# Paris: MCO1 LM1 [Paris], SIO1 A SLAM LM/LMM [Paris], NDRC1 LM1 [Paris]...
# Nice: CI1 LM/LMM [Nice], MCO1 LM/LMM [Nice], TOURISME1 LM/LMM [Nice]...
# (Utilisez les classes exactes de vos dropdowns)

# INTITULÉ DU COURS (exemples fréquents) :
ANGLAIS,COMMUNICATION PROFESSIONNELLE,COMPTABILITÉ,GESTION DE PROJET,MATHÉMATIQUES,ÉCONOMIE ET GESTION

# QUANTITÉ : Format "1,5" (avec virgule pour les décimales)
# PRIX/TOTAL : Format "60,00 €" (avec virgule et symbole euro)`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template_facture_aurlom_tous_campus.csv';
    link.click();
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  };

  const parseDate = (dateStr: string): Date | null => {
    try {
      // Format attendu : "mardi 3 février 2026"
      const parts = dateStr.trim().split(' ');
      if (parts.length < 4) return null;
      
      const day = parseInt(parts[1]);
      const monthName = parts[2].toLowerCase();
      const year = parseInt(parts[3]);
      
      const months: Record<string, number> = {
        'janvier': 1, 'février': 2, 'mars': 3, 'avril': 4,
        'mai': 5, 'juin': 6, 'juillet': 7, 'août': 8,
        'septembre': 9, 'octobre': 10, 'novembre': 11, 'décembre': 12
      };
      
      const month = months[monthName];
      if (month === undefined) return null;
      
      // Utiliser le format ISO pour éviter les problèmes de timezone
      const isoDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      return new Date(isoDate);
    } catch (error) {
      return null;
    }
  };

  const parseTime = (timeStr: string): string => {
    // Format attendu : "8:30:00" ou "08:30:00"
    return timeStr.trim();
  };

  const parsePrice = (priceStr: string): number => {
    // Format attendu : "60,00 €" ou "1,5"
    return parseFloat(priceStr.replace(/[€\s]/g, '').replace(',', '.')) || 0;
  };

  const processCSVFile = async (file: File): Promise<any> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());
          
          if (lines.length < 2) {
            reject(new Error('Le fichier CSV doit contenir au moins une ligne d\'en-tête et une ligne de données'));
            return;
          }
          
          // Vérifier l'en-tête
          const header = parseCSVLine(lines[0]);
          const expectedHeaders = [
            'MOIS', 'DATE', 'HEURE DÉBUT', 'HEURE FIN', 'CAMPUS',
            'FILIÈRE', 'CLASSE', 'INTITULÉ DU COURS', 'RETARD ?',
            'QUANTITÉ', 'PRIX UNITAIRE TTC', 'TOTAL TTC'
          ];
          
          for (let i = 0; i < expectedHeaders.length; i++) {
            if (!header[i] || header[i].trim() !== expectedHeaders[i]) {
              reject(new Error(`En-tête incorrect. Colonne ${i + 1} attendue: "${expectedHeaders[i]}", trouvée: "${header[i] || 'manquante'}"`));
              return;
            }
          }
          
          // Traiter les lignes de données
          const invoiceLines: any[] = [];
          let totalAmount = 0;
          
          for (let i = 1; i < lines.length; i++) {
            const data = parseCSVLine(lines[i]);
            
            if (data.length < expectedHeaders.length) {
              console.warn(`Ligne ${i + 1} ignorée : nombre de colonnes insuffisant`);
              continue;
            }
            
            const parsedDate = parseDate(data[1]);
            if (!parsedDate) {
              reject(new Error(`Ligne ${i + 1} : Format de date incorrect "${data[1]}"`));
              return;
            }
            
            const hours = parsePrice(data[9]);
            const unitPrice = parsePrice(data[10]);
            const totalPrice = parsePrice(data[11]);
            
            const invoiceLine = {
              month: data[0].trim(),
              date: parsedDate,
              start_time: parseTime(data[2]),
              end_time: parseTime(data[3]),
              campus: data[4].trim(),
              filiere: data[5].trim(),
              class: data[6].trim(),
              course_title: data[7].trim(),
              is_late: data[8].trim().toLowerCase() !== 'aucun',
              hours_qty: hours,
              unit_price: unitPrice,
              total_price: totalPrice
            };
            
            invoiceLines.push(invoiceLine);
            totalAmount += totalPrice;
          }
          
          resolve({
            lines: invoiceLines,
            totalAmount,
            totalLines: invoiceLines.length
          });
          
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier'));
      reader.readAsText(file, 'UTF-8');
    });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        toast.error('Veuillez sélectionner un fichier CSV');
        return;
      }
      setCsvFile(file);
      setImportResult(null);
    }
  };

  const handlePreImport = () => {
    if (!csvFile) {
      toast.error('Veuillez sélectionner un fichier CSV');
      return;
    }
    // Ouvrir la vérification RIB avant import
    setShowRibVerification(true);
  };

  const handleRibConfirmed = (month: number, year: number) => {
    setShowRibVerification(false);
    handleImport(month, year);
  };

  const handleRibCancelled = () => {
    setShowRibVerification(false);
  };

  const handleImport = async (invoiceMonth?: number, invoiceYear?: number) => {
    if (!csvFile || !user) return;
    
    setImporting(true);
    
    try {
      // 1. Analyser le fichier CSV
      const csvData = await processCSVFile(csvFile);
      
      // 2. Appeler la fonction backend sécurisée
      const { data: result, error } = await supabase.functions.invoke('import-invoice', {
        body: {
          csvData,
          filename: csvFile.name,
          driveUrl: driveUrl || null,
          invoiceMonth: invoiceMonth || new Date().getMonth() + 1,
          invoiceYear: invoiceYear || new Date().getFullYear()
        }
      });
      
      if (error) {
        console.error('Backend error:', error);
        throw new Error(error.message || 'Erreur lors de l\'import');
      }
      
      if (!result.success) {
        throw new Error(result.error || 'Import échoué');
      }
      
      setImportResult({
        success: true,
        totalLines: result.processedLines,
        totalAmount: result.totalAmount,
        invoiceId: result.invoiceId,
        errors: result.errors,
        unknownFilieres: result.unknownFilieres
      });
      
      let successMessage = `Import réussi ! ${result.processedLines} lignes traitées`;
      if (result.errors && result.errors.length > 0) {
        successMessage += ` (${result.errors.length} lignes ignorées)`;
      }
      if (result.unknownFilieres && result.unknownFilieres.length > 0) {
        successMessage += ` - Filières inconnues mappées automatiquement: ${result.unknownFilieres.join(', ')}`;
      }
      
      toast.success(successMessage);
      
      if (onImportComplete) {
        onImportComplete();
      }
      
    } catch (error: any) {
      console.error('Erreur lors de l\'import:', error);
      toast.error(`Erreur d'import: ${error.message}`);
      
      setImportResult({
        success: false,
        error: error.message
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
        {/* Télécharger le template */}
        <BrutalCard>
          <BrutalCardHeader>
            <BrutalCardTitle className="flex items-center">
              <Download className="h-5 w-5 mr-2" />
              Template Officiel AURLOM BTS+
            </BrutalCardTitle>
          </BrutalCardHeader>
          <BrutalCardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Téléchargez le template CSV officiel avec les colonnes requises pour l'import des factures.
            </p>
            <div className="bg-brand-aurlom-light border-2 border-brand-aurlom rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-brand-aurlom mb-2">Format requis :</h4>
              <div className="text-xs text-brand-aurlom space-y-1 font-mono">
                <div>MOIS, DATE, HEURE DÉBUT, HEURE FIN, CAMPUS, FILIÈRE,</div>
                <div>CLASSE, INTITULÉ DU COURS, RETARD ?, QUANTITÉ,</div>
                <div>PRIX UNITAIRE TTC, TOTAL TTC</div>
              </div>
            </div>
            <BrutalButton variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Télécharger le template
            </BrutalButton>
          </BrutalCardContent>
        </BrutalCard>

      {/* Formulaire d'import */}
      <BrutalCard>
        <BrutalCardHeader>
          <BrutalCardTitle className="flex items-center">
            <Upload className="h-5 w-5 mr-2" />
            Importer une Facture CSV
          </BrutalCardTitle>
        </BrutalCardHeader>
        <BrutalCardContent className="space-y-6">
          {/* Lien Drive */}
          <div className="space-y-2">
            <Label htmlFor="drive-url" className="flex items-center">
              <LinkIcon className="h-4 w-4 mr-2" />
              Lien Google Drive (PDF original)
            </Label>
            <BrutalInput
              id="drive-url"
              type="url"
              placeholder="https://drive.google.com/file/d/..."
              value={driveUrl}
              onChange={(e) => setDriveUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Optionnel : Lien vers votre facture PDF originale sur Drive
            </p>
          </div>

          {/* Sélection fichier */}
          <div className="space-y-2">
            <Label htmlFor="csv-file">Fichier CSV</Label>
            <div className="flex items-center space-x-4">
              <BrutalInput
                ref={fileInputRef}
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
              />
              {csvFile && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <FileText className="h-4 w-4 mr-2" />
                  {csvFile.name}
                </div>
              )}
            </div>
          </div>

          {/* Bouton d'import */}
          <div className="space-y-3">
            <div className="bg-brand-aurlom/10 border-2 border-brand-aurlom/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="h-4 w-4 text-brand-aurlom" />
                <span className="text-sm font-medium text-brand-aurlom">Avant de soumettre</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Vos informations bancaires seront vérifiées avant la soumission de votre facture
              </p>
            </div>
            
            <BrutalButton
              onClick={handlePreImport}
              disabled={!csvFile || importing}
              variant="success"
              className="w-full"
            >
              {importing ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                  Import en cours...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Soumettre la facture
                </>
              )}
            </BrutalButton>
          </div>
        </BrutalCardContent>
      </BrutalCard>

      {/* Résultat de l'import */}
      {importResult && (
        <BrutalCard>
          <BrutalCardHeader>
            <BrutalCardTitle className="flex items-center">
              {importResult.success ? (
                <CheckCircle className="h-5 w-5 mr-2 text-brand-success" />
              ) : (
                <AlertCircle className="h-5 w-5 mr-2 text-brand-error" />
              )}
              Résultat de l'Import
            </BrutalCardTitle>
          </BrutalCardHeader>
          <BrutalCardContent>
            {importResult.success ? (
              <div className="space-y-2">
                <p className="text-sm text-brand-success font-medium">
                  ✅ Import réussi !
                </p>
                <div className="text-sm text-muted-foreground">
                  <p>• Lignes traitées : {importResult.totalLines}</p>
                  <p>• Montant total : {importResult.totalAmount.toFixed(2)} €</p>
                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-xs font-medium text-yellow-800">Lignes ignorées :</p>
                      <ul className="text-xs text-yellow-700 mt-1">
                        {importResult.errors.slice(0, 5).map((error: string, idx: number) => (
                          <li key={idx}>• {error}</li>
                        ))}
                        {importResult.errors.length > 5 && (
                          <li>• ... et {importResult.errors.length - 5} autres</li>
                        )}
                      </ul>
                    </div>
                  )}
                  {importResult.unknownFilieres && importResult.unknownFilieres.length > 0 && (
                    <div className="mt-2 p-2 bg-brand-aurlom-light border border-brand-aurlom rounded">
                      <p className="text-xs font-medium text-brand-aurlom">Filières inconnues mappées automatiquement :</p>
                      <p className="text-xs text-brand-aurlom mt-1">{importResult.unknownFilieres.join(', ')}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-brand-error font-medium">
                  ❌ Erreur lors de l'import
                </p>
                <p className="text-sm text-muted-foreground">
                  {importResult.error}
                </p>
              </div>
            )}
          </BrutalCardContent>
        </BrutalCard>
      )}

      {/* Dialog de vérification RIB */}
      <RibVerificationStep
        isOpen={showRibVerification}
        onConfirm={handleRibConfirmed}
        onCancel={handleRibCancelled}
      />
    </div>
  );
}