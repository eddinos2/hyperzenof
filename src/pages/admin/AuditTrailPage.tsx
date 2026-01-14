import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { BrutalCard, BrutalCardHeader, BrutalCardTitle, BrutalCardContent } from '@/components/ui/brutal-card';
import { BrutalButton } from '@/components/ui/brutal-button';
import { BrutalInput } from '@/components/ui/brutal-input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Shield, Search, Filter, Calendar, User, FileText, 
  Eye, Download, RefreshCw, AlertTriangle 
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

interface AuditEntry {
  id: string;
  user_id: string;
  entity: string;
  entity_id: string;
  action: string;
  payload: any;
  user_agent: string;
  ip_address: string;
  created_at: string;
  user_profile?: {
    first_name: string;
    last_name: string;
    email: string;
    role: string;
  };
}

const entityLabels: Record<string, string> = {
  invoice: 'Facture',
  payment: 'Paiement',
  campus: 'Campus',
  filiere: 'Filière',
  class: 'Classe',
  profiles: 'Profil',
  teacher_import: 'Import Enseignant'
};

const actionLabels: Record<string, string> = {
  CREATE: 'Création',
  UPDATE: 'Modification', 
  DELETE: 'Suppression',
  LOGIN: 'Connexion',
  LOGOUT: 'Déconnexion',
  VALIDATE: 'Validation',
  REJECT: 'Rejet',
  IMPORT: 'Import'
};

