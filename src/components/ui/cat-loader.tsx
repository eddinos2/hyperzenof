import React from 'react';
import catLoading from '@/assets/cat-loading.gif';

interface CatLoaderProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showRing?: boolean;
}

export function CatLoader({ 
  message = "Chargement...", 
  size = 'md',
  className = "",
  showRing = true
}: CatLoaderProps) {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16', 
    lg: 'w-24 h-24'
  };

  const ringSizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-20 h-20',
    lg: 'w-28 h-28'
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
      <div className="relative flex items-center justify-center">
        {/* Animated Loading Ring */}
        {showRing && (
          <div className={`absolute ${ringSizeClasses[size]} rounded-full border-4 border-t-brand-aurlom border-r-transparent border-b-brand-education border-l-transparent animate-spin`}></div>
        )}
        
        {/* Cat GIF Container - Circular */}
        <div className={`relative ${sizeClasses[size]} rounded-full overflow-hidden border-2 border-white shadow-brutal bg-white`}>
          <img 
            src={catLoading}
            alt="GIF de chat - chargement"
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover scale-110"
          />
        </div>
        
        {/* Inner pulse ring */}
        {showRing && (
          <div className={`absolute ${sizeClasses[size]} rounded-full border-2 border-brand-success/30 animate-ping`}></div>
        )}
      </div>
      
      {/* Loading message with typing animation */}
      <div className="text-center">
        <p className="text-muted-foreground animate-fade-in mb-2">{message}</p>
        <div className="flex justify-center space-x-1">
          <div className="w-1.5 h-1.5 bg-brand-aurlom rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-1.5 h-1.5 bg-brand-education rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-1.5 h-1.5 bg-brand-success rounded-full animate-bounce"></div>
        </div>
      </div>
    </div>
  );
}