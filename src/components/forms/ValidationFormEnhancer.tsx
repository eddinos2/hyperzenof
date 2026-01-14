import React from 'react';
import { BrutalInput } from '@/components/ui/brutal-input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface ValidationRule {
  type: 'required' | 'email' | 'minLength' | 'maxLength' | 'pattern';
  value?: any;
  message: string;
}

interface ValidationFormEnhancerProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  rules?: ValidationRule[];
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'number';
  showValidation?: boolean;
}

export function ValidationFormEnhancer({ 
  label, 
  name, 
  value, 
  onChange, 
  rules = [], 
  placeholder, 
  type = 'text',
  showValidation = true 
}: ValidationFormEnhancerProps) {
  
  const validateField = (val: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    rules.forEach(rule => {
      switch (rule.type) {
        case 'required':
          if (!val.trim()) {
            errors.push(rule.message);
          }
          break;
        case 'email':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (val && !emailRegex.test(val)) {
            errors.push(rule.message);
          }
          break;
        case 'minLength':
          if (val.length < rule.value) {
            errors.push(rule.message);
          }
          break;
        case 'maxLength':
          if (val.length > rule.value) {
            errors.push(rule.message);
          }
          break;
        case 'pattern':
          const regex = new RegExp(rule.value);
          if (val && !regex.test(val)) {
            errors.push(rule.message);
          }
          break;
      }
    });
    
    return { isValid: errors.length === 0, errors };
  };

  const validation = validateField(value);
  const hasValue = value.trim().length > 0;

  return (
    <div className="space-y-2">
      <Label htmlFor={name} className="flex items-center gap-2">
        {label}
        {rules.some(r => r.type === 'required') && (
          <Badge variant="destructive" className="text-xs">Requis</Badge>
        )}
      </Label>
      
      <div className="relative">
        <BrutalInput
          id={name}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`pr-10 ${
            showValidation && hasValue
              ? validation.isValid 
                ? 'border-green-500 focus:border-green-600' 
                : 'border-red-500 focus:border-red-600'
              : ''
          }`}
        />
        
        {showValidation && hasValue && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {validation.isValid ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
          </div>
        )}
      </div>
      
      {showValidation && validation.errors.length > 0 && (
        <div className="space-y-1">
          {validation.errors.map((error, index) => (
            <p key={index} className="text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {error}
            </p>
          ))}
        </div>
      )}
      
      {showValidation && hasValue && validation.isValid && (
        <p className="text-sm text-green-600 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Valide
        </p>
      )}
    </div>
  );
}