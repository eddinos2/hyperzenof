import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SeasonalTheme {
  id: string;
  theme_name: string;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
}

interface SeasonalThemeContextType {
  currentTheme: string;
  themes: SeasonalTheme[];
  loading: boolean;
  setActiveTheme: (themeName: string) => Promise<void>;
  fetchThemes: () => Promise<void>;
}

const SeasonalThemeContext = createContext<SeasonalThemeContextType | undefined>(undefined);

export function SeasonalThemeProvider({ children }: { children: ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState('default');
  const [themes, setThemes] = useState<SeasonalTheme[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchThemes = async () => {
    try {
      const { data, error } = await supabase
        .from('seasonal_themes')
        .select('*')
        .order('created_at');

      if (error) throw error;

      setThemes(data || []);
      
      // Find active theme
      const activeTheme = data?.find(theme => theme.is_active);
      if (activeTheme) {
        setCurrentTheme(activeTheme.theme_name);
        applyTheme(activeTheme.theme_name);
      }
    } catch (error) {
      console.error('Error fetching themes:', error);
    } finally {
      setLoading(false);
    }
  };

  const setActiveTheme = async (themeName: string) => {
    try {
      console.log(`Activating theme: ${themeName}`);
      
      // Utiliser la fonction RPC pour éviter les conflits
      const { error } = await supabase.rpc('set_active_theme', {
        p_theme_name: themeName
      });

      if (error) throw error;

      // Mettre à jour l'état local immédiatement
      setCurrentTheme(themeName);
      applyTheme(themeName);
      
      console.log(`Theme ${themeName} activated successfully`);
      toast.success(`Thème "${getThemeDisplayName(themeName)}" activé`);
      
      // Recharger les données pour synchroniser
      setTimeout(() => fetchThemes(), 100);
    } catch (error) {
      console.error('Error setting active theme:', error);
      toast.error('Erreur lors du changement de thème');
      // Recharger en cas d'erreur pour remettre l'état correct
      await fetchThemes();
    }
  };

  const applyTheme = (themeName: string) => {
    // Remove all theme classes
    document.body.classList.remove(
      'theme-halloween', 'theme-christmas', 'theme-newyear', 
      'theme-valentine', 'theme-spring', 'theme-summer'
    );

    // Apply new theme class with a small delay to ensure proper removal
    setTimeout(() => {
      if (themeName !== 'default') {
        document.body.classList.add(`theme-${themeName}`);
      }
    }, 10);
  };

  useEffect(() => {
    fetchThemes();

    // Écouter les changements temps réel
    const channel = supabase
      .channel('seasonal-themes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'seasonal_themes'
        },
        (payload) => {
          console.log('Theme change detected:', payload);
          fetchThemes(); // Recharger les thèmes quand il y a un changement
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <SeasonalThemeContext.Provider value={{
      currentTheme,
      themes,
      loading,
      setActiveTheme,
      fetchThemes
    }}>
      {children}
    </SeasonalThemeContext.Provider>
  );
}

export function useSeasonalThemes() {
  const context = useContext(SeasonalThemeContext);
  if (context === undefined) {
    throw new Error('useSeasonalThemes must be used within a SeasonalThemeProvider');
  }
  return context;
}

export function getThemeDisplayName(themeName: string): string {
  const themeNames: Record<string, string> = {
    default: 'Thème par défaut',
    halloween: 'Halloween 🎃',
    christmas: 'Noël 🎄',
    newyear: 'Nouvel An 🎊',
    valentine: 'Saint-Valentin 💝',
    spring: 'Printemps 🌸',
    summer: 'Été ☀️'
  };
  return themeNames[themeName] || themeName;
}

export function getThemeDescription(themeName: string): string {
  const descriptions: Record<string, string> = {
    default: 'Le thème standard de l\'application',
    halloween: 'Thème sombre avec des oranges et noirs mystérieux',
    christmas: 'Thème festif avec des rouges, verts et dorés chaleureux',
    newyear: 'Thème élégant avec des dorés, argentés et bleus scintillants',
    valentine: 'Thème romantique avec des roses, rouges et dorés',
    spring: 'Thème frais avec des verts tendres et roses pastel',
    summer: 'Thème vibrant avec des bleus océan et jaunes solaires'
  };
  return descriptions[themeName] || '';
}