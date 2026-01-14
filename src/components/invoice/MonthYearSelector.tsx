import React from 'react';
import { BrutalInput } from '@/components/ui/brutal-input';
import { Label } from '@/components/ui/label';
import { Calendar } from 'lucide-react';

interface MonthYearSelectorProps {
  selectedMonth: number;
  selectedYear: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  disabled?: boolean;
}

export function MonthYearSelector({
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
  disabled = false
}: MonthYearSelectorProps) {
  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => currentYear - 1 + i); // Année précédente, courante, suivante

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="h-4 w-4 text-brand-aurlom" />
        <Label className="font-semibold text-brand-aurlom">
          Période de facturation *
        </Label>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="month-select">Mois</Label>
          <select
            id="month-select"
            value={selectedMonth}
            onChange={(e) => onMonthChange(parseInt(e.target.value))}
            disabled={disabled}
            className="w-full p-3 border-2 border-foreground bg-background rounded-lg text-foreground shadow-brutal disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {months.map((month, index) => (
              <option key={index + 1} value={index + 1}>
                {month}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="year-select">Année</Label>
          <select
            id="year-select"
            value={selectedYear}
            onChange={(e) => onYearChange(parseInt(e.target.value))}
            disabled={disabled}
            className="w-full p-3 border-2 border-foreground bg-background rounded-lg text-foreground shadow-brutal disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-brand-aurlom/10 border-2 border-brand-aurlom/30 rounded-lg p-3">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-brand-aurlom">Important :</span> Sélectionnez le mois et l'année 
          correspondant à la période de vos prestations. Cette information est obligatoire pour la traçabilité 
          administrative et sera visible dans le système de gestion.
        </p>
      </div>
    </div>
  );
}