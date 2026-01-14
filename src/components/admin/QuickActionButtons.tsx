import React from 'react';
import { BrutalButton } from '@/components/ui/brutal-button';
import { useNavigate } from 'react-router-dom';
import { Users, FileText, Building, BookOpen, CreditCard, Settings, BarChart3 } from 'lucide-react';

export function QuickActionButtons() {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-3 gap-4">
      <BrutalButton 
        variant="education"
        onClick={() => navigate('/admin/users')}
        className="h-20 flex-col"
      >
        <Users className="h-6 w-6 mb-2" />
        Utilisateurs
      </BrutalButton>
      
      <BrutalButton 
        variant="aurlom" 
        onClick={() => navigate('/admin/invoices')}
        className="h-20 flex-col"
      >
        <FileText className="h-6 w-6 mb-2" />
        Factures
      </BrutalButton>
      
      <BrutalButton 
        variant="outline" 
        onClick={() => navigate('/admin/campus')}
        className="h-20 flex-col"
      >
        <Building className="h-6 w-6 mb-2" />
        Campus
      </BrutalButton>
      
      <BrutalButton 
        variant="outline" 
        onClick={() => navigate('/admin/filieres')}
        className="h-20 flex-col"
      >
        <BookOpen className="h-6 w-6 mb-2" />
        Filières
      </BrutalButton>
      
      <BrutalButton 
        variant="outline" 
        onClick={() => navigate('/admin/payments')}
        className="h-20 flex-col"
      >
        <CreditCard className="h-6 w-6 mb-2" />
        Paiements
      </BrutalButton>
      
      <BrutalButton 
        variant="success" 
        onClick={() => navigate('/admin/test-import')}
        className="h-20 flex-col"
      >
        <Settings className="h-6 w-6 mb-2" />
        Setup & Import
      </BrutalButton>
    </div>
  );
}