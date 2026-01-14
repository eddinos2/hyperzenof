import React, { useState, useEffect, useCallback } from 'react';
import { BrutalCard, BrutalCardContent, BrutalCardHeader, BrutalCardTitle } from '@/components/ui/brutal-card';
import { BrutalButton } from '@/components/ui/brutal-button';
import { Badge } from '@/components/ui/badge';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { supabase } from '@/integrations/supabase/client';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { Activity, Database, Zap, HardDrive, Wifi, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';

interface SystemHealth {
  database: 'healthy' | 'degraded' | 'down';
  cache: 'healthy' | 'degraded' | 'down';
  performance: 'good' | 'slow' | 'poor';
  connectivity: 'online' | 'offline';
  auth: 'operational' | 'issues' | 'down';
  storage: 'operational' | 'issues' | 'down';
}

interface SystemStats {
  totalUsers: number;
  activeInvoices: number;
  totalInvoices: number;
  averageResponseTime: number;
  errorRate: number;
  dbConnections: number;
}

export function SystemHealthMonitorFixed() {
  const { getMetrics, getSlowOperations } = usePerformanceMonitor('SystemHealth');
  const { logActivity } = useActivityLogger();
  
  const [health, setHealth] = useState<SystemHealth>({
    database: 'healthy',
    cache: 'healthy',
    performance: 'good',
    connectivity: 'online',
    auth: 'operational',
    storage: 'operational'
  });
  
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    activeInvoices: 0,
    totalInvoices: 0,
    averageResponseTime: 0,
    errorRate: 0,
    dbConnections: 0
  });
  
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  const checkDatabaseHealth = useCallback(async () => {
    const startTime = performance.now();
    try {
      // Test simple query
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      
      const responseTime = performance.now() - startTime;
      
      if (error) {
        return { status: 'down', responseTime };
      }
      
      if (responseTime > 1000) {
        return { status: 'degraded', responseTime };
      }
      
      return { status: 'healthy', responseTime };
    } catch (error) {
      return { status: 'down', responseTime: performance.now() - startTime };
    }
  }, []);

  const checkAuthHealth = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user ? 'operational' : 'issues';
    } catch (error) {
      return 'down';
    }
  }, []);

  const fetchSystemStats = useCallback(async () => {
    try {
      // Get basic stats
      const [usersResult, invoicesResult, activeInvoicesResult] = await Promise.allSettled([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('invoice').select('id', { count: 'exact', head: true }),
        supabase.from('invoice').select('id', { count: 'exact', head: true }).in('status', ['pending', 'prevalidated'])
      ]);

      const totalUsers = usersResult.status === 'fulfilled' ? usersResult.value.count || 0 : 0;
      const totalInvoices = invoicesResult.status === 'fulfilled' ? invoicesResult.value.count || 0 : 0;
      const activeInvoices = activeInvoicesResult.status === 'fulfilled' ? activeInvoicesResult.value.count || 0 : 0;

      // Get performance metrics
      const metrics = getMetrics();
      const slowOps = getSlowOperations();

      return {
        totalUsers,
        activeInvoices,
        totalInvoices,
        averageResponseTime: metrics.length > 0 ? metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length : 0,
        errorRate: slowOps.length > 0 ? (slowOps.length / Math.max(metrics.length, 1)) * 100 : 0,
        dbConnections: 1 // Simplified for demo
      };
    } catch (error) {
      console.error('Error fetching system stats:', error);
      return stats; // Return current stats on error
    }
  }, [getMetrics, getSlowOperations, stats]);

  const fetchRecentLogs = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('user_activity_log')
        .select('action, timestamp, success, error_message, user_id')
        .order('timestamp', { ascending: false })
        .limit(10);
      
      setRecentLogs(data || []);
    } catch (error) {
      console.warn('Cannot fetch recent logs:', error);
      setRecentLogs([]);
    }
  }, []);

  const performHealthCheck = useCallback(async () => {
    setIsChecking(true);
    
    try {
      await logActivity({
        action: 'system_health_check',
        details: { manual: true }
      });

      const [dbHealth, authHealth, systemStats] = await Promise.all([
        checkDatabaseHealth(),
        checkAuthHealth(),
        fetchSystemStats(),
        fetchRecentLogs()
      ]);

      // Update health status
      setHealth(prev => ({
        ...prev,
        database: dbHealth.status as any,
        auth: authHealth as any,
        connectivity: navigator.onLine ? 'online' : 'offline',
        performance: dbHealth.responseTime > 1000 ? 'slow' : dbHealth.responseTime > 2000 ? 'poor' : 'good'
      }));

      setStats(systemStats);
      setLastCheck(new Date());

    } catch (error) {
      console.error('Health check failed:', error);
      await logActivity({
        action: 'system_health_check_failed',
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsChecking(false);
    }
  }, [checkDatabaseHealth, checkAuthHealth, fetchSystemStats, fetchRecentLogs, logActivity]);

  // Auto-check every 5 minutes
  useEffect(() => {
    const interval = setInterval(performHealthCheck, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [performHealthCheck]);

  // Initial check
  useEffect(() => {
    performHealthCheck();
  }, []);

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'operational':
      case 'good':
      case 'online':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'degraded':
      case 'issues':
      case 'slow':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'operational':
      case 'good':
      case 'online':
        return 'bg-green-100 text-green-800 border-green-600';
      case 'degraded':
      case 'issues':
      case 'slow':
        return 'bg-yellow-100 text-yellow-800 border-yellow-600';
      default:
        return 'bg-red-100 text-red-800 border-red-600';
    }
  };

  return (
    <BrutalCard className="w-full max-w-md">
      <BrutalCardHeader>
        <BrutalCardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            État du Système
          </span>
          <BrutalButton
            variant="outline"
            size="sm"
            onClick={performHealthCheck}
            disabled={isChecking}
          >
            <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
          </BrutalButton>
        </BrutalCardTitle>
      </BrutalCardHeader>
      <BrutalCardContent className="space-y-4">
        {/* Health Status Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center justify-between p-2 border rounded">
            <div className="flex items-center">
              <Database className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-sm">Base de données</span>
            </div>
            <Badge className={getHealthColor(health.database)}>
              {getHealthIcon(health.database)}
            </Badge>
          </div>

          <div className="flex items-center justify-between p-2 border rounded">
            <div className="flex items-center">
              <Zap className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-sm">Performance</span>
            </div>
            <Badge className={getHealthColor(health.performance)}>
              {getHealthIcon(health.performance)}
            </Badge>
          </div>

          <div className="flex items-center justify-between p-2 border rounded">
            <div className="flex items-center">
              <Wifi className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-sm">Connectivité</span>
            </div>
            <Badge className={getHealthColor(health.connectivity)}>
              {getHealthIcon(health.connectivity)}
            </Badge>
          </div>

          <div className="flex items-center justify-between p-2 border rounded">
            <div className="flex items-center">
              <HardDrive className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-sm">Auth</span>
            </div>
            <Badge className={getHealthColor(health.auth)}>
              {getHealthIcon(health.auth)}
            </Badge>
          </div>
        </div>

        {/* System Stats */}
        <div className="border-t pt-3">
          <h4 className="text-sm font-medium mb-2">Statistiques Système</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Utilisateurs:</span>
              <span className="ml-1 font-medium">{stats.totalUsers}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Factures actives:</span>
              <span className="ml-1 font-medium">{stats.activeInvoices}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Temps réponse:</span>
              <span className="ml-1 font-medium">{Math.round(stats.averageResponseTime)}ms</span>
            </div>
            <div>
              <span className="text-muted-foreground">Taux d'erreur:</span>
              <span className="ml-1 font-medium">{stats.errorRate.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Last Check */}
        {lastCheck && (
          <div className="text-xs text-muted-foreground border-t pt-2">
            Dernière vérification: {lastCheck.toLocaleTimeString('fr-FR')}
          </div>
        )}

        {/* Recent Errors */}
        {recentLogs.some(log => !log.success) && (
          <div className="border-t pt-3">
            <h4 className="text-sm font-medium mb-2 text-red-600">Erreurs Récentes</h4>
            <div className="space-y-1 max-h-20 overflow-y-auto">
              {recentLogs.filter(log => !log.success).slice(0, 3).map((log, index) => (
                <div key={index} className="text-xs text-red-600 bg-red-50 p-1 rounded">
                  {log.action}: {log.error_message}
                </div>
              ))}
            </div>
          </div>
        )}
      </BrutalCardContent>
    </BrutalCard>
  );
}