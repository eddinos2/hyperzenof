import React from 'react';
import { BrutalButton } from '@/components/ui/brutal-button';
import { Download, FileText, Printer } from 'lucide-react';
import { toast } from 'sonner';

interface InvoiceData {
  id: string;
  month: number;
  year: number;
  total_ttc: number;
  status: string;
  created_at: string;
  teacher_profile?: {
    first_name: string;
    last_name: string;
    email: string;
    rib_iban?: string;
    rib_bic?: string;
    rib_account_holder?: string;
    rib_bank_name?: string;
  };
  campus?: {
    name: string;
    address: string;
  };
  invoice_lines?: Array<{
    date: string;
    course_title: string;
    start_time: string;
    end_time: string;
    hours_qty: number;
    unit_price: number;
  }>;
}

interface PDFGeneratorProps {
  invoice: InvoiceData;
  onGenerateSuccess?: () => void;
}

export function PDFGenerator({ invoice, onGenerateSuccess }: PDFGeneratorProps) {
  
  const generatePDFContent = () => {
    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Facture ${invoice.id}</title>
        <style>
          body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            margin: 0; 
            padding: 20px;
            color: #333;
            line-height: 1.6;
          }
          .header { 
            display: flex; 
            justify-content: space-between; 
            align-items: start;
            border-bottom: 3px solid #000;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 28px;
            font-weight: bold;
            color: #000;
          }
          .invoice-info {
            text-align: right;
          }
          .invoice-title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .section {
            margin-bottom: 25px;
          }
          .section-title {
            font-size: 16px;
            font-weight: bold;
            border-bottom: 2px solid #000;
            padding-bottom: 5px;
            margin-bottom: 15px;
          }
          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          th, td {
            border: 2px solid #000;
            padding: 10px;
            text-align: left;
          }
          th {
            background-color: #f0f0f0;
            font-weight: bold;
          }
          .totals {
            width: 300px;
            margin-left: auto;
            margin-top: 20px;
          }
          .totals td {
            padding: 8px 12px;
          }
          .total-final {
            font-weight: bold;
            font-size: 18px;
            background-color: #f0f0f0;
          }
          .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border: 2px solid #000;
            background-color: ${getStatusColor(invoice.status)};
            font-weight: bold;
            margin-top: 10px;
          }
          .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #ccc;
            font-size: 12px;
            color: #666;
          }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">AURLOM BTS+</div>
            <div>Groupe AURLOM BTS+ Éducation</div>
            <div>48 rue de la roquette, 75011 PARIS</div>
          </div>
          <div class="invoice-info">
            <div class="invoice-title">FACTURE</div>
            <div><strong>N° ${invoice.id}</strong></div>
            <div>Date: ${new Date(invoice.created_at).toLocaleDateString('fr-FR')}</div>
            <div class="status-badge">${getStatusLabel(invoice.status)}</div>
          </div>
        </div>

        <div class="grid">
          <div class="section">
            <div class="section-title">FACTURER À</div>
            <div>
              <strong>${invoice.teacher_profile?.first_name} ${invoice.teacher_profile?.last_name}</strong><br>
              ${invoice.teacher_profile?.email}<br>
              Enseignant(e)
            </div>
            ${invoice.teacher_profile?.rib_iban ? `
            <div style="margin-top: 15px; padding: 10px; border: 1px solid #ccc; background-color: #f9f9f9;">
              <div style="font-weight: bold; margin-bottom: 5px;">COORDONNÉES BANCAIRES</div>
              <div><strong>IBAN:</strong> ${invoice.teacher_profile.rib_iban}</div>
              <div><strong>BIC:</strong> ${invoice.teacher_profile.rib_bic || 'N/A'}</div>
              <div><strong>Titulaire:</strong> ${invoice.teacher_profile.rib_account_holder || 'N/A'}</div>
              <div><strong>Banque:</strong> ${invoice.teacher_profile.rib_bank_name || 'N/A'}</div>
            </div>
            ` : ''}
          </div>

          <div class="section">
            <div class="section-title">CAMPUS</div>
            <div>
              <strong>${invoice.campus?.name || 'Non spécifié'}</strong><br>
              ${invoice.campus?.address || ''}
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">PÉRIODE DE FACTURATION</div>
          <div><strong>${monthNames[invoice.month - 1]} ${invoice.year}</strong></div>
        </div>

        <div class="section">
          <div class="section-title">DÉTAIL DES PRESTATIONS</div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Cours</th>
                <th>Horaires</th>
                <th>Heures</th>
                <th>Taux/h</th>
                <th>Total HT</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.invoice_lines?.map(line => `
                <tr>
                  <td>${new Date(line.date).toLocaleDateString('fr-FR')}</td>
                  <td>${line.course_title}</td>
                  <td>${line.start_time} - ${line.end_time}</td>
                  <td>${line.hours_qty.toFixed(2)}h</td>
                  <td>${line.unit_price.toFixed(2)}€</td>
                  <td>${(line.hours_qty * line.unit_price).toFixed(2)}€</td>
                </tr>
              `).join('') || '<tr><td colspan="6">Aucun détail disponible</td></tr>'}
            </tbody>
          </table>

          <table class="totals">
            <tr class="total-final">
              <td><strong>Total:</strong></td>
              <td style="text-align: right;"><strong>${invoice.total_ttc.toFixed(2)}€</strong></td>
            </tr>
            <tr>
              <td colspan="2" style="text-align: center; font-size: 10px; color: #666; padding-top: 10px;">
                <em>Montant à déterminer selon réglementation fiscale en vigueur</em>
              </td>
            </tr>
          </table>
        </div>

        <div class="footer">
          <p>
            <strong>Conditions de paiement:</strong> Paiement à 30 jours.<br>
            <strong>SIRET:</strong> 52789412300012 | <strong>TVA:</strong> FR52789412300012<br>
            Document généré automatiquement par le système AURLOM BTS+ le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
          </p>
        </div>
      </body>
      </html>
    `;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'EN ATTENTE',
      prevalidated: 'PRÉ-VALIDÉE',
      validated: 'VALIDÉE',
      rejected: 'REJETÉE',
      paid: 'PAYÉE'
    };
    return labels[status] || status.toUpperCase();
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: '#fff3cd',
      prevalidated: '#cfe2ff',
      validated: '#d1ecf1',
      rejected: '#f8d7da',
      paid: '#d4edda'
    };
    return colors[status] || '#f8f9fa';
  };

  const generatePDF = async () => {
    try {
      const htmlContent = generatePDFContent();
      
      // Create a new window for PDF generation
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Popup bloqué par le navigateur');
      }
      
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Wait for content to load then trigger print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      };
      
      toast.success('PDF généré avec succès');
      onGenerateSuccess?.();
      
    } catch (error) {
      console.error('Erreur lors de la génération PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
    }
  };

  const downloadHTML = () => {
    try {
      const htmlContent = generatePDFContent();
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `facture-${invoice.id}.html`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      toast.success('Facture téléchargée en HTML');
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      toast.error('Erreur lors du téléchargement');
    }
  };

  const previewInvoice = () => {
    try {
      const htmlContent = generatePDFContent();
      const previewWindow = window.open('', '_blank');
      
      if (!previewWindow) {
        throw new Error('Popup bloqué par le navigateur');
      }
      
      previewWindow.document.write(htmlContent);
      previewWindow.document.close();
      
    } catch (error) {
      console.error('Erreur lors de l\'aperçu:', error);
      toast.error('Erreur lors de l\'aperçu');
    }
  };

  return (
    <div className="flex gap-2">
      <BrutalButton
        variant="outline"
        size="sm"
        onClick={previewInvoice}
      >
        <FileText className="h-4 w-4 mr-2" />
        Aperçu
      </BrutalButton>

      <BrutalButton
        variant="outline"
        size="sm"
        onClick={downloadHTML}
      >
        <Download className="h-4 w-4 mr-2" />
        HTML
      </BrutalButton>

      <BrutalButton
        size="sm"
        onClick={generatePDF}
      >
        <Printer className="h-4 w-4 mr-2" />
        Imprimer PDF
      </BrutalButton>
    </div>
  );
}