export default function AuditTrailPage() {
  const { profile } = useAuth();
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [dateRange, setDateRange] = useState({
    start: format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  useEffect(() => {
    if (profile?.role === 'SUPER_ADMIN') {
      fetchAuditEntries();
    }
  }, [profile, selectedEntity, selectedAction, dateRange]);

  const fetchAuditEntries = async () => {
    try {
      setLoading(true);
      
      // Récupérer les vraies entrées d'audit depuis la base de données
      const { data: auditData, error } = await supabase
        .from('audit_trail')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const formattedEntries: AuditEntry[] = auditData?.map(entry => ({
        id: entry.id,
        user_id: entry.user_id,
        entity: entry.entity,
        entity_id: entry.entity_id,
        action: entry.action,
        payload: entry.payload,
        ip_address: entry.ip_address as string || '',
        user_agent: entry.user_agent || '',
        created_at: entry.created_at,
        user: {
          first_name: 'Utilisateur',
          last_name: 'Système',
          role: 'SYSTEM'
        }
      })) || [];

      setAuditEntries(formattedEntries);

    } catch (error) {
      console.error('Erreur lors du chargement de l\'audit trail:', error);
      toast.error('Erreur lors du chargement des logs');
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = auditEntries.filter(entry => {
    const matchesSearch = 
      entry.user_profile?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.user_profile?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.user_profile?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.entity_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.action.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesEntity = selectedEntity === 'all' || entry.entity === selectedEntity;
    const matchesAction = selectedAction === 'all' || entry.action === selectedAction;
    
    const entryDate = new Date(entry.created_at).toISOString().split('T')[0];
    const matchesDateRange = entryDate >= dateRange.start && entryDate <= dateRange.end;

    return matchesSearch && matchesEntity && matchesAction && matchesDateRange;
  });

  const exportAuditLog = () => {
    try {
      let csv = 'Date,Utilisateur,Email,Rôle,Entité,Action,ID Entité,IP,Détails\n';
      
      filteredEntries.forEach(entry => {
        const details = JSON.stringify(entry.payload).replace(/"/g, '""');
        csv += `${format(new Date(entry.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })},`;
        csv += `${entry.user_profile?.first_name} ${entry.user_profile?.last_name},`;
        csv += `${entry.user_profile?.email},`;
        csv += `${entry.user_profile?.role},`;
        csv += `${entityLabels[entry.entity] || entry.entity},`;
        csv += `${actionLabels[entry.action] || entry.action},`;
        csv += `${entry.entity_id},`;
        csv += `${entry.ip_address},`;
        csv += `"${details}"\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `audit-trail-${format(new Date(), 'yyyy-MM-dd')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      toast.success('Logs d\'audit exportés avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      toast.error('Erreur lors de l\'export');
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-green-100 text-green-800';
      case 'UPDATE': return 'bg-brand-aurlom-light text-brand-aurlom';
      case 'DELETE': return 'bg-red-100 text-red-800';
      case 'VALIDATE': return 'bg-emerald-100 text-emerald-800';
      case 'REJECT': return 'bg-orange-100 text-orange-800';
      case 'LOGIN': return 'bg-purple-100 text-purple-800';
      case 'LOGOUT': return 'bg-gray-100 text-gray-800';
      case 'IMPORT': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskLevel = (entry: AuditEntry) => {
    if (entry.action === 'DELETE' || entry.action === 'REJECT') return 'high';
    if (entry.action === 'UPDATE' || entry.action === 'VALIDATE') return 'medium';
    return 'low';
  };

  if (profile?.role !== 'SUPER_ADMIN') {
    return (
      <div className="container-brutal py-8">
        <BrutalCard>
          <BrutalCardContent className="p-8 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold mb-4">Accès Réservé</h2>
            <p>Seuls les Super Administrateurs peuvent accéder à l'audit trail.</p>
          </BrutalCardContent>
        </BrutalCard>
      </div>
    );
  }

  return (
    <div className="container-brutal py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Audit Trail
        </h1>
        <p className="text-muted-foreground">
          Historique complet des actions et modifications système
        </p>
      </div>

      {/* Filters */}
      <BrutalCard className="mb-6">
        <BrutalCardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Recherche</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <BrutalInput
                  placeholder="Utilisateur, email, ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Entité</label>
              <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                <SelectTrigger>
                  <SelectValue placeholder="Toutes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les entités</SelectItem>
                  {Object.entries(entityLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Action</label>
              <Select value={selectedAction} onValueChange={setSelectedAction}>
                <SelectTrigger>
                  <SelectValue placeholder="Toutes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les actions</SelectItem>
                  {Object.entries(actionLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Période</label>
              <div className="flex gap-1">
                <BrutalInput
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="text-xs"
                />
                <BrutalInput
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="flex items-end gap-2">
              <BrutalButton 
                onClick={fetchAuditEntries}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="h-4 w-4" />
              </BrutalButton>
              
              <BrutalButton 
                onClick={exportAuditLog} 
                disabled={loading}
                size="sm"
              >
                <Download className="h-4 w-4" />
              </BrutalButton>
            </div>
          </div>
        </BrutalCardContent>
      </BrutalCard>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <BrutalCard>
          <BrutalCardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Events</p>
                <p className="text-2xl font-bold">{filteredEntries.length}</p>
              </div>
              <FileText className="h-8 w-8 text-brand-aurlom" />
            </div>
          </BrutalCardContent>
        </BrutalCard>

        <BrutalCard>
          <BrutalCardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Risque Élevé</p>
                <p className="text-2xl font-bold text-red-600">
                  {filteredEntries.filter(e => getRiskLevel(e) === 'high').length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </BrutalCardContent>
        </BrutalCard>

        <BrutalCard>
          <BrutalCardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Utilisateurs</p>
                <p className="text-2xl font-bold">
                  {new Set(filteredEntries.map(e => e.user_id)).size}
                </p>
              </div>
              <User className="h-8 w-8 text-green-600" />
            </div>
          </BrutalCardContent>
        </BrutalCard>

        <BrutalCard>
          <BrutalCardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aujourd'hui</p>
                <p className="text-2xl font-bold text-orange-600">
                  {filteredEntries.filter(e => 
                    new Date(e.created_at).toDateString() === new Date().toDateString()
                  ).length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-orange-600" />
            </div>
          </BrutalCardContent>
        </BrutalCard>
      </div>

      {/* Audit Entries */}
      <BrutalCard>
        <BrutalCardHeader>
          <BrutalCardTitle>Historique des Actions</BrutalCardTitle>
        </BrutalCardHeader>
        <BrutalCardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-aurlom mx-auto"></div>
              <p className="mt-2">Chargement des logs...</p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p>Aucune entrée d'audit trouvée</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEntries.map((entry) => (
                <div 
                  key={entry.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={getActionColor(entry.action)}>
                          {actionLabels[entry.action] || entry.action}
                        </Badge>
                        
                        <Badge variant="outline">
                          {entityLabels[entry.entity] || entry.entity}
                        </Badge>
                        
                        {getRiskLevel(entry) === 'high' && (
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Risque élevé
                          </Badge>
                        )}
                        
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(entry.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Utilisateur:</span>
                          <p className="text-muted-foreground">
                            {entry.user_profile?.first_name} {entry.user_profile?.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {entry.user_profile?.email}
                          </p>
                        </div>

                        <div>
                          <span className="font-medium">Rôle:</span>
                          <p className="text-muted-foreground">
                            {entry.user_profile?.role}
                          </p>
                        </div>

                        <div>
                          <span className="font-medium">ID Entité:</span>
                          <p className="text-muted-foreground font-mono">
                            {entry.entity_id}
                          </p>
                        </div>

                        <div>
                          <span className="font-medium">IP:</span>
                          <p className="text-muted-foreground font-mono">
                            {entry.ip_address}
                          </p>
                        </div>
                      </div>

                      {entry.payload && Object.keys(entry.payload).length > 0 && (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-sm font-medium">
                            Détails de l'action
                          </summary>
                          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                            {JSON.stringify(entry.payload, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </BrutalCardContent>
      </BrutalCard>
    </div>
  );
}