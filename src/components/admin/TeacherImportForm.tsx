import React, { useState, useRef } from 'react';
import { BrutalCard, BrutalCardContent, BrutalCardHeader, BrutalCardTitle } from '@/components/ui/brutal-card';
import { BrutalButton } from '@/components/ui/brutal-button';
import { BrutalInput } from '@/components/ui/brutal-input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';
import { 
  Users, 
  Upload, 
  Download, 
  CheckCircle,
  AlertCircle,
  FileText
} from 'lucide-react';

interface TeacherImportFormProps {
  onImportComplete?: () => void;
}

export function TeacherImportForm({ onImportComplete }: TeacherImportFormProps) {
  const { user } = useAuth();
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    // Download the real professors list for 2025-2026
    const link = document.createElement('a');
    link.href = '/listing_professeurs_2025_2026_complet.csv';
    link.setAttribute('download', 'listing_professeurs_2025_2026_complet.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  const normalizeCampusName = (campusName: string): string => {
    const normalizations: Record<string, string> = {
      // Mapping flexible des noms de campus
      'SAINT SEB': 'Saint-Sébastien',
      'SAINT-SEB': 'Saint-Sébastien',
      'SAINT SEBASTIEN': 'Saint-Sébastien',
      'JAURES': 'Jaurès',
      'ROQUETTE': 'Roquette',
      'PICPUS': 'Picpus',
      'SENTIER': 'Sentier',
      'DOUAI': 'Douai',
      'PARMENTIER': 'Parmentier',
      'BOULOGNE': 'Boulogne',
      'NICE': 'Nice',
      // Ajout de variations possibles
      'JAURÈS': 'Jaurès',
      'JAURES PARIS': 'Jaurès',
      'ROQUETTE PARIS': 'Roquette',
      'PICPUS PARIS': 'Picpus',
      'SENTIER PARIS': 'Sentier',
      'DOUAI PARIS': 'Douai',
      'PARMENTIER PARIS': 'Parmentier',
      'BOULOGNE PARIS': 'Boulogne',
      'PARIS JAURES': 'Jaurès',
      'PARIS ROQUETTE': 'Roquette',
      'PARIS PICPUS': 'Picpus',
      'PARIS SENTIER': 'Sentier',
      'PARIS DOUAI': 'Douai',
      'PARIS PARMENTIER': 'Parmentier',
      'PARIS BOULOGNE': 'Boulogne'
    };
    
    const normalized = campusName.toUpperCase().trim();
    return normalizations[normalized] || campusName;
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
          const expectedHeaders = ['Nouveau prof ?', 'Prénom', 'NOM', 'MAIL', 'TEL', 'CAMPUS'];
          
          for (let i = 0; i < expectedHeaders.length; i++) {
            if (!header[i] || header[i].trim() !== expectedHeaders[i]) {
              reject(new Error(`En-tête incorrect. Colonne ${i + 1} attendue: "${expectedHeaders[i]}", trouvée: "${header[i] || 'manquante'}"`));
              return;
            }
          }
          
          // Traiter les lignes de professeurs
          const teachers: any[] = [];
          
          for (let i = 1; i < lines.length; i++) {
            const data = parseCSVLine(lines[i]);
            
            if (data.length < expectedHeaders.length) {
              console.warn(`Ligne ${i + 1} ignorée : nombre de colonnes insuffisant`);
              continue;
            }
            
            // Gérer les campus multiples
            const campusText = data[5].trim();
            let campuses: string[] = [];
            
            if (campusText.includes(',')) {
              campuses = campusText.split(',').map(c => normalizeCampusName(c.trim()));
            } else if (campusText) {
              campuses = [normalizeCampusName(campusText)];
            }
            
            const teacher = {
              isNew: data[0].trim().toLowerCase() === 'oui',
              firstName: data[1].trim(),
              lastName: data[2].trim(),
              email: data[3].trim(),
              phone: data[4].trim(),
              campuses: campuses,
              primaryCampus: campuses[0] || null
            };
            
            // Valider l'email
            if (teacher.email && !teacher.email.includes('@')) {
              console.warn(`Ligne ${i + 1} : Email invalide "${teacher.email}"`);
              continue;
            }
            
            if (teacher.firstName && teacher.lastName) {
              teachers.push(teacher);
            }
          }
          
          resolve({
            teachers,
            totalTeachers: teachers.length
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

  const handleImport = async () => {
    if (!csvFile || !user) return;
    setImporting(true);

    try {
      // 1. Parse CSV locally (kept for validation and mapping)
      const csvData = await processCSVFile(csvFile);

      // 2. Invoke secure backend function for admin user creation and DB writes
      const { data, error } = await supabase.functions.invoke('bulk-import-teachers', {
        body: {
          teachers: csvData.teachers,
          filename: csvFile.name,
        },
      });

      if (error) throw error;

      // 3. Display results from backend
      setImportResult({
        success: data?.success,
        totalTeachers: data?.totalTeachers,
        processedTeachers: data?.processedTeachers,
        errors: data?.errors || [],
        unknownCampuses: data?.unknownCampuses || [],
      });

      if (data?.unknownCampuses?.length > 0) {
        toast.warning(`Import terminé: ${data.processedTeachers}/${data.totalTeachers} créés. Campus non trouvés: ${data.unknownCampuses.join(', ')}`);
      } else {
        toast.success(`Import terminé: ${data.processedTeachers}/${data.totalTeachers} créés`);
      }

      onImportComplete?.();
    } catch (error: any) {
      console.error("Erreur lors de l'import:", error);
      toast.error(`Erreur d'import: ${error.message || 'Inconnue'}`);
      setImportResult({ success: false, error: error.message || 'Inconnue' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Template */}
      <BrutalCard>
        <BrutalCardHeader>
          <BrutalCardTitle className="flex items-center">
            <Download className="h-5 w-5 mr-2" />
            Liste Professeurs 2025-2026
          </BrutalCardTitle>
        </BrutalCardHeader>
        <BrutalCardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Téléchargez la liste officielle des professeurs 2025-2026 à importer.
          </p>
          <div className="bg-brand-aurlom-light border-2 border-brand-aurlom rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-brand-aurlom mb-2">Format requis :</h4>
            <div className="text-xs text-brand-aurlom space-y-1 font-mono">
              <div>Nouveau prof ?, Prénom, NOM, MAIL, TEL, CAMPUS</div>
            </div>
            <div className="mt-2 text-xs text-brand-aurlom">
              <p>• <strong>Nouveau prof ?</strong> : "Oui" ou "Non"</p>
              <p>• <strong>CAMPUS</strong> : Peut être multiple séparé par virgule</p>
            </div>
          </div>
          <BrutalButton variant="outline" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Télécharger la liste 2025-2026
          </BrutalButton>
        </BrutalCardContent>
      </BrutalCard>

      {/* Import */}
      <BrutalCard>
        <BrutalCardHeader>
          <BrutalCardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Import Massif Professeurs
          </BrutalCardTitle>
        </BrutalCardHeader>
        <BrutalCardContent className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="csv-file" className="text-sm font-medium">
              Fichier CSV Professeurs
            </label>
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

          <BrutalButton
            onClick={handleImport}
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
                Importer les professeurs
              </>
            )}
          </BrutalButton>
        </BrutalCardContent>
      </BrutalCard>

      {/* Résultat */}
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
              <div className="space-y-3">
                <p className="text-sm text-brand-success font-medium">
                  ✅ Import réussi !
                </p>
                <div className="text-sm space-y-1">
                  <p>• Professeurs traités : {importResult.processedTeachers}/{importResult.totalTeachers}</p>
                  {importResult.unknownCampuses?.length > 0 && (
                    <div className="mt-3 p-3 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                      <p className="font-medium text-yellow-800">Campus non trouvés :</p>
                      <div className="text-xs text-yellow-700">
                        {importResult.unknownCampuses.map((campus: string, index: number) => (
                          <p key={index}>• {campus}</p>
                        ))}
                      </div>
                      <p className="text-xs text-yellow-600 mt-2">
                        Ces professeurs ont été créés sans campus assigné. Vous pouvez les assigner manuellement.
                      </p>
                    </div>
                  )}
                  {importResult.errors?.length > 0 && (
                    <div className="mt-3">
                      <p className="font-medium text-yellow-800">Erreurs rencontrées :</p>
                      <div className="text-xs text-yellow-700 max-h-32 overflow-y-auto">
                        {importResult.errors.slice(0, 5).map((error: string, index: number) => (
                          <p key={index}>• {error}</p>
                        ))}
                        {importResult.errors.length > 5 && (
                          <p>... et {importResult.errors.length - 5} autres</p>
                        )}
                      </div>
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
    </div>
  );
}