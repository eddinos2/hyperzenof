import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useSeasonalThemes, getThemeDisplayName, getThemeDescription } from '@/hooks/useSeasonalThemes';
import { BrutalCard, BrutalCardContent, BrutalCardHeader, BrutalCardTitle } from '@/components/ui/brutal-card';
import { BrutalButton } from '@/components/ui/brutal-button';
import { CatLoader } from '@/components/ui/cat-loader';
import { Calendar, Palette, Sparkles, Check, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface ThemePreview {
  name: string;
  colors: string[];
  gradient: string;
  icon: string;
  preview: string;
}

const themesPreviews: Record<string, ThemePreview> = {
  default: {
    name: 'Default',
    colors: ['#6366f1', '#8b5cf6', '#a855f7'],
    gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
    icon: '🎨',
    preview: 'bg-gradient-to-r from-indigo-500 via-purple-500 to-purple-600'
  },
  halloween: {
    name: 'Halloween',
    colors: ['#f97316', '#000000', '#7c2d12'],
    gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 30%, #000000 70%, #7c2d12 100%)',
    icon: '🎃',
    preview: 'bg-gradient-to-r from-orange-500 via-orange-600 to-black'
  },
  christmas: {
    name: 'Christmas',
    colors: ['#dc2626', '#16a34a', '#eab308'],
    gradient: 'linear-gradient(135deg, #dc2626 0%, #16a34a 50%, #eab308 100%)',
    icon: '🎄',
    preview: 'bg-gradient-to-r from-red-600 via-green-600 to-yellow-500'
  },
  newyear: {
    name: 'New Year',
    colors: ['#eab308', '#6b7280', '#1e40af'],
    gradient: 'linear-gradient(135deg, #eab308 0%, #6b7280 50%, #1e40af 100%)',
    icon: '🎊',
    preview: 'bg-gradient-to-r from-yellow-500 via-gray-500 to-blue-700'
  },
  valentine: {
    name: 'Valentine',
    colors: ['#ec4899', '#dc2626', '#eab308'],
    gradient: 'linear-gradient(135deg, #ec4899 0%, #dc2626 50%, #eab308 100%)',
    icon: '💝',
    preview: 'bg-gradient-to-r from-pink-500 via-red-600 to-yellow-500'
  },
  spring: {
    name: 'Spring',
    colors: ['#22c55e', '#84cc16', '#eab308'],
    gradient: 'linear-gradient(135deg, #22c55e 0%, #84cc16 50%, #eab308 100%)',
    icon: '🌸',
    preview: 'bg-gradient-to-r from-green-500 via-lime-500 to-yellow-500'
  },
  summer: {
    name: 'Summer',
    colors: ['#3b82f6', '#06b6d4', '#eab308'],
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 50%, #eab308 100%)',
    icon: '☀️',
    preview: 'bg-gradient-to-r from-blue-500 via-cyan-500 to-yellow-500'
  }
};

export default function SeasonalThemes() {
  const { profile } = useAuth();
  const { currentTheme, themes, loading, setActiveTheme } = useSeasonalThemes();
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null);
  const [changingTheme, setChangingTheme] = useState<string | null>(null);

  const handleThemeChange = async (themeName: string) => {
    if (changingTheme) return; // Éviter les clics multiples
    
    setChangingTheme(themeName);
    try {
      await setActiveTheme(themeName);
    } catch (error) {
      console.error('Error changing theme:', error);
    } finally {
      setChangingTheme(null);
    }
  };

  const handlePreview = (themeName: string) => {
    setSelectedPreview(selectedPreview === themeName ? null : themeName);
  };

  // Check if user is super admin
  if (profile?.role !== 'SUPER_ADMIN') {
    return (
      <div className="p-6 text-center">
        <div className="text-red-600 mb-4">
          <Palette className="h-12 w-12 mx-auto mb-2" />
          <h2 className="text-xl font-semibold">Accès non autorisé</h2>
          <p className="text-muted-foreground">Seuls les super administrateurs peuvent gérer les thèmes saisonniers.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <CatLoader message="Chargement des thèmes saisonniers..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Calendar className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Thèmes Saisonniers</h1>
          <p className="text-muted-foreground">
            Personnalisez l'apparence de l'application selon les saisons et événements
          </p>
        </div>
      </div>

      {selectedPreview && (
        <BrutalCard className="mb-6 border-2 border-dashed border-primary">
          <BrutalCardHeader>
            <BrutalCardTitle className="flex items-center">
              <Eye className="h-5 w-5 mr-2" />
              Aperçu - {getThemeDisplayName(selectedPreview)}
            </BrutalCardTitle>
          </BrutalCardHeader>
          <BrutalCardContent>
            <div 
              className="h-32 rounded-lg shadow-lg flex items-center justify-center text-white font-semibold text-lg"
              style={{ background: themesPreviews[selectedPreview]?.gradient }}
            >
              <div className="text-center">
                <div className="text-4xl mb-2">{themesPreviews[selectedPreview]?.icon}</div>
                <div>Aperçu du thème {themesPreviews[selectedPreview]?.name}</div>
              </div>
            </div>
          </BrutalCardContent>
        </BrutalCard>
      )}

      <BrutalCard>
        <BrutalCardHeader>
          <BrutalCardTitle className="flex items-center">
            <Sparkles className="h-5 w-5 mr-2" />
            Thèmes Disponibles
          </BrutalCardTitle>
        </BrutalCardHeader>
        <BrutalCardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(themesPreviews).map(([themeName, preview]) => {
              const isActive = currentTheme === themeName;
              const themeData = themes.find(t => t.theme_name === themeName);
              
              return (
                <div
                  key={themeName}
                  className={`relative p-4 rounded-xl border-2 transition-all duration-300 ${
                    isActive 
                      ? 'border-primary bg-primary/5 shadow-lg' 
                      : 'border-border-light hover:border-primary/50'
                  }`}
                >
                  {isActive && (
                    <div className="absolute -top-2 -right-2 bg-primary text-white rounded-full p-1">
                      <Check className="h-4 w-4" />
                    </div>
                  )}
                  
                  <div
                    className={`h-24 rounded-lg mb-4 ${preview.preview} flex items-center justify-center text-white text-3xl shadow-md`}
                  >
                    {preview.icon}
                  </div>
                  
                  <div className="text-center space-y-2">
                    <h3 className="font-semibold text-lg">
                      {getThemeDisplayName(themeName)}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {getThemeDescription(themeName)}
                    </p>
                    
                    <div className="flex items-center justify-center space-x-1 mb-3">
                      {preview.colors.map((color, index) => (
                        <div
                          key={index}
                          className="w-4 h-4 rounded-full border border-white shadow-sm"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    
                    <div className="flex space-x-2">
                      <BrutalButton
                        size="sm"
                        variant={selectedPreview === themeName ? 'destructive' : 'outline'}
                        onClick={() => handlePreview(themeName)}
                        className="flex-1"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        {selectedPreview === themeName ? 'Masquer' : 'Aperçu'}
                      </BrutalButton>
                      
                      {!isActive && (
                      <BrutalButton
                        size="sm"
                        onClick={() => handleThemeChange(themeName)}
                        className="flex-1"
                        disabled={changingTheme === themeName}
                      >
                        <Palette className="h-4 w-4 mr-1" />
                        {changingTheme === themeName ? 'Activation...' : 'Activer'}
                      </BrutalButton>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </BrutalCardContent>
      </BrutalCard>

      <BrutalCard>
        <BrutalCardHeader>
          <BrutalCardTitle>Informations sur les Thèmes</BrutalCardTitle>
        </BrutalCardHeader>
        <BrutalCardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-semibold mb-2">🎨 Thème Actuel</h4>
              <p className="text-sm">{getThemeDisplayName(currentTheme)}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-semibold mb-2">✨ Effet</h4>
              <p className="text-sm">Les changements s'appliquent instantanément à tous les dashboards</p>
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Les thèmes modifient les couleurs, gradients et ambiances de l'application</p>
            <p>• Chaque thème est optimisé pour créer une atmosphère unique</p>
            <p>• Les changements sont visibles immédiatement pour tous les utilisateurs</p>
          </div>
        </BrutalCardContent>
      </BrutalCard>
    </div>
  );
}