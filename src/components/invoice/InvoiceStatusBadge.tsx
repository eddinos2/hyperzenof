import React from 'react';
import { Clock, CheckCircle, CreditCard, AlertCircle, XCircle } from 'lucide-react';

interface InvoiceStatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

export function InvoiceStatusBadge({ status, size = 'md' }: InvoiceStatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          label: 'En attente',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-600',
          icon: Clock,
        };
      case 'prevalidated':
        return {
          label: 'Prévalidée',
          color: 'bg-brand-aurlom-light text-brand-aurlom border-brand-aurlom', 
          icon: AlertCircle,
        };
      case 'validated':
        return {
          label: 'Validée',
          color: 'bg-green-100 text-green-800 border-green-600',
          icon: CheckCircle,
        };
      case 'paid':
        return {
          label: 'Payée',
          color: 'bg-emerald-100 text-emerald-800 border-emerald-600',
          icon: CreditCard,
        };
      case 'rejected':
        return {
          label: 'Rejetée',
          color: 'bg-red-100 text-red-800 border-red-600',
          icon: XCircle,
        };
      default:
        return {
          label: status,
          color: 'bg-gray-100 text-gray-800 border-gray-600',
          icon: AlertCircle,
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4', 
    lg: 'h-5 w-5',
  };

  return (
    <span className={`
      inline-flex items-center rounded font-medium border-2
      ${config.color}
      ${sizeClasses[size]}
    `}>
      <Icon className={`${iconSizes[size]} mr-1`} />
      {config.label}
    </span>
  );
}