import React, { useEffect, useState } from 'react';
import { BrutalCard, BrutalCardContent, BrutalCardHeader, BrutalCardTitle } from '@/components/ui/brutal-card';
import { BrutalButton } from '@/components/ui/brutal-button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { cacheManager } from '@/utils/cacheManager';
import { supabase } from '@/integrations/supabase/client';
import { Activity, Database, Zap, HardDrive, Wifi, RefreshCw } from 'lucide-react';

interface SystemHealth {
  database: 'healthy' | 'degraded' | 'down';
  cache: 'healthy' | 'degraded' | 'down';
  performance: 'good' | 'slow' | 'poor';
  connectivity: 'online' | 'offline';
}

export function SystemHealthMonitor() {
  const { getMetrics, getSlowOperations } = usePerformanceMonitor('SystemHealth');
  const [health, setHealth] = useState<SystemHealth>({
    database: 'healthy',
    cache: 'healthy', 
    performance: 'good',
    connectivity: 'online'
  });
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkSystemHealth = async () => {
    setIsChecking(true);
    
    try {
      // Test database connectivity
      const dbStart = performance.now();
      const { error: dbError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      const dbTime = performance.now() - dbStart;
      
      // Check cache health
      const cacheStats = cacheManager.getStats();
      
      // Check performance metrics
      const slowOps = getSlowOperations(500); // Operations > 500ms
      
      // Check connectivity
      const isOnline = navigator.onLine;
      
      setHealth({
        database: dbError ? 'down' : dbTime > 2000 ? 'degraded' : 'healthy',
        cache: cacheStats.hitRatio < 0.3 ? 'degraded' : 'healthy',
        performance: slowOps.length > 5 ? 'poor' : slowOps.length > 2 ? 'slow' : 'good',
        connectivity: isOnline ? 'online' : 'offline'
      });
      
      setLastCheck(new Date());
    } catch (error) {
      console.error('Health check failed:', error);
      setHealth(prev => ({ ...prev, database: 'down' }));
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkSystemHealth();
    const interval = setInterval(checkSystemHealth, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'good':
      case 'online':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'degraded':
      case 'slow':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'down':
      case 'poor':
      case 'offline':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getOverallHealth = () => {
    const statuses = Object.values(health);
    if (statuses.includes('down') || statuses.includes('poor') || statuses.includes('offline')) {
      return 'critical';
    }
    if (statuses.includes('degraded') || statuses.includes('slow')) {
      return 'warning';
    }
    return 'healthy';
  };

  const cacheStats = cacheManager.getStats();
  const metrics = getMetrics();
  const slowOps = getSlowOperations();

  return (
    <BrutalCard>
      <BrutalCardHeader>
        <div className="flex items-center justify-between">
          <BrutalCardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            État du Système
          </BrutalCardTitle>
          <div className="flex items-center space-x-2">
            <Badge className={getStatusColor(getOverallHealth())}>
              {getOverallHealth() === 'healthy' ? 'Système OK' : 
               getOverallHealth() === 'warning' ? 'Attention' : 'Critique'}
            </Badge>
            <BrutalButton
              variant="outline"
              size="sm"
              onClick={checkSystemHealth}
              disabled={isChecking}
            >
              <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
            </BrutalButton>
          </div>
        </div>
      </BrutalCardHeader>
      
      <BrutalCardContent className="space-y-6">
        {/* System Status Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <Database className="h-8 w-8 mx-auto mb-2 text-blue-500" />
            <p className="text-sm font-medium mb-1">Base de données</p>
            <Badge className={getStatusColor(health.database)}>
              {health.database === 'healthy' ? 'OK' : 
               health.database === 'degraded' ? 'Lent' : 'Hors ligne'}
            </Badge>
          </div>
          
          <div className="text-center">
            <HardDrive className="h-8 w-8 mx-auto mb-2 text-purple-500" />
            <p className="text-sm font-medium mb-1">Cache</p>
            <Badge className={getStatusColor(health.cache)}>
              {health.cache === 'healthy' ? 'OK' : 'Problème'}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round(cacheStats.hitRatio * 100)}% hits
            </p>
          </div>
          
          <div className="text-center">
            <Zap className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
            <p className="text-sm font-medium mb-1">Performance</p>
            <Badge className={getStatusColor(health.performance)}>
              {health.performance === 'good' ? 'Rapide' : 
               health.performance === 'slow' ? 'Lent' : 'Très lent'}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              {slowOps.length} ops lentes
            </p>
          </div>
          
          <div className="text-center">
            <Wifi className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="text-sm font-medium mb-1">Connectivité</p>
            <Badge className={getStatusColor(health.connectivity)}>
              {health.connectivity === 'online' ? 'En ligne' : 'Hors ligne'}
            </Badge>
          </div>
        </div>

        {/* Cache Statistics */}
        <div>
          <h4 className="text-sm font-medium mb-2">Cache Statistics</h4>
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-sm">
                <span>Taux de réussite</span>
                <span>{Math.round(cacheStats.hitRatio * 100)}%</span>
              </div>
              <Progress value={cacheStats.hitRatio * 100} className="h-2" />
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total:</span>
                <span className="ml-1 font-medium">{cacheStats.total}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Valides:</span>
                <span className="ml-1 font-medium">{cacheStats.valid}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Expirés:</span>
                <span className="ml-1 font-medium">{cacheStats.expired}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Issues */}
        {slowOps.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Opérations Lentes Récentes</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {slowOps.slice(0, 5).map((op, index) => (
                <div key={index} className="flex justify-between text-xs">
                  <span className="truncate">{op.name}</span>
                  <span className="text-orange-600 font-medium">
                    {Math.round(op.duration)}ms
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Last Check */}
        {lastCheck && (
          <div className="text-xs text-muted-foreground text-center">
            Dernière vérification: {lastCheck.toLocaleTimeString('fr-FR')}
          </div>
        )}
      </BrutalCardContent>
    </BrutalCard>
  );
}