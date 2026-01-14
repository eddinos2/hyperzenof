import React, { useState, useEffect } from 'react';
import { BrutalButton } from '@/components/ui/brutal-button';
import { BrutalCard, BrutalCardContent, BrutalCardHeader, BrutalCardTitle } from '@/components/ui/brutal-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Save, Send, Calendar, Clock, MapPin, BookOpen, GraduationCap, DollarSign, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { loadReferenceData, ReferenceData } from '@/utils/referenceDataParser';
import { useNavigate } from 'react-router-dom';
import { RibVerificationStep } from './RibVerificationStep';
import { Badge } from '@/components/ui/badge';

interface InvoiceLine {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  campus: string;
  filiere: string;
  classe: string;
  courseTitle: string;
  isLate: string;
  quantity: string;
  unitPrice: string;
  total: string;
}

interface ManualInvoiceFormProps {
  onImportComplete?: () => void;
}

export function ManualInvoiceForm({ onImportComplete }: ManualInvoiceFormProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [referenceData, setReferenceData] = useState<ReferenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [lines, setLines] = useState<InvoiceLine[]>([
    {
      id: crypto.randomUUID(),
      date: '',
      startTime: '',
      endTime: '',
      campus: '',
      filiere: '',
      classe: '',
      courseTitle: '',
      isLate: 'Aucun',
      quantity: '',
      unitPrice: '60',
      total: '0',
    },
  ]);
  const [showRibVerification, setShowRibVerification] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadReferenceData().then((data) => {
      setReferenceData(data);
      setLoading(false);
    });
  }, []);

  const calculateQuantity = (startTime: string, endTime: string): string => {
    if (!startTime || !endTime) return '';
    
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    
    const diffMinutes = endMinutes - startMinutes;
    const hours = diffMinutes / 60;
    
    return hours.toFixed(2).replace('.', ',');
  };

  const calculateTotal = (quantity: string, unitPrice: string): string => {
    const qty = parseFloat(quantity.replace(',', '.')) || 0;
    const price = parseFloat(unitPrice.replace(',', '.')) || 0;
    return (qty * price).toFixed(2).replace('.', ',');
  };

  const updateLine = (id: string, field: keyof InvoiceLine, value: string) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== id) return line;

        const updated = { ...line, [field]: value };

        // Auto-calculate quantity when times change
        if (field === 'startTime' || field === 'endTime') {
          updated.quantity = calculateQuantity(updated.startTime, updated.endTime);
          updated.total = calculateTotal(updated.quantity, updated.unitPrice);
        }

        // Auto-calculate total when quantity or price changes
        if (field === 'quantity' || field === 'unitPrice') {
          updated.total = calculateTotal(updated.quantity, updated.unitPrice);
        }

        return updated;
      })
    );
  };

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        date: '',
        startTime: '',
        endTime: '',
        campus: '',
        filiere: '',
        classe: '',
        courseTitle: '',
        isLate: 'Aucun',
        quantity: '',
        unitPrice: '60',
        total: '0',
      },
    ]);
  };

  const removeLine = (id: string) => {
    if (lines.length === 1) {
      toast.error('Vous devez avoir au moins une ligne');
      return;
    }
    setLines((prev) => prev.filter((line) => line.id !== id));
  };

  const validateForm = (): boolean => {
    if (!month || !year) {
      toast.error('Veuillez sélectionner le mois et l\'année');
      return false;
    }

    for (const line of lines) {
      if (!line.date || !line.startTime || !line.endTime || !line.campus || 
          !line.filiere || !line.courseTitle || !line.quantity || !line.unitPrice) {
        toast.error('Veuillez remplir tous les champs obligatoires');
        return false;
      }
    }

    return true;
  };

  const handlePreSubmit = async () => {
    if (!validateForm()) return;
    setShowRibVerification(true);
  };

  const handleSubmit = async (isDraft: boolean = false) => {
    if (!user || !validateForm()) return;

    setIsSubmitting(true);

    try {
      // Get user's campus
      const { data: profile } = await supabase
        .from('profiles')
        .select('campus_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.campus_id) {
        toast.error('Campus non trouvé dans votre profil');
        return;
      }

      // Prepare invoice data
      const invoiceData = {
        teacher_id: user.id,
        month,
        year,
        campus_id: profile.campus_id,
        status: 'pending' as const,
        is_locked: false,
      };

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoice')
        .insert([invoiceData])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Prepare invoice lines
      const invoiceLines = lines.map((line) => ({
        invoice_id: invoice.id,
        date: line.date,
        start_time: line.startTime,
        end_time: line.endTime,
        campus_id: profile.campus_id,
        filiere_id: null, // Will be matched later
        class_id: null, // Will be matched later
        course_title: line.courseTitle,
        is_late: line.isLate !== 'Aucun',
        hours_qty: parseFloat(line.quantity.replace(',', '.')),
        unit_price: parseFloat(line.unitPrice.replace(',', '.')),
        validation_status: 'pending',
      }));

      // Insert invoice lines
      const { error: linesError } = await supabase
        .from('invoice_line')
        .insert(invoiceLines);

      if (linesError) throw linesError;

      // Calculate totals
      const totalTTC = lines.reduce((sum, line) => {
        return sum + parseFloat(line.total.replace(',', '.'));
      }, 0);

      // Update invoice with totals
      await supabase
        .from('invoice')
        .update({
          total_ttc: totalTTC,
          total_ht: totalTTC / 1.2,
        })
        .eq('id', invoice.id);

      toast.success(
        isDraft
          ? 'Facture enregistrée en brouillon'
          : 'Facture soumise avec succès'
      );

      if (onImportComplete) {
        onImportComplete();
      } else {
        navigate('/my-invoices');
      }
    } catch (error) {
      console.error('Error submitting invoice:', error);
      toast.error('Erreur lors de la soumission de la facture');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div>Chargement des données de référence...</div>;
  }

  if (showRibVerification) {
    return (
      <RibVerificationStep
        isOpen={showRibVerification}
        onConfirm={() => handleSubmit(false)}
        onCancel={() => setShowRibVerification(false)}
      />
    );
  }

  const totalAmount = lines.reduce(
    (sum, line) => sum + parseFloat(line.total.replace(',', '.') || '0'),
    0
  );

  return (
    <div className="space-y-8">
      {/* Header with Progress */}
      <div className="bg-gradient-to-r from-brand-aurlom/10 to-brand-education/10 border-2 border-brand-aurlom rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-brand-aurlom text-white rounded-lg border-2 border-foreground shadow-brutal">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-2xl font-bold">Saisie de vos prestations</h3>
              <p className="text-sm text-muted-foreground mt-1">Remplissez les informations de chaque cours dispensé</p>
            </div>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            {lines.length} ligne{lines.length > 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Month and Year Selection - Inline */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-background/80 p-4 rounded-lg border-2 border-border-light">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="h-4 w-4 text-brand-aurlom" />
              Mois de facturation *
            </Label>
            <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background">
                {referenceData?.mois.map((m, idx) => (
                  <SelectItem key={idx} value={(idx + 1).toString()}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="h-4 w-4 text-brand-aurlom" />
              Année *
            </Label>
            <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background">
                {[2024, 2025, 2026].map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Invoice Lines */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold">Vos prestations</h3>
          <BrutalButton onClick={addLine} size="default" variant="success">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une prestation
          </BrutalButton>
        </div>

        <div className="space-y-6">
          {lines.map((line, index) => (
            <BrutalCard key={line.id} className="relative overflow-hidden">
              {/* Line Number Badge */}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <Badge className="bg-brand-aurlom text-white border-0">
                  Prestation #{index + 1}
                </Badge>
                {lines.length > 1 && (
                  <BrutalButton
                    onClick={() => removeLine(line.id)}
                    size="sm"
                    variant="destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </BrutalButton>
                )}
              </div>

              <BrutalCardContent className="pt-6">
                {/* Date & Time Section */}
                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-2 text-sm font-semibold text-brand-aurlom mb-3">
                    <Calendar className="h-4 w-4" />
                    <span>Date et horaires</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-xs">
                        <Calendar className="h-3 w-3" />
                        Date de prestation *
                      </Label>
                      <Input
                        type="date"
                        value={line.date}
                        onChange={(e) => updateLine(line.id, 'date', e.target.value)}
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-xs">
                        <Clock className="h-3 w-3" />
                        Heure de début *
                      </Label>
                      <Select
                        value={line.startTime}
                        onValueChange={(v) => updateLine(line.id, 'startTime', v)}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent className="bg-background max-h-60">
                          {referenceData?.horaires.map((h) => (
                            <SelectItem key={h} value={h}>
                              <Clock className="h-3 w-3 inline mr-2" />
                              {h}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-xs">
                        <Clock className="h-3 w-3" />
                        Heure de fin *
                      </Label>
                      <Select
                        value={line.endTime}
                        onValueChange={(v) => updateLine(line.id, 'endTime', v)}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent className="bg-background max-h-60">
                          {referenceData?.horaires.map((h) => (
                            <SelectItem key={h} value={h}>
                              <Clock className="h-3 w-3 inline mr-2" />
                              {h}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Location Section */}
                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-2 text-sm font-semibold text-brand-education mb-3">
                    <MapPin className="h-4 w-4" />
                    <span>Lieu et classe</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-xs">
                        <MapPin className="h-3 w-3" />
                        Campus *
                      </Label>
                      <Select
                        value={line.campus}
                        onValueChange={(v) => updateLine(line.id, 'campus', v)}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Choisir un campus" />
                        </SelectTrigger>
                        <SelectContent className="bg-background">
                          {referenceData?.campus.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-xs">
                        <BookOpen className="h-3 w-3" />
                        Filière *
                      </Label>
                      <Select
                        value={line.filiere}
                        onValueChange={(v) => updateLine(line.id, 'filiere', v)}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Choisir une filière" />
                        </SelectTrigger>
                        <SelectContent className="bg-background max-h-60">
                          {referenceData?.filieres.map((f) => (
                            <SelectItem key={f} value={f}>
                              {f}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-xs">
                        <GraduationCap className="h-3 w-3" />
                        Classe
                      </Label>
                      <Select
                        value={line.classe}
                        onValueChange={(v) => updateLine(line.id, 'classe', v)}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Choisir une classe" />
                        </SelectTrigger>
                        <SelectContent className="bg-background max-h-60">
                          {referenceData?.classes.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Course Section */}
                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-2 text-sm font-semibold text-brand-success mb-3">
                    <BookOpen className="h-4 w-4" />
                    <span>Détails du cours</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label className="flex items-center gap-2 text-xs">
                        <BookOpen className="h-3 w-3" />
                        Intitulé du cours *
                      </Label>
                      <Select
                        value={line.courseTitle}
                        onValueChange={(v) => updateLine(line.id, 'courseTitle', v)}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Sélectionner le cours" />
                        </SelectTrigger>
                        <SelectContent className="bg-background max-h-60">
                          {referenceData?.cours.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-xs">
                        <AlertCircle className="h-3 w-3" />
                        Retard
                      </Label>
                      <Select
                        value={line.isLate}
                        onValueChange={(v) => updateLine(line.id, 'isLate', v)}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background">
                          {referenceData?.retards.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Financial Section */}
                <div className="space-y-4 bg-muted/50 p-4 rounded-lg border-2 border-border-light">
                  <div className="flex items-center gap-2 text-sm font-semibold text-brand-warning mb-3">
                    <DollarSign className="h-4 w-4" />
                    <span>Informations financières</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-xs">
                        <Clock className="h-3 w-3" />
                        Quantité (heures)
                      </Label>
                      <div className="relative">
                        <Input
                          value={line.quantity}
                          onChange={(e) => updateLine(line.id, 'quantity', e.target.value)}
                          placeholder="Auto-calculé"
                          className="h-11 font-mono"
                        />
                        {line.quantity && (
                          <CheckCircle2 className="absolute right-3 top-3 h-5 w-5 text-green-500" />
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-xs">
                        <DollarSign className="h-3 w-3" />
                        Prix unitaire (€)
                      </Label>
                      <Input
                        value={line.unitPrice}
                        onChange={(e) => updateLine(line.id, 'unitPrice', e.target.value)}
                        className="h-11 font-mono"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-xs font-semibold">
                        <DollarSign className="h-3 w-3" />
                        Total (€)
                      </Label>
                      <Input 
                        value={line.total} 
                        readOnly 
                        className="h-11 bg-brand-success/10 border-brand-success font-mono font-bold text-brand-success"
                      />
                    </div>
                  </div>
                </div>
              </BrutalCardContent>
            </BrutalCard>
          ))}
        </div>
      </div>

      {/* Summary and Actions */}
      <BrutalCard className="sticky bottom-4 bg-background/95 backdrop-blur shadow-brutal-lg">
        <BrutalCardContent className="py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-6">
              <div className="text-center md:text-left">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total général</p>
                <p className="text-4xl font-bold text-brand-aurlom">{totalAmount.toFixed(2)} €</p>
              </div>
              <div className="h-12 w-px bg-border-light" />
              <div className="text-center md:text-left">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Prestations</p>
                <p className="text-2xl font-bold">
                  {lines.length} ligne{lines.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <BrutalButton
                onClick={() => handleSubmit(true)}
                variant="outline"
                disabled={isSubmitting}
                className="flex-1 md:flex-none h-12"
              >
                <Save className="h-5 w-5 mr-2" />
                Enregistrer brouillon
              </BrutalButton>
              <BrutalButton
                onClick={handlePreSubmit}
                variant="success"
                disabled={isSubmitting}
                className="flex-1 md:flex-none h-12 text-lg"
              >
                <Send className="h-5 w-5 mr-2" />
                Soumettre la facture
              </BrutalButton>
            </div>
          </div>
        </BrutalCardContent>
      </BrutalCard>
    </div>
  );
}
