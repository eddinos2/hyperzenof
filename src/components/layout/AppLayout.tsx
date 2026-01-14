import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useSeasonalThemes } from '@/hooks/useSeasonalThemes';
import { LoginForm } from '@/components/auth/LoginForm';
import { Navigation } from '@/components/layout/Navigation';
import { Footer } from '@/components/layout/Footer';
import { RibMissingNotification } from '@/components/notifications/RibMissingNotification';
import { CatLoader } from '@/components/ui/cat-loader';
import { SeasonalDecorations } from '@/components/ui/seasonal-decorations';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, profile, loading } = useAuth();
  const { currentTheme } = useSeasonalThemes();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <CatLoader message="Chargement..." size="lg" />
      </div>
    );
  }

  if (!user || !profile) {
    return <LoginForm />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <SeasonalDecorations theme={currentTheme} />
      <div className="flex flex-1 relative z-10">
        <Navigation />
        <main className="flex-1 overflow-auto">
          <RibMissingNotification />
          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
}