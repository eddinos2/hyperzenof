import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

interface ActivityLogData {
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, any>;
  success?: boolean;
  errorMessage?: string;
}

interface BrowserInfo {
  userAgent: string;
  language: string;
  platform: string;
  cookieEnabled: boolean;
  onLine: boolean;
  screen: {
    width: number;
    height: number;
    colorDepth: number;
  };
}

interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  touchSupport: boolean;
  vendor: string;
}

export function useActivityLogger() {
  const { user } = useAuth();

  const getBrowserInfo = useCallback((): BrowserInfo => {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth,
      }
    };
  }, []);

  const getDeviceInfo = useCallback((): DeviceInfo => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /mobile|android|iphone|ipad|phone/i.test(userAgent);
    const isTablet = /tablet|ipad/i.test(userAgent) && !isMobile;
    const isDesktop = !isMobile && !isTablet;
    
    return {
      isMobile,
      isTablet,
      isDesktop,
      touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      vendor: navigator.vendor || 'unknown'
    };
  }, []);

  const getIpAddress = useCallback(async (): Promise<string | null> => {
    try {
      // Utilise un service public pour obtenir l'IP
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.warn('Could not fetch IP address:', error);
      return null;
    }
  }, []);

  const logActivity = useCallback(async ({
    action,
    entityType,
    entityId,
    details = {},
    success = true,
    errorMessage
  }: ActivityLogData) => {
    if (!user) return null;

    try {
      const startTime = performance.now();
      const browserInfo = getBrowserInfo();
      const deviceInfo = getDeviceInfo();
      const ipAddress = await getIpAddress();
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      // Enrichir les détails avec des infos contextuelles
      const enrichedDetails = {
        ...details,
        page: window.location.pathname,
        timestamp: new Date().toISOString(),
        sessionStart: sessionStorage.getItem('session_start') || new Date().toISOString(),
      };

      const { data, error } = await supabase.rpc('log_user_activity', {
        action_param: action,
        entity_type_param: entityType || null,
        entity_id_param: entityId || null,
        details_param: enrichedDetails,
        ip_address_param: ipAddress,
        user_agent_param: navigator.userAgent,
        browser_info_param: browserInfo as any,
        device_info_param: deviceInfo as any,
        duration_ms_param: duration,
        success_param: success,
        error_message_param: errorMessage || null
      });

      if (error) {
        console.error('Failed to log activity:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Activity logging error:', error);
      return null;
    }
  }, [user, getBrowserInfo, getDeviceInfo, getIpAddress]);

  // Helpers pour actions courantes
  const logPageView = useCallback((page: string) => {
    return logActivity({
      action: 'page_view',
      details: { page, referrer: document.referrer }
    });
  }, [logActivity]);

  const logClick = useCallback((element: string, details?: Record<string, any>) => {
    return logActivity({
      action: 'click',
      details: { element, ...details }
    });
  }, [logActivity]);

  const logFormSubmit = useCallback((formName: string, success: boolean, errorMessage?: string) => {
    return logActivity({
      action: 'form_submit',
      details: { form: formName },
      success,
      errorMessage
    });
  }, [logActivity]);

  const logDataAccess = useCallback((entityType: string, entityId: string, operation: 'read' | 'write' | 'delete') => {
    return logActivity({
      action: `data_${operation}`,
      entityType,
      entityId,
      details: { operation }
    });
  }, [logActivity]);

  const logError = useCallback((errorType: string, message: string, details?: Record<string, any>) => {
    return logActivity({
      action: 'error',
      success: false,
      errorMessage: message,
      details: { errorType, ...details }
    });
  }, [logActivity]);

  return {
    logActivity,
    logPageView,
    logClick,
    logFormSubmit,
    logDataAccess,
    logError
  };
}