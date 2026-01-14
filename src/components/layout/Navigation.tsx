import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { BrutalButton } from '@/components/ui/brutal-button';
import { NotificationSystemSimple } from '@/components/notifications/NotificationSystemSimple';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Building, 
  CreditCard,
  LogOut,
  Settings,
  GraduationCap,
  Receipt,
  BookOpen,
  BarChart,
  Calendar
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import logoAurlomBts from '@/assets/logo-aurlom-bts.png';

export function Navigation() {
  const { profile, signOut } = useAuth();
  const location = useLocation();

  if (!profile) return null;

  const isActive = (path: string) => location.pathname === path;

  const navigationItems = {
    SUPER_ADMIN: [
      { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { path: '/admin/invoices', icon: FileText, label: 'Factures' },
      { path: '/admin/users', icon: Users, label: 'Utilisateurs' },
      { path: '/admin/campus', icon: Building, label: 'Campus' },
      { path: '/admin/filieres', icon: BookOpen, label: 'Filières' },
      { path: '/admin/classes', icon: GraduationCap, label: 'Classes' },
      { path: '/admin/payments', icon: CreditCard, label: 'Paiements' },
      { path: '/admin/themes', icon: Calendar, label: 'Thèmes Saisonniers' },
      { path: '/admin/analytics', icon: BarChart, label: 'BI Dashboard' },
      
    ],
    COMPTABLE: [
      { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { path: '/admin/invoices', icon: FileText, label: 'Factures' },
      { path: '/admin/payments', icon: CreditCard, label: 'Paiements' },
      { path: '/admin/analytics', icon: BarChart, label: 'BI Dashboard' },
    ],
    DIRECTEUR_CAMPUS: [
      { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { path: '/admin/invoices', icon: FileText, label: 'Factures' },
      { path: '/admin/director', icon: Users, label: 'Gestion Campus' },
      { path: '/admin/classes', icon: GraduationCap, label: 'Classes' },
      { path: '/admin/analytics', icon: BarChart, label: 'BI Dashboard' },
    ],
    ENSEIGNANT: [
      { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { path: '/my-invoices', icon: FileText, label: 'Mes Factures' },
      { path: '/create-invoice', icon: FileText, label: 'Créer Facture' },
      { path: '/teacher-profile', icon: Settings, label: 'Profil' },
    ],
  };

  const items = navigationItems[profile.role] || [];

  return (
    <nav className="bg-surface border-r-4 border-foreground min-h-screen w-64 flex flex-col shadow-brutal">
      <div className="p-4 border-b-4 border-foreground">
        <div className="mb-3">
          <img 
            src={logoAurlomBts} 
            alt="AURLOM BTS+" 
            className="w-full h-auto mb-2"
          />
          <p className="text-[10px] text-muted-foreground text-center font-medium">
            Powered by <span className="font-bold text-brand-aurlom">Hyperzen</span>
          </p>
        </div>
        <div className="p-2 bg-muted border-2 border-foreground rounded-lg">
          <p className="text-xs text-muted-foreground uppercase tracking-wide text-center font-bold">
            {profile.role.replace('_', ' ')}
          </p>
        </div>
      </div>

      <div className="flex-1 px-4">
        <div className="space-y-2">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.path} to={item.path}>
                <BrutalButton
                  variant={isActive(item.path) ? "default" : "ghost"}
                  className="w-full justify-start"
                  size="default"
                >
                  <Icon className="h-4 w-4 mr-3" />
                  {item.label}
                </BrutalButton>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="p-4 mt-auto">
        <div className="p-3 border-2 border-foreground bg-muted rounded-lg mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                {profile.first_name} {profile.last_name}
              </p>
              <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
            </div>
            <NotificationSystemSimple />
          </div>
        </div>
        
        <BrutalButton
          variant="outline"
          className="w-full"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Déconnexion
        </BrutalButton>
      </div>
    </nav>
  );
}