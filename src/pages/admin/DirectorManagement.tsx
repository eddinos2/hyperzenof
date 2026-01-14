import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { DirectorCampusManagement } from '@/components/admin/DirectorCampusManagement';
import { BrutalCard, BrutalCardContent, BrutalCardHeader, BrutalCardTitle } from '@/components/ui/brutal-card';
import { CatLoader } from '@/components/ui/cat-loader';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/ui/status-badge';
import { BrutalInput } from '@/components/ui/brutal-input';
import { DataPagination } from '@/components/ui/data-pagination';
import { usePagination } from '@/hooks/usePagination';
import { MonthYearSelector } from '@/components/invoice/MonthYearSelector';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Search,
  Building,
  UserCheck,
  GraduationCap,
  Clock,
  TrendingUp,
  FileText,
  UserPlus,
  Mail,
  Phone,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { getMonthName } from '@/utils/dateUtils';

interface User {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: string;
  is_active: boolean;
  hire_date?: string;
}

interface CampusStats {
  totalTeachers: number;
  activeTeachers: number;
  newTeachers: number;
  totalClasses: number;
  pendingInvoices: number;
  monthlyRevenue: number;
}

export default function DirectorManagement() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<CampusStats>({
    totalTeachers: 0,
    activeTeachers: 0,
    newTeachers: 0,
    totalClasses: 0,
    pendingInvoices: 0,
    monthlyRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filtrage par mois/année (par défaut le mois actuel)
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  useEffect(() => {
    if (profile?.role === 'DIRECTEUR_CAMPUS' && profile.campus_id) {
      fetchCampusData();
    }
  }, [profile, selectedMonth, selectedYear]);

  const fetchCampusData = async () => {
    if (!profile?.campus_id) return;

    try {
      // Récupérer les utilisateurs du campus
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('campus_id', profile.campus_id)
        .eq('is_active', true)
        .order('last_name', { ascending: true });

      if (usersError) throw usersError;

      // Récupérer les statistiques du campus
      const { data: classesData } = await supabase
        .from('class')
        .select('*', { count: 'exact', head: true })
        .eq('campus_id', profile.campus_id)
        .eq('is_active', true);

      // Récupérer les factures en attente pour le campus ce mois
      const { data: pendingInvoicesData } = await supabase
        .from('invoice_line')
        .select(`
          id,
          unit_price,
          hours_qty,
          validation_status,
          invoice!inner(status, month, year)
        `)
        .eq('campus_id', profile.campus_id)
        .eq('invoice.status', 'pending')
        .eq('invoice.month', selectedMonth)
        .eq('invoice.year', selectedYear);

      const teachers = usersData?.filter(u => u.role === 'ENSEIGNANT') || [];
      const newTeachers = teachers.filter(t => t.hire_date && 
        new Date(t.hire_date) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      );

      // Calculer le chiffre d'affaires des factures validées ce mois
      const { data: validatedInvoicesData } = await supabase
        .from('invoice_line')
        .select('unit_price, hours_qty')
        .eq('campus_id', profile.campus_id)
        .eq('validation_status', 'prevalidated')
        .gte('created_at', new Date(selectedYear, selectedMonth - 1, 1).toISOString())
        .lt('created_at', new Date(selectedYear, selectedMonth, 1).toISOString());

      const monthlyRevenue = validatedInvoicesData?.reduce((sum, line) => 
        sum + (parseFloat(line.unit_price.toString()) * parseFloat(line.hours_qty.toString())), 0
      ) || 0;

      setUsers(usersData || []);
      setStats({
        totalTeachers: teachers.length,
        activeTeachers: teachers.filter(t => t.is_active).length,
        newTeachers: newTeachers.length,
        totalClasses: classesData?.length || 0,
        pendingInvoices: pendingInvoicesData?.length || 0,
        monthlyRevenue
      });
    } catch (error: any) {
      console.error('Erreur lors du chargement des données:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const searchText = searchTerm.toLowerCase();
    return searchText === '' || [
      user.first_name?.toLowerCase() || '',
      user.last_name?.toLowerCase() || '',
      user.email?.toLowerCase() || '',
      `${user.first_name} ${user.last_name}`.toLowerCase()
    ].some(field => field.includes(searchText));
  });

  const {
    currentPage,
    totalPages,
    paginatedData: paginatedUsers,
    goToPage
  } = usePagination({
    data: filteredUsers,
    itemsPerPage: 10,
    initialPage: 1
  });

  // Reset to page 1 when search filter changes
  useEffect(() => {
    goToPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      'DIRECTEUR_CAMPUS': { label: 'Directeur', color: 'bg-brand-aurlom-light text-brand-aurlom border-brand-aurlom' },
      'ENSEIGNANT': { label: 'Enseignant', color: 'bg-orange-100 text-orange-800 border-orange-600' },
    };
    
    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig['ENSEIGNANT'];
    
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium border-2 ${config.color}`}>
        {config.label}
      </span>
    );
  };

  if (profile?.role !== 'DIRECTEUR_CAMPUS') {
    return (
      <div className="container-brutal py-8">
        <BrutalCard>
          <BrutalCardContent className="text-center py-8">
            <p className="text-muted-foreground">
              Accès réservé aux Directeurs de Campus
            </p>
          </BrutalCardContent>
        </BrutalCard>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container-brutal py-8">
        <div className="flex items-center justify-center h-64">
          <CatLoader message="Chargement de votre campus..." size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="container-brutal py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold">Gestion de votre Campus</h1>
            <p className="text-lg text-muted-foreground mt-2">
              Tableau de bord et gestion de votre équipe
            </p>
          </div>
        </div>

        {/* Statistiques Campus */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <BrutalCard>
            <BrutalCardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xl font-bold">{stats.totalTeachers}</p>
                  <p className="text-xs text-muted-foreground">Enseignants</p>
                </div>
                <GraduationCap className="h-6 w-6 text-brand-education" />
              </div>
            </BrutalCardContent>
          </BrutalCard>

          <BrutalCard>
            <BrutalCardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xl font-bold">{stats.activeTeachers}</p>
                  <p className="text-xs text-muted-foreground">Actifs</p>
                </div>
                <UserCheck className="h-6 w-6 text-brand-success" />
              </div>
            </BrutalCardContent>
          </BrutalCard>

          <BrutalCard>
            <BrutalCardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xl font-bold">{stats.newTeachers}</p>
                  <p className="text-xs text-muted-foreground">Nouveaux</p>
                </div>
                <UserPlus className="h-6 w-6 text-brand-aurlom" />
              </div>
            </BrutalCardContent>
          </BrutalCard>

          <BrutalCard>
            <BrutalCardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xl font-bold">{stats.totalClasses}</p>
                  <p className="text-xs text-muted-foreground">Classes</p>
                </div>
                <Building className="h-6 w-6 text-brand-aurlom" />
              </div>
            </BrutalCardContent>
          </BrutalCard>

          <BrutalCard>
            <BrutalCardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xl font-bold">{stats.pendingInvoices}</p>
                  <p className="text-xs text-muted-foreground">Factures</p>
                </div>
                <Clock className="h-6 w-6 text-brand-warning" />
              </div>
            </BrutalCardContent>
          </BrutalCard>

          <BrutalCard>
            <BrutalCardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold">{Math.round(stats.monthlyRevenue)}€</p>
                  <p className="text-xs text-muted-foreground">Ce mois</p>
                </div>
                <TrendingUp className="h-6 w-6 text-brand-success" />
              </div>
            </BrutalCardContent>
          </BrutalCard>
        </div>

        {/* Sélection de période */}
        <BrutalCard>
          <BrutalCardHeader>
            <BrutalCardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Période de consultation - {getMonthName(selectedMonth)} {selectedYear}
            </BrutalCardTitle>
          </BrutalCardHeader>
          <BrutalCardContent>
            <MonthYearSelector
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              onMonthChange={setSelectedMonth}
              onYearChange={setSelectedYear}
            />
          </BrutalCardContent>
        </BrutalCard>

        <Tabs defaultValue="team" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="team" className="flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Mon Équipe ({filteredUsers.length})
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Demandes & Gestion
            </TabsTrigger>
          </TabsList>

          <TabsContent value="team">
            <BrutalCard>
              <BrutalCardHeader>
                <div className="flex justify-between items-center">
                  <BrutalCardTitle>Équipe de votre Campus</BrutalCardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <BrutalInput
                      placeholder="Rechercher dans votre équipe..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </BrutalCardHeader>
              <BrutalCardContent>
                <div className="space-y-4">
                  {paginatedUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border-2 border-border-light rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-lg border-2 border-foreground flex items-center justify-center text-white font-bold ${
                          user.role === 'DIRECTEUR_CAMPUS' ? 'bg-brand-aurlom' : 'bg-brand-education'
                        }`}>
                          {user.first_name?.charAt(0)}{user.last_name?.charAt(0)}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-1">
                            <h3 className="font-medium text-base">
                              {user.first_name} {user.last_name}
                            </h3>
                            {getRoleBadge(user.role)}
                            <StatusBadge 
                              status={user.is_active ? 'active' : 'inactive'} 
                              size="sm"
                            />
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <div className="flex items-center">
                              <Mail className="h-3 w-3 mr-1" />
                              {user.email}
                            </div>
                            {user.phone && (
                              <div className="flex items-center">
                                <Phone className="h-3 w-3 mr-1" />
                                {user.phone}
                              </div>
                            )}
                            {user.hire_date && (
                              <div className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                Embauché le {new Date(user.hire_date).toLocaleDateString('fr-FR')}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {paginatedUsers.length === 0 && filteredUsers.length === 0 && (
                    <p className="text-muted-foreground text-center py-8">
                      {searchTerm ? 'Aucun membre trouvé avec ce critère' : 'Aucun membre dans votre équipe'}
                    </p>
                  )}
                </div>
                
                {/* Pagination */}
                {filteredUsers.length > 0 && (
                  <DataPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={goToPage}
                    totalItems={filteredUsers.length}
                    itemsPerPage={10}
                    itemName="membres"
                  />
                )}
              </BrutalCardContent>
            </BrutalCard>
          </TabsContent>

          <TabsContent value="requests">
            <DirectorCampusManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}