import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileUp, Edit } from 'lucide-react';
import { BrutalCard, BrutalCardContent, BrutalCardHeader, BrutalCardTitle } from '@/components/ui/brutal-card';
import { BrutalButton } from '@/components/ui/brutal-button';
import { InvoiceImportForm } from '@/components/invoice/InvoiceImportForm';
import { ManualInvoiceForm } from '@/components/invoice/ManualInvoiceForm';

export default function CreateInvoice() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'manual' | 'import'>('manual');

  const handleImportComplete = () => {
    navigate('/my-invoices');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Créer une Facture</h1>
          <p className="text-lg text-muted-foreground mt-2">
            Saisissez vos prestations ou importez un fichier CSV
          </p>
        </div>
        <Link to="/dashboard">
          <BrutalButton variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </BrutalButton>
        </Link>
      </div>

      {/* Tab Selection */}
      <div className="flex gap-4 border-b-2 border-border-light">
        <button
          onClick={() => setActiveTab('manual')}
          className={`px-6 py-3 font-medium transition-all ${
            activeTab === 'manual'
              ? 'border-b-4 border-brand-aurlom text-brand-aurlom'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Edit className="h-4 w-4 inline mr-2" />
          Saisie manuelle
        </button>
        <button
          onClick={() => setActiveTab('import')}
          className={`px-6 py-3 font-medium transition-all ${
            activeTab === 'import'
              ? 'border-b-4 border-brand-aurlom text-brand-aurlom'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileUp className="h-4 w-4 inline mr-2" />
          Import CSV
        </button>
      </div>

      {/* Manual Entry */}
      {activeTab === 'manual' && (
        <ManualInvoiceForm onImportComplete={handleImportComplete} />
      )}

      {/* CSV Import */}
      {activeTab === 'import' && (
        <>
          <BrutalCard>
            <BrutalCardHeader>
              <BrutalCardTitle className="flex items-center">
                <FileUp className="h-5 w-5 mr-2" />
                Instructions d'Import
              </BrutalCardTitle>
            </BrutalCardHeader>
            <BrutalCardContent>
              <div className="space-y-3 text-sm">
                <p>Pour créer votre facture, veuillez préparer un fichier CSV contenant les colonnes suivantes :</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong>MOIS</strong> : Le mois de la prestation (ex: SEPTEMBRE)</li>
                  <li><strong>DATE</strong> : La date complète (ex: mardi 3 septembre 2025)</li>
                  <li><strong>HEURE DÉBUT</strong> et <strong>HEURE FIN</strong> : Les heures au format HH:MM:SS</li>
                  <li><strong>CAMPUS</strong> : Le campus où la prestation a eu lieu</li>
                  <li><strong>FILIÈRE</strong> : La filière concernée</li>
                  <li><strong>CLASSE</strong> : La classe concernée</li>
                  <li><strong>INTITULÉ DU COURS</strong> : Le titre du cours enseigné</li>
                  <li><strong>RETARD ?</strong> : Statut du retard (Aucun, 0-15 min, 16-30 min, etc.)</li>
                  <li><strong>QUANTITÉ</strong> : Nombre d'heures (ex: 1,5)</li>
                  <li><strong>PRIX UNITAIRE TTC</strong> : Prix par heure (ex: 60,00 €)</li>
                  <li><strong>TOTAL TTC</strong> : Montant total de la ligne (ex: 90,00 €)</li>
                </ul>
              </div>
            </BrutalCardContent>
          </BrutalCard>

          <InvoiceImportForm onImportComplete={handleImportComplete} />
        </>
      )}
    </div>
  );
}
