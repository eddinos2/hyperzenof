import React from 'react';
import { Clock, CheckCircle, CreditCard, AlertCircle, XCircle, FileText } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function StatusBadge({ status, size = 'md', showIcon = true }: StatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return {
          label: 'En attente',
          color: 'status-pending',
          icon: Clock,
        };
      case 'prevalidated':
        return {
          label: 'Prévalidée',
          color: 'status-prevalidated', 
          icon: AlertCircle,
        };
      case 'validated':
        return {
          label: 'Validée',
          color: 'status-validated',
          icon: CheckCircle,
        };
      case 'paid':
        return {
          label: 'Payée',
          color: 'status-paid',
          icon: CreditCard,
        };
      case 'rejected':
        return {
          label: 'Rejetée',
          color: 'status-rejected',
          icon: XCircle,
        };
      default:
        return {
          label: status,
          color: 'bg-gray-100 text-gray-800 border-gray-600',
          icon: FileText,
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
      status-badge ${config.color}
      ${sizeClasses[size]}
    `}>
      {showIcon && <Icon className={`${iconSizes[size]} ${config.label ? 'mr-1' : ''}`} />}
      {config.label}
    </span>
  );
}